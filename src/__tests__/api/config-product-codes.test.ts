/**
 * GET /api/config/product-codes - 완제품 코드 목록 (PRODUCT_CODE)
 */
import { GET } from '@/app/api/config/product-codes/route';

const originalEnv = process.env;
beforeEach(() => {
  process.env = { ...originalEnv };
});
afterAll(() => {
  process.env = originalEnv;
});

describe('GET /api/config/product-codes', () => {
  beforeEach(() => {
    delete process.env.IG_CONFIG_API_KEY; // 테스트에서는 config-manager 호출하지 않고 env fallback만 사용
  });

  it('returns empty items when PRODUCT_CODE is not set', async () => {
    delete process.env.PRODUCT_CODE;
    delete process.env.PRODUCT_CODES_API_URL;
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toEqual([]);
  });

  it('returns items from comma-separated PRODUCT_CODE', async () => {
    delete process.env.PRODUCT_CODES_API_URL;
    process.env.PRODUCT_CODE = 'A,B,C';
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toEqual(['A', 'B', 'C']);
  });

  it('returns items from config-manager when IG_CONFIG_API_KEY set and API returns items', async () => {
    process.env.IG_CONFIG_API_KEY = 'test-key';
    const mockItems = ['코드1', '코드2'];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: (name: string) => (name === 'content-type' ? 'application/json' : null) },
      text: () => Promise.resolve(JSON.stringify({ items: mockItems })),
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toEqual(mockItems);
    (global.fetch as jest.Mock).mockRestore();
  });
});
