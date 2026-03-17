'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const LOG_TAG = '[TopNav]';

interface User {
  id?: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

function fetchUser(): Promise<User | null> {
  return fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
    .then((res) => res.json())
    .then((data) => data.user ?? null)
    .catch((err) => {
      console.warn(LOG_TAG, 'fetchUser failed', err instanceof Error ? err.message : String(err));
      return null;
    });
}

export default function TopNav({ initialUser }: { initialUser?: User | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null | undefined>(initialUser ?? undefined);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.info(LOG_TAG, 'initialUser from server', initialUser != null ? { hasName: !!initialUser.name, hasEmail: !!initialUser.email } : 'null');
  }, [initialUser]);

  useEffect(() => setMounted(true), []);

  // 클라이언트 fetch가 null을 반환해도 서버에서 넘긴 initialUser가 있으면 덮어쓰지 않음 (로그인 상태인데 "로그인" 버튼 노출 방지)
  useEffect(() => {
    if (!mounted) return;
    fetchUser().then((u) => {
      console.info(LOG_TAG, 'fetchUser result (on mount)', u != null ? { hasName: !!u.name, hasEmail: !!u.email } : 'null');
      setUser((prev) => {
        const next = u !== null ? u : (prev ?? initialUser ?? null);
        console.info(LOG_TAG, 'setUser', next != null ? 'user' : 'null');
        return next;
      });
    });
  }, [mounted, initialUser]);

  useEffect(() => {
    if (mounted && pathname && pathname !== '/login') {
      fetchUser().then((u) => {
        console.info(LOG_TAG, 'fetchUser result (pathname)', pathname, u != null ? { hasName: !!u.name } : 'null');
        setUser((prev) => (u !== null ? u : (prev ?? initialUser ?? null)));
      });
    }
  }, [mounted, pathname, initialUser]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    router.refresh();
  };

  // 서버와 클라이언트 첫 페인트를 동일하게 해 하이드레이션 오류 방지: 마운트 전까지 플레이스홀더만
  const showPlaceholder = !mounted;
  const showUser = mounted && user;
  const showLogin = mounted && !user;

  return (
    <header
      className="h-14 shrink-0 flex items-center justify-between px-6 text-white"
      style={{ backgroundColor: 'var(--header-bg)' }}
      suppressHydrationWarning
    >
      <Link href="/" className="font-semibold text-lg text-white hover:text-white/90">
        다온 제조 공정 관리
      </Link>
      <div className="flex items-center gap-4 min-w-[120px] justify-end">
        {showPlaceholder ? (
          <span className="text-sm text-white/70">...</span>
        ) : showUser ? (
          <>
            <span className="text-sm text-white/95">
              {user.name || user.email || '회원'}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-1.5 text-sm font-medium rounded text-white hover:opacity-90"
              style={{ backgroundColor: 'var(--header-active)' }}
            >
              로그아웃
            </button>
          </>
        ) : showLogin ? (
          <Link
            href="/login"
            className="text-sm text-white hover:underline font-medium"
          >
            로그인
          </Link>
        ) : null}
      </div>
    </header>
  );
}
