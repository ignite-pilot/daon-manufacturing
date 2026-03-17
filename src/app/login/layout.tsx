/**
 * 로그인 전용 레이아웃 (헤더/사이드바 없음)
 * globals.css 의 .login-page 등이 적용되도록 루트 레이아웃을 거침
 */
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f3f4f6' }}>
      {children}
    </div>
  );
}
