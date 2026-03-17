/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout';

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { name: '테스트 사용자', email: 'test@test.com' },
    logout: () => Promise.resolve(),
  }),
}));

function TestOutlet() {
  return <div data-testid="outlet">페이지 콘텐츠</div>;
}

function renderLayout(initialPath = '/factories') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="factories" element={<TestOutlet />} />
          <Route path="processes" element={<TestOutlet />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('Layout (BBNK MES 스타일)', () => {
  it('헤더에 앱명과 로그아웃 버튼을 렌더링한다', () => {
    renderLayout();
    expect(screen.getByText('다온 제조 공정 관리')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
  });

  it('왼쪽 사이드바에 메뉴 항목을 렌더링한다', () => {
    renderLayout();
    expect(screen.getByText('공장 정보')).toBeInTheDocument();
    expect(screen.getByText('공정 정보')).toBeInTheDocument();
    expect(screen.getByText('작업 정보')).toBeInTheDocument();
    expect(screen.getByText('기계 정보')).toBeInTheDocument();
    expect(screen.getByText('부품 정보')).toBeInTheDocument();
  });

  it('사이드바에 공장 정보 등 메뉴를 렌더링한다', () => {
    renderLayout('/factories');
    const sidebar = document.querySelector('aside');
    expect(sidebar).toBeInTheDocument();
    expect(within(sidebar).getByText('공장 정보')).toBeInTheDocument();
  });

  it('공정 관리 경로일 때 사이드바에 공정 정보를 렌더링한다', () => {
    renderLayout('/processes');
    expect(screen.getByText('공정 정보')).toBeInTheDocument();
  });

  it('메인 영역에 Outlet을 렌더링한다', () => {
    renderLayout();
    expect(screen.getByTestId('outlet')).toHaveTextContent('페이지 콘텐츠');
  });

  it('푸터를 렌더링한다', () => {
    renderLayout();
    expect(screen.getByText(/© 다온 제조 공정 관리/)).toBeInTheDocument();
  });

  it('오른쪽 하단에 채팅 열기 버튼을 렌더링한다', () => {
    renderLayout();
    expect(screen.getByRole('button', { name: '채팅 열기' })).toBeInTheDocument();
  });

  it('반응형: 메뉴(햄버거) 버튼을 렌더링한다', () => {
    renderLayout();
    expect(screen.getByRole('button', { name: '메뉴 열기' })).toBeInTheDocument();
  });

  it('반응형: 사이드바 드로어와 오버레이 요소가 DOM에 존재한다', () => {
    const { container } = renderLayout();
    expect(container.querySelector('.sidebar-drawer')).toBeInTheDocument();
    expect(container.querySelector('.sidebar-overlay')).toBeInTheDocument();
  });

  it('메뉴 버튼 클릭 시 사이드바가 열린다', () => {
    const { container } = renderLayout();
    const menuBtn = screen.getByRole('button', { name: '메뉴 열기' });
    expect(container.querySelector('.sidebar-drawer-open')).not.toBeInTheDocument();
    menuBtn.click();
    expect(container.querySelector('.sidebar-drawer-open')).toBeInTheDocument();
  });
});
