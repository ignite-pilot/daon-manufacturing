/**
 * 로그인 페이지 테스트
 * - 미로그인 시 /login 에서 서비스 타이틀·로그인 폼 노출
 */

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3500';

describe('로그인 페이지', () => {
  it('returns 200 and contains service title and login form', async () => {
    const res = await fetch(`${baseUrl}/login`, {
      redirect: 'manual', // 리다이렉트 따라가지 않음
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('다온 제조 공정 관리');
    expect(html).toContain('로그인');
    expect(html).toContain('이메일');
    expect(html).toContain('비밀번호');
  });
});
