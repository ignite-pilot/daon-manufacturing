/**
 * @jest-environment jsdom
 * PRD 제조 공장 목록 스펙: 검색 조건 없음, PC 노출 항목, Mobile 노출 항목, 상세 보기 링크, 수정/삭제
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FactoryList } from './Factories';

function renderList(items = []) {
  const fetchMock = jest.fn();
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ items }) });
  global.fetch = fetchMock;

  render(
    <MemoryRouter>
      <FactoryList />
    </MemoryRouter>
  );
  return fetchMock;
}

describe('제조 공장 목록 (PRD 25-38)', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('공장 목록 API를 호출한다', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) });
    render(
      <MemoryRouter>
        <FactoryList />
      </MemoryRouter>
    );
    await screen.findByText('총 0건');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/factories'), expect.any(Object));
  });

  it('PC 노출 항목: 공장 이름, 주소, 면적, CAD 파일, 수정일자, 수정자, 기능을 표시한다', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 1,
            name: '테스트 공장',
            address: '서울시',
            address_detail: '1동',
            area: 100,
            cad_file_path: '/files/cad.pdf',
            updated_at: '2026-03-13',
            updated_by: 'admin',
          },
        ],
      }),
    });
    render(
      <MemoryRouter>
        <FactoryList />
      </MemoryRouter>
    );
    await screen.findByText('총 1건');
    const table = document.querySelector('table');
    expect(within(table).getByText('공장 이름')).toBeInTheDocument();
    expect(within(table).getByText('주소')).toBeInTheDocument();
    expect(within(table).getByText('면적')).toBeInTheDocument();
    expect(within(table).getByText('CAD 파일')).toBeInTheDocument();
    expect(within(table).getByText('수정일자')).toBeInTheDocument();
    expect(within(table).getByText('수정자')).toBeInTheDocument();
    expect(within(table).getByText('기능')).toBeInTheDocument();
    expect(within(table).getByText('테스트 공장')).toBeInTheDocument();
    expect(within(table).getByText('서울시 1동')).toBeInTheDocument();
    expect(within(table).getByText('100')).toBeInTheDocument();
    expect(within(table).getByRole('link', { name: /CAD/ })).toBeInTheDocument();
  });

  it('상세 보기는 공장 이름에 링크로 연결한다', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [{ id: 2, name: '상세 링크 공장' }] }),
    });
    render(
      <MemoryRouter>
        <FactoryList />
      </MemoryRouter>
    );
    await screen.findByText('총 1건');
    const link = screen.getByRole('link', { name: '상세 링크 공장' });
    expect(link).toHaveAttribute('href', '/factories/2');
  });

  it('수정 버튼과 삭제 버튼을 제공한다', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [{ id: 3, name: '기능 공장' }] }),
    });
    render(
      <MemoryRouter>
        <FactoryList />
      </MemoryRouter>
    );
    await screen.findByText('총 1건');
    expect(screen.getByRole('link', { name: '수정' })).toHaveAttribute('href', '/factories/3/edit');
    expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument();
  });

  it('전체 기능: 등록, 엑셀 다운로드 버튼을 제공한다', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) });
    render(
      <MemoryRouter>
        <FactoryList />
      </MemoryRouter>
    );
    await screen.findByText('총 0건');
    expect(screen.getByRole('link', { name: '등록' })).toHaveAttribute('href', '/factories/new');
    expect(screen.getByRole('link', { name: '엑셀 다운로드' })).toHaveAttribute('href', '/api/factories/excel');
  });

  it('반응형(PRD Mobile): 모바일에서 숨길 열(주소, 수정일자, 수정자)에 hide-on-mobile 클래스가 있다', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) });
    const { container } = render(
      <MemoryRouter>
        <FactoryList />
      </MemoryRouter>
    );
    await screen.findByText('총 0건');
    const headerRow = container.querySelector('thead tr');
    const ths = headerRow.querySelectorAll('th');
    const hideThs = Array.from(ths).filter((th) => th.classList.contains('hide-on-mobile'));
    expect(hideThs.length).toBeGreaterThanOrEqual(3);
    const textContent = Array.from(hideThs).map((t) => t.textContent);
    expect(textContent).toContain('주소');
    expect(textContent).toContain('수정일자');
    expect(textContent).toContain('수정자');
  });
});
