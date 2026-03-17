/**
 * 인증 미들웨어 테스트
 * - 미로그인 시 페이지 접근 -> /login 리다이렉트
 * - 미로그인 시 API 접근 -> 401
 * - 로그인 페이지는 미로그인 허용
 * - 로그인 후 /login 접근 -> 메인 리다이렉트
 * - /api/auth/* 는 인증 없이 허용
 */

import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

const BASE = 'http://localhost:3500';

function createRequest(path: string, options?: { cookie?: string }): NextRequest {
  const url = `${BASE}${path}`;
  const headers = new Headers();
  if (options?.cookie) headers.set('Cookie', options.cookie);
  return new NextRequest(url, { headers });
}

describe('auth middleware', () => {
  it('redirects to /login when accessing page without token', () => {
    const req = createRequest('/');
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toMatch(/\/login\?redirect=%2F/);
  });

  it('redirects to /login with redirect param when accessing protected path', () => {
    const req = createRequest('/factories');
    const res = middleware(req);
    expect(res.status).toBe(307);
    const loc = res.headers.get('Location') || '';
    expect(loc).toContain('/login');
    expect(loc).toContain('redirect=%2Ffactories');
  });

  it('returns 401 for API without token', () => {
    const req = createRequest('/api/factories');
    const res = middleware(req);
    expect(res.status).toBe(401);
  });

  it('allows /api/auth/login without token', () => {
    const req = createRequest('/api/auth/login');
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('allows /login without token', () => {
    const req = createRequest('/login');
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('redirects to / when accessing /login with token', () => {
    const req = createRequest('/login', { cookie: 'auth_token=abc' });
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toMatch(new RegExp(`^${BASE}/?$`));
  });

  it('allows page access with token', () => {
    const req = createRequest('/factories', { cookie: 'auth_token=abc' });
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('allows API access with token', () => {
    const req = createRequest('/api/factories', { cookie: 'auth_token=abc' });
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('allows _next static chunk requests to pass (no redirect)', () => {
    const req = createRequest('/_next/static/chunks/main-app.js');
    const res = middleware(req);
    expect(res.status).toBe(200);
  });
});
