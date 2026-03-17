/**
 * ig-config 라이브러리: APP_CODE DAON_MFG, getApiKey, getConfigManagerBaseUrl, fetchProductCodesFromConfigManager, getProductCodes
 */
import { getAppCode, getApiKey, getConfigManagerBaseUrl, fetchProductCodesFromConfigManager, getProductCodes } from '@/lib/ig-config';

describe('ig-config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });
  afterAll(() => {
    process.env = originalEnv;
  });

  it('getAppCode returns DAON_MFG when IG_CONFIG_APP_CODE is not set', () => {
    delete process.env.IG_CONFIG_APP_CODE;
    expect(getAppCode()).toBe('DAON_MFG');
  });

  it('getAppCode returns env value when IG_CONFIG_APP_CODE is set', () => {
    process.env.IG_CONFIG_APP_CODE = 'CUSTOM_APP';
    expect(getAppCode()).toBe('CUSTOM_APP');
  });

  it('getApiKey returns undefined when IG_CONFIG_API_KEY is not set', () => {
    delete process.env.IG_CONFIG_API_KEY;
    expect(getApiKey()).toBeUndefined();
  });

  it('getApiKey returns trimmed value when IG_CONFIG_API_KEY is set', () => {
    process.env.IG_CONFIG_API_KEY = '  key123  ';
    expect(getApiKey()).toBe('key123');
  });

  it('getProductCodes returns empty when PRODUCT_CODE is not set', () => {
    delete process.env.PRODUCT_CODE;
    expect(getProductCodes()).toEqual([]);
  });

  it('getProductCodes parses comma-separated PRODUCT_CODE', () => {
    process.env.PRODUCT_CODE = 'CODE-A, CODE-B , CODE-C';
    expect(getProductCodes()).toEqual(['CODE-A', 'CODE-B', 'CODE-C']);
  });

  it('getProductCodes parses JSON array PRODUCT_CODE', () => {
    process.env.PRODUCT_CODE = '["P1","P2"]';
    expect(getProductCodes()).toEqual(['P1', 'P2']);
  });

  it('getConfigManagerBaseUrl returns default when CONFIG_MANAGER_API_URL is not set', () => {
    delete process.env.CONFIG_MANAGER_API_URL;
    expect(getConfigManagerBaseUrl()).toBe('https://config-manager.ig-pilot.com');
  });

  it('getConfigManagerBaseUrl returns env value without trailing slash', () => {
    process.env.CONFIG_MANAGER_API_URL = 'https://custom.config.com/';
    expect(getConfigManagerBaseUrl()).toBe('https://custom.config.com');
  });

  it('fetchProductCodesFromConfigManager returns null when IG_CONFIG_API_KEY is not set', async () => {
    delete process.env.IG_CONFIG_API_KEY;
    expect(await fetchProductCodesFromConfigManager()).toBeNull();
  });
});
