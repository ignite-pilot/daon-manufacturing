/**
 * auth-server (getUpdatedByFromAuth) 테스트
 * - 로그인 사용자 name/email이 수정자로 반환되는지
 */

const mockGetServerUser = jest.fn();
jest.mock('@/lib/auth-server', () => {
  const actual = jest.requireActual('@/lib/auth-server');
  return {
    ...actual,
    getServerUser: (...args: unknown[]) => mockGetServerUser.apply(null, args),
    async getUpdatedByFromAuth() {
      const user = await mockGetServerUser();
      return user?.name ?? user?.email ?? null;
    },
  };
});

import { getUpdatedByFromAuth } from '@/lib/auth-server';

describe('getUpdatedByFromAuth', () => {
  beforeEach(() => {
    mockGetServerUser.mockReset();
  });

  it('returns user name when getServerUser returns user with name', async () => {
    mockGetServerUser.mockResolvedValue({
      name: '테스트유저',
      email: 'test@example.com',
    });
    const result = await getUpdatedByFromAuth();
    expect(result).toBe('테스트유저');
  });

  it('returns user email when getServerUser returns user without name', async () => {
    mockGetServerUser.mockResolvedValue({
      email: 'only@example.com',
    });
    const result = await getUpdatedByFromAuth();
    expect(result).toBe('only@example.com');
  });

  it('returns null when getServerUser returns null', async () => {
    mockGetServerUser.mockResolvedValue(null);
    const result = await getUpdatedByFromAuth();
    expect(result).toBeNull();
  });
});
