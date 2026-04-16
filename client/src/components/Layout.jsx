import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChatPanel from './ChatPanel';

/** 왼쪽 메뉴: 소메뉴만 (평면 목록) */
const menuItems = [
  { path: '/factories', label: '공장 정보' },
  { path: '/processes', label: '공정 정보' },
  { path: '/works', label: '작업 정보' },
  { path: '/machines', label: '기계 정보' },
  { path: '/parts', label: '부품 정보' },
  { path: '/plan', label: '공간 관리' },
  { path: '/simulations', label: '시뮬레이션 관리 (추후 구현)', disabled: true },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const pathname = location.pathname;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout().then(() => navigate('/login', { replace: true }));
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 헤더: 폭 90%, 모바일에서 메뉴 버튼 + 제목 + 사용자/로그아웃 */}
      <header className="header-height-bnk shrink-0 bg-header flex items-center justify-center text-header">
        <div className="header-inner">
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="header-menu-btn"
              aria-label="메뉴 열기"
            >
              <span className="header-menu-icon" aria-hidden />
            </button>
            <span className="header-title text-lg font-semibold text-header truncate">다온 제조 공정 관리</span>
          </div>
          <div className="header-right flex items-center gap-4 md:gap-8">
            <span
              className="text-sm font-normal hide-on-mobile"
              style={{ color: 'var(--header-user-text)' }}
            >
              {user?.name || user?.email || '회원'}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="header-logout-btn"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 모바일: 사이드바 오버레이 */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'sidebar-overlay-visible' : ''}`}
        aria-hidden={!sidebarOpen}
        onClick={closeSidebar}
      />

      <div className="layout-body flex flex-1 min-h-0">
        {/* 왼쪽 사이드바: 데스크톱 고정, 모바일 드로어 */}
        <aside className={`sidebar-bnk sidebar-drawer ${sidebarOpen ? 'sidebar-drawer-open' : ''}`}>
          <nav className="p-2 flex-1">
            <ul className="sidebar-flat-list">
              {menuItems.map((item) => (
                <li key={item.path}>
                  {item.disabled ? (
                    <span className="sidebar-main-disabled">{item.label}</span>
                  ) : (
                    <Link
                      to={item.path}
                      onClick={closeSidebar}
                      className={`sidebar-sub ${pathname.startsWith(item.path) ? 'sidebar-sub-active' : ''}`}
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* 메인: 바깥 연한 회색 배경, 내부 흰 박스 (bnk-mes) */}
        <main className="flex-1 overflow-auto content-outer main-with-sidebar min-w-0">
          <div className="content-inner">
            <Outlet />
          </div>
        </main>
      </div>

      <footer className="footer-bnk shrink-0 flex items-center justify-between px-3 md:px-5 footer-responsive">
        <span className="footer-text">다온 제조 공정 관리</span>
        <span className="footer-text hide-on-mobile">© 2026 다온 제조 공정 관리</span>
      </footer>

      <ChatPanel />
    </div>
  );
}
