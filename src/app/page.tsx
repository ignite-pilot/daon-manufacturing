/**
 * Next.js는 API 전용. 이 페이지는 API 서버(3000) 루트에서만 보입니다.
 * 앱 UI는 Vite SPA → http://localhost:3500
 */
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-gray-700">
      <h1 className="text-xl font-semibold mb-2">다온 제조 공정 관리 (API)</h1>
      <p className="mb-4 text-sm text-gray-500">프론트엔드는 Vite SPA에서 실행됩니다 (bnk-mes와 동일 방식).</p>
      <a
        href="http://localhost:3500"
        className="px-4 py-2 rounded text-white text-sm"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        앱 열기 (localhost:3500)
      </a>
      <p className="mt-6 text-xs text-gray-400">
        지금 3500에서 이 페이지가 보인다면 Next만 켜진 상태입니다. 터미널에서 <code className="bg-gray-100 px-1 rounded">npm run dev</code> 로 Next(3000)와 Vite(3500)를 함께 실행하세요.
      </p>
    </div>
  );
}
