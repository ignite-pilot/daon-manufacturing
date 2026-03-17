/**
 * GET /api/config/product-codes 호출 결과를 그대로 출력 (PRODUCT_CODE 값 확인용)
 * 사용: node scripts/show-product-codes-api.js
 * (Next 서버 실행 중: npm run dev:server)
 */
async function main() {
  const url = 'http://localhost:3000/api/config/product-codes';
  console.log('GET', url);
  console.log('');
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response body:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    if (Array.isArray(data?.items)) {
      console.log('items 개수:', data.items.length);
      if (data.items.length > 0) {
        console.log('items 내용:');
        data.items.forEach((code, i) => console.log('  ', i + 1, code));
      }
    }
  } catch (e) {
    console.error('호출 실패:', e.message);
    console.log('서버가 실행 중인지 확인하세요: npm run dev:server');
    process.exit(1);
  }
}
main();
