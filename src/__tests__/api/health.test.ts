/**
 * Health Check API 테스트
 * GET /api/health - 서비스 및 DB 연결 상태 확인
 */

describe('GET /api/health', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3500';

  it('returns 200 and status ok when server is running', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = await res.json();
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('status');
    // DB 미연결 시 503, 연결 시 200
    if (res.status === 200) {
      expect(data.status).toBe('ok');
      expect(data.database).toBe('connected');
    } else {
      expect(res.status).toBe(503);
      expect(data.status).toBe('error');
      expect(data.database).toBe('disconnected');
    }
  });
});
