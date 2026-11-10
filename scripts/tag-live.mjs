// Card TAG1: tag every version that went live as `v<version>`, from the `tag` job in .github/workflows/test.yml.
// - This run's version (the deploy job just put it live) is tagged at this run's commit.
// - Catch-up: a version on main that reached live in an earlier run (a successful `deploy` job for one of its commits)
//   but has no tag yet is tagged at the first such commit.
// - The job's token has `contents: write` and no `workflows` permission (on purpose). GitHub refuses that token a tag on
//   a commit whose .github/workflows differ from main's head ("refusing to allow a GitHub App to create or update
//   workflow …"), so such a tag is not attempted: it gets a `::warning::` with the owner's steps instead. A refused push
//   is a warning too. The run stays green either way: a missing tag never hides a good deploy.
// - TAG2: with the repository secret TAG_TOKEN (a fine-grained token for this repository only: Contents read and write +
//   Workflows read and write), every untagged live version is pushed with that token, those commits included, so no
//   release ever needs a hand step and the catch-up back-fills the ones missed before. Without it: as above.
// Usage in CI: node scripts/tag-live.mjs (needs GITHUB_SHA, GITHUB_REPOSITORY, GITHUB_TOKEN; actions: read).
import { execFileSync } from 'node:child_process';

const VERSION_FILE = 'apps/extension/package.json';
/** How far back on main the catch-up looks (first-parent commits). */
export const LOOKBACK = 80;
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
 * .github/workflows equal main head's; `canTagWorkflows` = a token with the Workflows permission is there (TAG_TOKEN), so
 * those commits can be tagged too. Returns [{ version, sha, action: 'push' | 'owner' }], one per untagged live version.
 */
export async function planTags({ commits, tagged, isLive, sameWorkflows, since = FIRST_TAGGED, canTagWorkflows = false }) {
  const plan = [];
  const done = new Set(tagged);
  for (const { sha, version } of commits) {
    if (!version || done.has(version) || !versionAtLeast(version, since)) continue;
    if (!(await isLive(sha))) continue;
    done.add(version);
    plan.push({ version, sha, action: canTagWorkflows || (await sameWorkflows(sha)) ? 'push' : 'owner' });
  }
  return plan;
}

/** The owner's steps to make a tag the workflow token may not make (GitHub's web page uses the owner's own rights). */
/**
 * Did this run put its commit live? Its `deploy` job succeeded and so did every shard of the live e2e (card QA1 part
 * 1b: `live-e2e (1)`, `live-e2e (2)` …; runs from before the split have none, and their e2e lived inside `deploy`).
 */
export function wentLive(jobs) {
  const shards = jobs.filter((j) => /^live-e2e\b/.test(j.name));
  return jobs.some((j) => j.name === 'deploy' && j.conclusion === 'success') && shards.every((j) => j.conclusion === 'success');
}

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
  const { GITHUB_SHA: self, GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token, GITHUB_API_URL: api = 'https://api.github.com', TAG_TOKEN: tagToken } =
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
    if (sha === self) return true; // this very run deployed and its live e2e passed (the tag job's condition)
    try {
      const { workflow_runs: runs = [] } = await getJson(`/actions/workflows/test.yml/runs?head_sha=${sha}&event=push&per_page=10`);
      for (const run of runs) {
        const { jobs = [] } = await getJson(`/actions/runs/${run.id}/jobs?per_page=30`);
        if (wentLive(jobs)) return true;
      }
    } catch (e) {
      console.log(`::warning::Could not read the runs of ${sha.slice(0, 7)} (${e.message}); not tagging it now.`);
    }
    return false;
  };
  const sameWorkflows = async (sha) => {
    try { git('diff', '--quiet', sha, 'origin/main', '--', '.github/workflows'); return true; } catch { return false; }
  };

  const plan = await planTags({ commits, tagged, isLive, sameWorkflows, canTagWorkflows: !!tagToken });
  // TAG2: pushes go with TAG_TOKEN when it is set (the checkout's own credentials are switched off for that push).
  const push = (ref) =>
    tagToken
      ? git('-c', 'http.https://github.com/.extraheader=', 'push', `https://x-access-token:${tagToken}@github.com/${repo}.git`, ref)
      : git('push', 'origin', ref);
  if (!plan.length) console.log(`Nothing to tag: every live version in the last ${LOOKBACK} commits has its tag.`);
  for (const { version, sha, action } of plan) {
    if (action === 'owner') { console.log(`::warning::${ownerSteps(repo, version, sha)}`); continue; }
    try {
      git('tag', `v${version}`, sha);
      push(`refs/tags/v${version}`);
      console.log(`Tagged v${version} at ${sha}.`);
    } catch (e) {
      const why = String(e.message).split('\n')[0].replaceAll(tagToken || '\u0000', '***');
      console.log(`::warning::Pushing v${version} was refused (${why}). ${ownerSteps(repo, version, sha)}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Never red: a tag problem must not hide a good deploy (the warnings say what is missing).
  await main().catch((e) => console.log(`::warning::Tagging stopped: ${e.message}`));
}
