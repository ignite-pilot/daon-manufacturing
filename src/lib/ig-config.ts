/**
 * ig-config 연동 (config-manager.ig-pilot.com)
 * - App 코드: DAON_MFG
 * - API 키: IG_CONFIG_API_KEY (원격 연동 시 인증용)
 * - 완제품 코드 조회: ig-config-manager 클라이언트 사용 (bnk-mes CAR_MAKER 조회와 동일 패턴)
 * - PRODUCT_CODE: 로컬 fallback (쉼표 구분 또는 JSON 배열)
 */

import { fetchProductCodes as fetchProductCodesFromClient } from './ig-config-manager-client';

const DEFAULT_APP_CODE = 'DAON_MFG';
const DEFAULT_CONFIG_MANAGER_BASE = 'https://config-manager.ig-pilot.com';

export function getAppCode(): string {
  return process.env.IG_CONFIG_APP_CODE ?? DEFAULT_APP_CODE;
}

/** ig-config 원격 API 접속용 API 키 (헤더 등 인증에 사용) */
export function getApiKey(): string | undefined {
  const v = process.env.IG_CONFIG_API_KEY;
  return v !== undefined && v !== '' ? String(v).trim() : undefined;
}

/** config-manager API 베이스 URL (끝에 슬래시 없음) */
export function getConfigManagerBaseUrl(): string {
  const v = process.env.CONFIG_MANAGER_API_URL?.trim();
  return v ? v.replace(/\/+$/, '') : DEFAULT_CONFIG_MANAGER_BASE;
}

export function getConfig(key: string): string | undefined {
  const envKey = key.replace(/\s/g, '_').toUpperCase();
  const value = process.env[envKey] ?? process.env[key];
  return value !== undefined && value !== '' ? String(value).trim() : undefined;
}

/**
 * config-manager에서 완제품 코드(PRODUCT_CODE) 목록 조회
 * - ig-config-manager 클라이언트 사용 (bnk-mes의 CAR_MAKER 코드 조회와 동일 패턴)
 * - GET {base}/api/apps/{appCode}/codes/PRODUCT_CODE/items, Bearer 인증
 */
export async function fetchProductCodesFromConfigManager(): Promise<string[] | null> {
  return fetchProductCodesFromClient();
}

/**
 * 완제품 코드 목록 — 로컬 환경 변수 PRODUCT_CODE (쉼표 구분 또는 JSON 배열)
 * 원격은 fetchProductCodesFromConfigManager() 사용
 */
export function getProductCodes(): string[] {
  const raw = getConfig('PRODUCT_CODE') ?? getConfig('product_code');
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed) as unknown;
      return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string').map((s) => String(s).trim()).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
}
