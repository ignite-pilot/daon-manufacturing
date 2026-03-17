/**
 * @jest-environment jsdom
 * PRD 부품 목록: 검색(부품 이름, 적용 공정, 적용 작업, 적용 기계), PC/Mobile 노출
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PartList } from './Parts';

describe('부품 목록 (PRD 104-122)', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('검색 조건: 부품 이름, 적용 공정, 적용 작업, 적용 기계를 제공한다', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/processes')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/works')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/machines')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/parts')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter>
        <PartList />
      </MemoryRouter>
    );
    await screen.findByText('총 0건');
    expect(screen.getByText('부품 이름')).toBeInTheDocument();
    expect(screen.getByText('적용 공정')).toBeInTheDocument();
    expect(screen.getByText('적용 작업')).toBeInTheDocument();
    expect(screen.getByText('적용 기계')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '검색' })).toBeInTheDocument();
  });

  it('PC 노출 항목: 공장, 부품 이름, 부품 사진, 부품 설명, 기능', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/processes')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/works')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/machines')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/parts')) return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          items: [{ id: 1, factory_name: 'F1', name: '부품A', photo_url: '/img.jpg', description: '설명' }],
          total: 1,
        }),
      });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter>
        <PartList />
      </MemoryRouter>
    );
    await screen.findByText('총 1건');
    expect(screen.getByText('공장')).toBeInTheDocument();
    expect(screen.getByText('부품 이름')).toBeInTheDocument();
    expect(screen.getByText('부품 사진')).toBeInTheDocument();
    expect(screen.getByText('부품 설명')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '부품A' })).toHaveAttribute('href', '/parts/1');
  });

  it('전체 기능: 등록, 엑셀 다운로드 제공', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/processes')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/works')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/machines')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/parts')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [], total: 0 }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter>
        <PartList />
      </MemoryRouter>
    );
    await screen.findByText('총 0건');
    expect(screen.getByRole('link', { name: '등록' })).toHaveAttribute('href', '/parts/new');
    expect(screen.getByRole('link', { name: '엑셀 다운로드' })).toHaveAttribute('href', '/api/parts/excel');
  });

  it('페이징: page, pageSize를 API에 전달하고 다음 페이지 클릭 시 page=2로 재요청한다', async () => {
    const mockFetch = jest.fn();
    global.fetch = mockFetch;
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/factories')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/processes')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/works')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/parts')) {
        const u = new URL(url, 'http://localhost');
        const page = Number(u.searchParams.get('page')) || 1;
        const pageSize = Number(u.searchParams.get('pageSize')) || 20;
        const items = page === 1
          ? Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `부품${i + 1}`, factory_name: 'F1' }))
          : [{ id: 21, name: '부품21', factory_name: 'F1' }];
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items, total: 21, page, pageSize }),
        });
      }
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter>
        <PartList />
      </MemoryRouter>
    );
    await screen.findByText('총 21건');
    expect(screen.getByText('부품1')).toBeInTheDocument();
    const partsCalls = mockFetch.mock.calls.filter((c) => c[0].includes('/api/parts?'));
    expect(partsCalls.length).toBeGreaterThanOrEqual(1);
    expect(partsCalls[0][0]).toContain('page=1');
    expect(partsCalls[0][0]).toContain('pageSize=20');

    const nextBtn = screen.getByRole('button', { name: '다음' });
    nextBtn.click();
    await screen.findByText('부품21');
    const partsCallsAfter = mockFetch.mock.calls.filter((c) => c[0].includes('/api/parts?'));
    const lastPartsCall = partsCallsAfter[partsCallsAfter.length - 1][0];
    expect(lastPartsCall).toContain('page=2');
  });
});
