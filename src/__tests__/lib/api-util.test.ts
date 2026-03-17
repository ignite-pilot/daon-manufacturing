/**
 * API 유틸 (getPagination, getUpdatedBy) 테스트
 */

import { getPagination, getUpdatedBy } from '@/lib/api-util';

function createMockRequest(url: string, headers?: Record<string, string>) {
  const fullUrl = url.startsWith('http') ? url : `http://localhost${url}`;
  const u = new URL(fullUrl);
  return {
    url: fullUrl,
    nextUrl: { searchParams: u.searchParams },
    headers: { get: (name: string) => headers?.[name] ?? null },
  };
}

describe('getPagination', () => {
  it('returns default page 1 and pageSize 10 when no query params', () => {
    const req = createMockRequest('http://localhost/api/factories');
    const result = getPagination(req as unknown as import('next/server').NextRequest);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(result.offset).toBe(0);
  });

  it('returns parsed page and pageSize from query', () => {
    const req = createMockRequest('http://localhost/api/factories?page=2&pageSize=20');
    const result = getPagination(req as unknown as import('next/server').NextRequest);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(20);
    expect(result.offset).toBe(20);
  });

  it('clamps page to at least 1', () => {
    const req = createMockRequest('http://localhost/api/factories?page=0');
    const result = getPagination(req as unknown as import('next/server').NextRequest);
    expect(result.page).toBe(1);
  });
});

describe('getUpdatedBy', () => {
  it('returns x-user-id when set', () => {
    const req = createMockRequest('/api/factories', { 'x-user-id': 'user123' });
    expect(getUpdatedBy(req as unknown as import('next/server').NextRequest)).toBe('user123');
  });

  it('returns x-user-name when x-user-id not set', () => {
    const req = createMockRequest('/api/factories', { 'x-user-name': '홍길동' });
    expect(getUpdatedBy(req as unknown as import('next/server').NextRequest)).toBe('홍길동');
  });

  it('returns null when no user headers', () => {
    const req = createMockRequest('/api/factories');
    expect(getUpdatedBy(req as unknown as import('next/server').NextRequest)).toBeNull();
  });
});
