import { describe, expect, it } from 'vitest';
import { frameVerdict, isForwardedKey, isRelayable } from './embed.ts';

const SITE = 'https://screen-with-me.swm-server.workers.dev';
const PAGE = 'https://film.example/watch/1';

function headers(map: Record<string, string>) {
  return { get: (name: string) => map[name.toLowerCase()] ?? null };
}

describe('frameVerdict', () => {
  it('allows pages without framing headers', () => {
    expect(frameVerdict(headers({}), PAGE, SITE)).toBe('ok');
  });

  it('blocks X-Frame-Options DENY and SAMEORIGIN', () => {
    expect(frameVerdict(headers({ 'x-frame-options': 'DENY' }), PAGE, SITE)).toBe('xfo');
    expect(frameVerdict(headers({ 'x-frame-options': 'sameorigin' }), PAGE, SITE)).toBe('xfo');
    // ALLOW-FROM eskidi, tarayıcı yok sayar.
    expect(frameVerdict(headers({ 'x-frame-options': 'ALLOW-FROM https://x.example' }), PAGE, SITE)).toBe('ok');
  });

  it("checks CSP frame-ancestors (and then ignores X-Frame-Options like the browser)", () => {
    expect(frameVerdict(headers({ 'content-security-policy': "frame-ancestors 'none'" }), PAGE, SITE)).toBe('csp');
    expect(frameVerdict(headers({ 'content-security-policy': "default-src 'self'; frame-ancestors 'self'" }), PAGE, SITE)).toBe('csp');
    expect(frameVerdict(headers({ 'content-security-policy': 'frame-ancestors *' }), PAGE, SITE)).toBe('ok');
    expect(frameVerdict(headers({ 'content-security-policy': 'frame-ancestors https:', 'x-frame-options': 'DENY' }), PAGE, SITE)).toBe('ok');
    expect(frameVerdict(headers({ 'content-security-policy': 'frame-ancestors *.workers.dev' }), PAGE, SITE)).toBe('ok');
    expect(frameVerdict(headers({ 'content-security-policy': 'frame-ancestors https://other.example' }), PAGE, SITE)).toBe('csp');
    expect(frameVerdict(headers({ 'content-security-policy': `frame-ancestors ${SITE}` }), PAGE, SITE)).toBe('ok');
    // CSP'de frame-ancestors yoksa X-Frame-Options geçerli.
    expect(frameVerdict(headers({ 'content-security-policy': "script-src 'self'", 'x-frame-options': 'DENY' }), PAGE, SITE)).toBe('xfo');
  });

  it('applies every policy when several CSP headers are joined', () => {
    expect(frameVerdict(headers({ 'content-security-policy': "frame-ancestors *, frame-ancestors 'none'" }), PAGE, SITE)).toBe('csp');
  });

  it('matches ports for the local dev site', () => {
    const dev = 'http://localhost:5173';
    const page = 'http://localhost:5299/film';
    expect(frameVerdict(headers({ 'content-security-policy': 'frame-ancestors http://localhost:5173' }), page, dev)).toBe('ok');
    expect(frameVerdict(headers({ 'content-security-policy': 'frame-ancestors http://localhost' }), page, dev)).toBe('csp');
    expect(frameVerdict(headers({ 'content-security-policy': 'frame-ancestors localhost:*' }), page, dev)).toBe('ok');
  });

  it('refuses http pages inside the https site (mixed content)', () => {
    expect(frameVerdict(headers({}), 'http://film.example/', SITE)).toBe('insecure');
  });
});

describe('embed relay rules', () => {
  it('only lets playback messages through from the frame', () => {
    expect(isRelayable({ t: 'pause', position: 1, at: 2 })).toBe(true);
    expect(isRelayable({ t: 'ready', ready: false })).toBe(true);
    expect(isRelayable({ t: 'chat', text: 'hi' })).toBe(false);
    expect(isRelayable({ t: 'kick', id: 'x' })).toBe(false);
    expect(isRelayable({ t: 'load', media: { kind: 'page', url: 'https://a.example' } })).toBe(false);
  });

  it('forwards only our shortcut keys', () => {
    expect(['1', '8', 'Enter', 'p', 'P'].every(isForwardedKey)).toBe(true);
    expect(['9', ' ', 'k', 'f', 'ArrowLeft'].some(isForwardedKey)).toBe(false);
  });
});
