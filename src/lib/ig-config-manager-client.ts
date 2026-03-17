/**
 * ig-config-manager 코드 조회 클라이언트
 *
 * 연동 방식: https://github.com/ignite-pilot/ig-config-manager/blob/main/README.md 기준
 * - API: GET {base}/api/v1/codes/{codeKey}
 * - 인증: X-API-Key + X-App-Code 헤더 이중 인증 (README "외부 연동 API (v1)")
 * - base: CONFIG_MANAGER_API_URL (기본 https://config-manager.ig-pilot.com)
 */

const DEFAULT_BASE = 'https://config-manager.ig-pilot.com';
const DEFAULT_APP_CODE = 'DAON_MFG';
const LOG_TAG = '[ig-config-manager]';

function getBaseUrl(): string {
  const v = process.env.CONFIG_MANAGER_API_URL?.trim();
  return v ? v.replace(/\/+$/, '') : DEFAULT_BASE;
}

function getApiKey(): string | undefined {
  const v = process.env.IG_CONFIG_API_KEY;
  return v !== undefined && v !== '' ? String(v).trim() : undefined;
}

function getAppCode(): string {
  return process.env.IG_CONFIG_APP_CODE ?? DEFAULT_APP_CODE;
}

/** 코드 항목을 문자열로 변환 (API 응답 파싱용) */
function toCodeString(item: unknown): string | null {
  if (item == null) return null;
  if (typeof item === 'string') return item.trim() || null;
  if (typeof item === 'object' && item !== null) {
    const o = item as Record<string, unknown>;
    const v = (o.code_value ?? o.code_name ?? o.value ?? o.name) as string | undefined;
    if (typeof v === 'string') return v.trim() || null;
  }
  return null;
}

/**
 * README 응답 형식: { code: { children: [ { value, details: [ { value } ] } ] } } 에서 value 수집
 */
function parseCodeTreeResponse(data: unknown): string[] {
  if (data == null || typeof data !== 'object') return [];
  const code = (data as Record<string, unknown>).code as Record<string, unknown> | undefined;
  if (!code || !Array.isArray(code.children)) return [];
  const values: string[] = [];
  for (const child of code.children as Record<string, unknown>[]) {
    const v = toCodeString(child);
    if (v) values.push(v);
    const details = child?.details;
    if (Array.isArray(details)) {
      for (const d of details as Record<string, unknown>[]) {
        const dv = toCodeString(d);
        if (dv) values.push(dv);
      }
    }
  }
  return values;
}

/** API 응답에서 코드 문자열 배열 추출 (README 형식 + 기존 items/data 배열) */
function parseCodeItemsResponse(data: unknown): string[] {
  if (data == null) return [];
  const obj = data as Record<string, unknown>;
  const str = obj?.value ?? obj?.data;
  if (typeof str === 'string' && str.trim()) {
    return str.split(',').map((s) => s.trim()).filter(Boolean);
  }
  const treeItems = parseCodeTreeResponse(data);
  if (treeItems.length > 0) return treeItems;
  let rawItems: unknown[] = [];
  if (Array.isArray(obj?.items)) rawItems = obj.items;
  else if (Array.isArray(obj?.data)) rawItems = obj.data;
  else if (Array.isArray(obj?.list)) rawItems = obj.list;
  else if (Array.isArray(obj?.result)) rawItems = obj.result;
  else if (Array.isArray(obj?.rows)) rawItems = obj.rows;
  else if (Array.isArray(obj?.records)) rawItems = obj.records;
  else if (Array.isArray((obj?.data as Record<string, unknown>)?.items)) rawItems = (obj.data as { items: unknown[] }).items;
  else if (Array.isArray(data)) rawItems = data;
  return rawItems.map(toCodeString).filter((s): s is string => s != null);
}

/**
 * URL 한 개 호출 후 파싱해 items 반환. HTML이면 null, JSON이면 파싱 결과 반환.
 */
async function tryFetchOne(
  url: string,
  codeKey: string,
  headers: HeadersInit
): Promise<{ items: string[]; ok: boolean } | null> {
  const res = await fetch(url, { headers, next: { revalidate: 60 } });
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  if (!contentType.includes('application/json') && (text.trimStart().startsWith('<') || text.includes('<!DOCTYPE'))) {
    console.warn(LOG_TAG, 'HTML 반환 (API 경로 아님).', { url: url.slice(0, 90) });
    return null;
  }

  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    console.warn(LOG_TAG, '응답이 JSON이 아님.', { status: res.status, preview: text.slice(0, 200) });
    return null;
  }

  const items = parseCodeItemsResponse(data);
  if (!res.ok) {
    console.warn(LOG_TAG, 'API 오류.', { status: res.status, codeKey });
    return null;
  }
  return { items, ok: res.ok };
}

/**
 * config-manager에서 코드 키(codeKey)에 해당하는 목록 조회
 * - 문서: GET {base}/api/v1/codes/{codeKey}
 * - CONFIG_MANAGER_PRODUCT_CODES_URL 설정 시 해당 URL만 사용
 */
export async function fetchCodeItems(
  codeKey: string,
  options?: { explicitUrl?: string }
): Promise<string[] | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn(LOG_TAG, 'API 키 없음. IG_CONFIG_API_KEY 설정 필요.');
    return null;
  }
  const base = getBaseUrl();
  const appCode = getAppCode();
  const headers: HeadersInit = {
    'X-API-Key': apiKey,
    'X-App-Code': appCode,
    Accept: 'application/json',
  };

  const explicitUrl = options?.explicitUrl?.trim();
  const url = explicitUrl || `${base}/api/v1/codes/${encodeURIComponent(codeKey)}`;

  try {
    const result = await tryFetchOne(url, codeKey, headers);
    if (result && result.items.length > 0) {
      console.info(LOG_TAG, '코드 조회 성공.', { codeKey, count: result.items.length });
      return result.items;
    }
    if (result && result.ok && result.items.length === 0) {
      console.warn(LOG_TAG, '200이지만 items 0개.', { url: url.slice(0, 80) });
    }
  } catch (e) {
    console.warn(LOG_TAG, '요청 실패.', { codeKey, error: (e as Error).message });
  }
  return null;
}

/**
 * 완제품 코드(PRODUCT_CODE) 목록 조회
 * - CONFIG_MANAGER_PRODUCT_CODES_URL 설정 시 해당 URL만 사용
 */
export async function fetchProductCodes(): Promise<string[] | null> {
  const explicitUrl = process.env.CONFIG_MANAGER_PRODUCT_CODES_URL?.trim();
  return fetchCodeItems('PRODUCT_CODE', { explicitUrl: explicitUrl || undefined });
}
