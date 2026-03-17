import TopNav from './TopNav';
import Sidebar from './Sidebar';
import Footer from './Footer';
import type { ServerUser } from '@/lib/auth-server';

export default function DashboardLayout({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: ServerUser | null;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)]">
      <div className="shrink-0">
        <TopNav initialUser={initialUser ?? undefined} />
      </div>
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6 bg-[var(--background)]">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
