/**
 * 완제품 코드 API 호출 디버그 — 서버와 동일한 URL로 fetch 후 로그 출력
 * 사용: node scripts/debug-product-codes.js
 */
const path = require('path');
const fs = require('fs');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const value = m[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

loadEnvLocal();

const apiKey = process.env.IG_CONFIG_API_KEY?.trim();
const appCode = process.env.IG_CONFIG_APP_CODE?.trim() || 'DAON_MFG';
const base = process.env.CONFIG_MANAGER_API_URL?.trim() || 'https://config-manager.ig-pilot.com';
const codeKey = 'PRODUCT_CODE';
const explicitUrl = process.env.CONFIG_MANAGER_PRODUCT_CODES_URL?.trim();

// ig-config-manager README: GET /api/v1/codes/PRODUCT_CODE, 인증 X-API-Key + X-App-Code
const urlsToTry = explicitUrl ? [explicitUrl] : [`${base}/api/v1/codes/${encodeURIComponent(codeKey)}`];

console.log('[product-codes] IG_CONFIG_API_KEY:', apiKey ? `${apiKey.slice(0, 8)}...` : '(없음)');
console.log('[product-codes] base:', base);
console.log('[product-codes] 시도할 URL 개수:', urlsToTry.length);
console.log('');

async function main() {
  if (!apiKey) {
    console.warn('[product-codes] API 키 없음. .env.local 에 IG_CONFIG_API_KEY 설정 필요.');
    return;
  }
  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, {
        headers: { 'X-API-Key': apiKey, 'X-App-Code': appCode, Accept: 'application/json' },
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.warn('[product-codes] URL:', url);
        console.warn('[product-codes] status:', res.status, 'body(not JSON):', text.slice(0, 400));
        console.log('');
        continue;
      }
      const keys = typeof data === 'object' && data !== null ? Object.keys(data) : [];
      const itemCount = Array.isArray(data?.items) ? data.items.length : Array.isArray(data?.data) ? data.data.length : Array.isArray(data) ? data.length : 0;
      console.log('[product-codes] URL:', url);
      console.log('[product-codes] status:', res.status, 'response keys:', keys.join(', ') || '-', 'items-like count:', itemCount);
      if (!res.ok) {
        console.warn('[product-codes] response sample:', JSON.stringify(data).slice(0, 500));
      } else if (itemCount === 0) {
        console.warn('[product-codes] status 200 but 0 items. full response sample:', JSON.stringify(data).slice(0, 600));
      } else {
        console.log('[product-codes] 첫 3개:', (data?.items || data?.data || data).slice(0, 3));
      }
      console.log('');
    } catch (e) {
      console.warn('[product-codes] URL:', url, 'error:', e.message);
      console.log('');
    }
  }
  console.log('[product-codes] 디버그 완료.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
