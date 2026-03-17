'use client';

import { usePathname } from 'next/navigation';
import DashboardLayout from './DashboardLayout';
import type { ServerUser } from '@/lib/auth-server';

export default function ConditionalLayout({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: ServerUser | null;
}) {
  const pathname = usePathname();
  const isLogin = pathname === '/login' || pathname?.startsWith('/login/');

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <DashboardLayout initialUser={initialUser ?? undefined}>{children}</DashboardLayout>
  );
}
