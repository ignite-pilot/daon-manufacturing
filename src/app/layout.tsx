import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '다온 제조 공정 관리',
  description: '제조 공정 관리 시스템',
};

/** Next.js는 API 전용. 프론트엔드는 Vite SPA(client/)에서 실행 (bnk-mes와 동일). */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-[#f5f5f5] antialiased">
        {children}
      </body>
    </html>
  );
}
