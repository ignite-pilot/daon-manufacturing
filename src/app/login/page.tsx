/**
 * 로그인은 Vite SPA에서 진행. 미들웨어 리다이렉트 시 이 페이지로 오면 SPA 로그인으로 안내.
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-gray-700">
      <h1 className="text-xl font-semibold mb-2">로그인</h1>
      <p className="mb-4 text-sm text-gray-500">로그인은 프론트엔드 앱에서 진행해 주세요.</p>
      <a
        href="http://localhost:3500/login"
        className="px-4 py-2 rounded text-white text-sm"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        로그인 페이지 열기 (localhost:3500)
      </a>
    </div>
  );
}
