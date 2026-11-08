// Card TAG1: tag every version that went live as `v<version>`, from the `tag` job in .github/workflows/test.yml.
// - This run's version (the deploy job just put it live) is tagged at this run's commit.
// - Catch-up: a version on main that reached live in an earlier run (a successful `deploy` job for one of its commits)
//   but has no tag yet is tagged at the first such commit.
// - The job's token has `contents: write` and no `workflows` permission (on purpose). GitHub refuses that token a tag on
//   a commit whose .github/workflows differ from main's head ("refusing to allow a GitHub App to create or update
//   workflow …"), so such a tag is not attempted: it gets a `::warning::` with the owner's steps instead. A refused push
//   is a warning too. The run stays green either way: a missing tag never hides a good deploy.
// Usage in CI: node scripts/tag-live.mjs (needs GITHUB_SHA, GITHUB_REPOSITORY, GITHUB_TOKEN; actions: read).
import { execFileSync } from 'node:child_process';

const VERSION_FILE = 'apps/extension/package.json';
/** How far back on main the catch-up looks (first-parent commits). */
export const LOOKBACK = 40;
/** Tags start here (CHANGELOG.md: "from 0.9.97.70 on"); older versions are never tagged. */
export const FIRST_TAGGED = '0.9.97.70';

/** Compares dotted version numbers part by part (0.9.97.70 < 0.9.97.100). */
export function versionAtLeast(version, floor) {
  const a = version.split('.').map(Number), b = floor.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d > 0;
  }
  return true;
}

/**
 * Which tags to make. `commits` = main's first-parent commits, oldest first, each { sha, version }; `tagged` = versions
 * that already have a tag; `isLive(sha)` = a deploy of that commit succeeded; `sameWorkflows(sha)` = its
 * .github/workflows equal main head's. Returns [{ version, sha, action: 'push' | 'owner' }], one per untagged live version.
 */
export async function planTags({ commits, tagged, isLive, sameWorkflows, since = FIRST_TAGGED }) {
  const plan = [];
  const done = new Set(tagged);
  for (const { sha, version } of commits) {
    if (!version || done.has(version) || !versionAtLeast(version, since)) continue;
    if (!(await isLive(sha))) continue;
    done.add(version);
    plan.push({ version, sha, action: (await sameWorkflows(sha)) ? 'push' : 'owner' });
  }
  return plan;
}

/** The owner's steps to make a tag the workflow token may not make (GitHub's web page uses the owner's own rights). */
export function ownerSteps(repo, version, sha) {
  return `v${version} reached live at ${sha.slice(0, 7)} but can't be tagged by the workflow (main's workflow files changed since). ` +
    `Owner: https://github.com/${repo}/releases/new → "Choose a tag": type v${version} → "Create new tag on publish" → ` +
    `Target: the commit ${sha.slice(0, 7)} (Recent commits) → title v${version} → Publish release.`;
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const versionAt = (sha) => {
  try { return JSON.parse(git('show', `${sha}:${VERSION_FILE}`)).version ?? null; } catch { return null; }
};

async function main() {
  const { GITHUB_SHA: self, GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token, GITHUB_API_URL: api = 'https://api.github.com' } =
    process.env;
  if (!self || !repo) throw new Error('GITHUB_SHA and GITHUB_REPOSITORY are needed');
  git('fetch', '--quiet', '--tags', 'origin', '+refs/heads/main:refs/remotes/origin/main');
  const tagged = new Set(git('tag', '--list', 'v*').split('\n').filter(Boolean).map((t) => t.slice(1)));
  const shas = git('rev-list', '--first-parent', `--max-count=${LOOKBACK}`, self).split('\n').filter(Boolean).reverse();
  const commits = shas.map((sha) => ({ sha, version: versionAt(sha) }));

  const headers = { accept: 'application/vnd.github+json', authorization: `Bearer ${token}` };
  const getJson = async (path) => {
    const res = await fetch(`${api}/repos/${repo}${path}`, { headers });
    if (!res.ok) throw new Error(`${path} answered ${res.status}`);
    return res.json();
  };
  const isLive = async (sha) => {
    if (sha === self) return true; // the deploy job of this very run succeeded (the tag job's condition)
    try {
      const { workflow_runs: runs = [] } = await getJson(`/actions/workflows/test.yml/runs?head_sha=${sha}&event=push&per_page=10`);
      for (const run of runs) {
        const { jobs = [] } = await getJson(`/actions/runs/${run.id}/jobs?per_page=30`);
        if (jobs.some((j) => j.name === 'deploy' && j.conclusion === 'success')) return true;
      }
    } catch (e) {
      console.log(`::warning::Could not read the runs of ${sha.slice(0, 7)} (${e.message}); not tagging it now.`);
    }
    return false;
  };
  const sameWorkflows = async (sha) => {
    try { git('diff', '--quiet', sha, 'origin/main', '--', '.github/workflows'); return true; } catch { return false; }
  };

  const plan = await planTags({ commits, tagged, isLive, sameWorkflows });
  if (!plan.length) console.log(`Nothing to tag: every live version in the last ${LOOKBACK} commits has its tag.`);
  for (const { version, sha, action } of plan) {
    if (action === 'owner') { console.log(`::warning::${ownerSteps(repo, version, sha)}`); continue; }
    try {
      git('tag', `v${version}`, sha);
      git('push', 'origin', `refs/tags/v${version}`);
      console.log(`Tagged v${version} at ${sha}.`);
    } catch (e) {
      console.log(`::warning::Pushing v${version} was refused (${String(e.message).split('\n')[0]}). ${ownerSteps(repo, version, sha)}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Never red: a tag problem must not hide a good deploy (the warnings say what is missing).
  await main().catch((e) => console.log(`::warning::Tagging stopped: ${e.message}`));
}
