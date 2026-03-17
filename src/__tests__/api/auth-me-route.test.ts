/**
 * GET /api/auth/me 테스트
 * - auth_token 없으면 user: null
 * - IG_MEMBER /api/me 등 404 시 auth_user 쿠키가 있으면 해당 사용자 반환
 * - auth_user 없고 IG_MEMBER 404면 user: null
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/auth/me/route';

const mockFetch = jest.fn();
const origFetch = globalThis.fetch;
beforeAll(() => {
  (globalThis as unknown as { fetch: typeof fetch }).fetch = mockFetch;
});
afterAll(() => {
  (globalThis as unknown as { fetch: typeof fetch }).fetch = origFetch;
});

function createRequest(cookies: string): NextRequest {
  const req = new NextRequest('http://localhost:3500/api/auth/me', {
    headers: { Cookie: cookies },
  });
  return req;
}

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns user null when no auth_token cookie', async () => {
    const req = createRequest('');
    const res = await GET(req);
    const data = await res.json();
    expect(data.user).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns user from auth_user cookie when IG_MEMBER returns 404', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    const authUser = JSON.stringify({ name: 'TestUser', email: 'u@example.com' });
    const req = createRequest(`auth_token=abc; auth_user=${authUser}`);
    const res = await GET(req);
    const data = await res.json();
    expect(data.user).toEqual({ name: 'TestUser', email: 'u@example.com' });
  });

  it('returns user null when IG_MEMBER 404 and no auth_user cookie', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    const req = createRequest('auth_token=abc');
    const res = await GET(req);
    const data = await res.json();
    expect(data.user).toBeNull();
  });

  it('returns user from IG_MEMBER when /api/users/me returns 200', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ name: 'API유저', email: 'api@example.com' }),
    });
    const req = createRequest('auth_token=abc');
    const res = await GET(req);
    const data = await res.json();
    expect(data.user).toMatchObject({ name: 'API유저', email: 'api@example.com' });
  });

  it('normalizes ig-member response format { data: { name, email } }', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { name: '데이터유저', email: 'data@example.com' } }),
    });
    const req = createRequest('auth_token=abc');
    const res = await GET(req);
    const data = await res.json();
    expect(data.user).toMatchObject({ name: '데이터유저', email: 'data@example.com' });
  });
});
