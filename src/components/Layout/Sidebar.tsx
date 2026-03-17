'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const menus = [
  { href: '/factories', label: '제조 공장 관리' },
  { href: '/processes', label: '공정 관리' },
  { href: '/works', label: '작업 관리' },
  { href: '/machines', label: '기계 관리' },
  { href: '/parts', label: '부품 관리' },
  { href: '/spaces', label: '공간 관리 (추후 구현)', disabled: true },
  { href: '/simulations', label: '시뮬레이션 관리 (추후 구현)', disabled: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // 마운트 전에는 activePath를 비워 서버/클라이언트 동일 렌더 (하이드레이션 오류 방지)
  const activePath = mounted ? pathname : '';
  return (
    <aside className="w-56 bg-white border-r border-gray-200 shrink-0 flex flex-col shadow-sm">
      <div className="px-4 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">제조 공정 관리</h2>
      </div>
      <nav className="p-2 flex-1">
        {menus.map((m) =>
          m.disabled ? (
            <span
              key={m.href}
              className="block px-3 py-2.5 text-sm text-gray-400 cursor-not-allowed rounded"
            >
              {m.label}
            </span>
          ) : (
            <Link
              key={m.href}
              href={m.href}
              className={`block px-3 py-2.5 text-sm rounded ${
                activePath.startsWith(m.href)
                  ? 'font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              style={
                activePath.startsWith(m.href)
                  ? { backgroundColor: 'var(--sidebar-active-bg)', color: 'var(--sidebar-active-text)' }
                  : undefined
              }
            >
              {m.label}
            </Link>
          )
        )}
      </nav>
    </aside>
  );
}
