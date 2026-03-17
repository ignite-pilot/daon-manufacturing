/**
 * ig-config-manager-client: fetchCodeItems, fetchProductCodes (bnk-mes CAR_MAKER 조회 패턴)
 */
import { fetchCodeItems, fetchProductCodes } from '@/lib/ig-config-manager-client';

const originalEnv = process.env;
const originalFetch = global.fetch;

beforeEach(() => {
  process.env = { ...originalEnv };
});
afterEach(() => {
  global.fetch = originalFetch;
});
afterAll(() => {
  process.env = originalEnv;
});

describe('ig-config-manager-client', () => {
  it('fetchCodeItems returns null when IG_CONFIG_API_KEY is not set', async () => {
    delete process.env.IG_CONFIG_API_KEY;
    expect(await fetchCodeItems('PRODUCT_CODE')).toBeNull();
    expect(await fetchCodeItems('CAR_MAKER')).toBeNull();
  });

  it('fetchCodeItems calls GET /api/v1/codes/{codeKey} with X-API-Key and X-App-Code and returns parsed items', async () => {
    process.env.IG_CONFIG_API_KEY = 'test-key';
    process.env.CONFIG_MANAGER_API_URL = 'https://config-manager.example.com';
    const mockItems = ['A', 'B', 'C'];
    let capturedUrl = '';
    let capturedHeaders: HeadersInit = {};
    global.fetch = jest.fn().mockImplementation((url: string, opts?: { headers?: HeadersInit }) => {
      capturedUrl = url;
      capturedHeaders = opts?.headers ?? {};
      return Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify({ items: mockItems })),
      } as Response);
    });
    const result = await fetchCodeItems('PRODUCT_CODE');
    expect(result).toEqual(mockItems);
    expect(capturedUrl).toBe('https://config-manager.example.com/api/v1/codes/PRODUCT_CODE');
    expect(capturedHeaders).toMatchObject({
      'X-API-Key': 'test-key',
      'X-App-Code': 'DAON_MFG',
      Accept: 'application/json',
    });
  });

  it('fetchProductCodes uses CONFIG_MANAGER_PRODUCT_CODES_URL when set', async () => {
    process.env.IG_CONFIG_API_KEY = 'key';
    process.env.CONFIG_MANAGER_PRODUCT_CODES_URL = 'https://custom.url/product-codes';
    let capturedUrl = '';
    global.fetch = jest.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      return Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify({ items: ['P1', 'P2'] })),
      } as Response);
    });
    const result = await fetchProductCodes();
    expect(result).toEqual(['P1', 'P2']);
    expect(capturedUrl).toBe('https://custom.url/product-codes');
  });

  it('fetchCodeItems parses README tree response format (code.children)', async () => {
    process.env.IG_CONFIG_API_KEY = 'key';
    const treeResponse = {
      code: {
        id: 1,
        name: '완제품코드',
        value: 'PRODUCT_CODE',
        children: [
          { id: 2, name: '제품A', value: 'P-A', details: [{ id: 10, name: '옵션1', value: 'P-A-1' }] },
          { id: 3, name: '제품B', value: 'P-B', details: [] },
        ],
      },
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve(JSON.stringify(treeResponse)),
    } as Response);
    const result = await fetchCodeItems('PRODUCT_CODE');
    expect(result).toEqual(['P-A', 'P-A-1', 'P-B']);
  });

  it('fetchCodeItems returns null when response is HTML', async () => {
    process.env.IG_CONFIG_API_KEY = 'key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: () => Promise.resolve('<!DOCTYPE html><html>'),
    } as Response);
    expect(await fetchCodeItems('PRODUCT_CODE')).toBeNull();
  });
});
