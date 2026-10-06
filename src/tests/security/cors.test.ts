import { describe, expect, it } from 'vitest';
import { isAllowedOrigin } from '../../../server/cors';

describe('credentialed CORS origin policy', () => {
  it('allows only the known production application origins', () => {
    expect(isAllowedOrigin('https://www.intrax.in', true)).toBe(true);
    expect(isAllowedOrigin('https://gamehubnepal.vercel.app', true)).toBe(true);
    expect(isAllowedOrigin('https://attacker.vercel.app', true)).toBe(false);
  });

  it('allows plain HTTP loopback origins only in local development', () => {
    expect(isAllowedOrigin('http://localhost:5173', false)).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:3000', false)).toBe(true);
    expect(isAllowedOrigin('http://localhost:5173', true)).toBe(false);
    expect(isAllowedOrigin('http://localhost.attacker.test', false)).toBe(false);
  });

  it('rejects malformed and absent origins', () => {
    expect(isAllowedOrigin(undefined, false)).toBe(false);
    expect(isAllowedOrigin('not-an-origin', false)).toBe(false);
  });
});
