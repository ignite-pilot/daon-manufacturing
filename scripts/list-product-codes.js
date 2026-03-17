/**
 * product_code에 등록된 완제품 코드 목록을 나열합니다.
 * 1) Next API 서버(3000)가 떠 있으면 GET /api/config/product-codes 호출
 * 2) 아니면 .env.local의 PRODUCT_CODE / PRODUCT_CODES_API_URL 없이 env만 읽어서 출력
 *
 * 사용: node scripts/list-product-codes.js
 * (API 호출 시: npm run dev:server 띄운 뒤 실행)
 */
const path = require('path');
const fs = require('fs');

// .env.local 로드 (Next와 동일한 우선순위)
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

function getProductCodesFromEnv() {
  const raw = process.env.PRODUCT_CODE || process.env.product_code || '';
  if (!raw.trim()) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed);
      return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string').map((s) => String(s).trim()).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
}

async function fetchFromApi() {
  try {
    const res = await fetch('http://localhost:3000/api/config/product-codes');
    const data = await res.json();
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return { ok: res.ok, items, status: res.status };
  } catch (e) {
    return { ok: false, items: [], error: e.message };
  }
}

async function main() {
  loadEnvLocal();

  const apiUrl = process.env.PRODUCT_CODES_API_URL?.trim();
  console.log('--- product_code 등록 값 나열 ---\n');
  console.log('PRODUCT_CODES_API_URL:', apiUrl || '(미설정)');
  console.log('PRODUCT_CODE (env):', process.env.PRODUCT_CODE ? '(설정됨)' : '(미설정)');
  console.log('');

  // 1) API 호출 시도
  const fromApi = await fetchFromApi();
  if (fromApi.ok) {
    console.log('API GET /api/config/product-codes 응답 (items):');
    if (fromApi.items.length === 0) {
      console.log('  (비어 있음)');
    } else {
      fromApi.items.forEach((code, i) => console.log(`  ${i + 1}. ${code}`));
    }
    console.log('');
    return;
  }

  // 2) API 실패 시 env에서 직접 파싱
  console.log('API 호출 실패 (서버 미실행 또는 오류). env에서 직접 파싱합니다.');
  const fromEnv = getProductCodesFromEnv();
  console.log('PRODUCT_CODE 파싱 결과 (items):');
  if (fromEnv.length === 0) {
    console.log('  (비어 있음) — .env.local에 PRODUCT_CODE=코드1,코드2 형태로 설정하세요.');
  } else {
    fromEnv.forEach((code, i) => console.log(`  ${i + 1}. ${code}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
