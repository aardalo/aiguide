import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from '@/app/login/safeRedirectPath';

describe('safeRedirectPath', () => {
  it('returns the fallback when target is undefined', () => {
    expect(safeRedirectPath(undefined, '/map')).toBe('/map');
  });

  it('keeps a plain relative path', () => {
    expect(safeRedirectPath('/map', '/home')).toBe('/map');
  });

  it('preserves query string and hash on a relative path', () => {
    expect(safeRedirectPath('/map?day=2#trip', '/home')).toBe('/map?day=2#trip');
  });

  it('strips a server-supplied origin, keeping only the path (the localhost bug)', () => {
    // Auth.js returns an absolute URL whose origin is the server bind address
    // (localhost in dev). We must keep only the path so the browser stays on
    // whatever host the user actually used.
    expect(safeRedirectPath('http://localhost:3000/map', '/home')).toBe('/map');
  });

  it('does not let an external absolute URL redirect off-site (open-redirect guard)', () => {
    expect(safeRedirectPath('https://evil.example.com/phish', '/home')).toBe('/phish');
  });

  it('does not let a protocol-relative URL redirect off-site', () => {
    expect(safeRedirectPath('//evil.example.com/phish', '/home')).toBe('/phish');
  });

  it('falls back for non-path schemes like javascript:', () => {
    expect(safeRedirectPath('javascript:alert(1)', '/map')).toBe('/map');
  });

  it('reduces odd-but-parseable input to a same-origin path', () => {
    // Never returns an off-origin target; worst case is a harmless local path.
    expect(safeRedirectPath('::::', '/map')).toBe('/::::');
  });
});
