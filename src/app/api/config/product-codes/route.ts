import { NextResponse } from 'next/server';
import { getProductCodes, getApiKey, fetchProductCodesFromConfigManager } from '@/lib/ig-config';

/** 코드 관리 API 응답의 한 항목을 문자열(코드 값)로 변환 */
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
 * 완제품 코드 목록 — config-manager(PRODUCT_CODE) 또는 로컬 env
 * 1) PRODUCT_CODES_API_URL 설정 시: 해당 URL에서만 목록 조회
 * 2) IG_CONFIG_API_KEY 설정 시: config-manager API에서만 조회 (앱 코드 DAON_MFG, 코드 타입 PRODUCT_CODE). 실패 시 빈 배열(env 미사용)
 * 3) 그 외: 환경 변수 PRODUCT_CODE 사용
 * GET /api/config/product-codes → { items: string[] }
 */
export async function GET() {
  try {
    const apiUrl = process.env.PRODUCT_CODES_API_URL?.trim();
    if (apiUrl) {
      const headers: HeadersInit = {};
      const apiKey = getApiKey();
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const res = await fetch(apiUrl, { headers, next: { revalidate: 60 } });
      if (res.ok) {
        const data = (await res.json()) as unknown;
        const rawItems = Array.isArray((data as { items?: unknown }).items)
          ? (data as { items: unknown[] }).items
          : Array.isArray(data)
            ? data
            : [];
        const items = rawItems.map(toCodeString).filter((s): s is string => s != null);
        return NextResponse.json({ items });
      }
    }
    const apiKey = getApiKey();
    if (apiKey) {
      const fromConfigManager = await fetchProductCodesFromConfigManager();
      return NextResponse.json({ items: fromConfigManager ?? [] });
    }
    return NextResponse.json({ items: getProductCodes() });
  } catch (e) {
    console.error('[config/product-codes]', e);
    const apiKey = getApiKey();
    return NextResponse.json({ items: apiKey ? [] : getProductCodes() });
  }
}
