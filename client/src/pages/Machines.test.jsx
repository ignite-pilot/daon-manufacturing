/**
 * @jest-environment jsdom
 * PRD 기계 목록: 검색(기계 종류, 기계 이름, 적용 공정, 적용 작업), PC/Mobile 노출
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MachineList } from './Machines';

describe('기계 목록 (PRD 84-102)', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('검색 조건: 기계 종류, 기계 이름, 적용 공정, 적용 작업을 제공한다', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/processes')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/works')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/machines')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter>
        <MachineList />
      </MemoryRouter>
    );
    await screen.findByText('총 0건');
    expect(screen.getByText('기계 종류')).toBeInTheDocument();
    expect(screen.getByText('기계 이름')).toBeInTheDocument();
    expect(screen.getByText('적용 공정')).toBeInTheDocument();
    expect(screen.getByText('적용 작업')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '검색' })).toBeInTheDocument();
  });

  it('PC 노출 항목: 공장, 기계 이름, 기계 소요시간, 기계 사진, 도입일시, 기능', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/processes')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/works')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/machines')) return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          items: [{ id: 1, factory_name: 'F1', name: '기계A', total_duration_sec: 3600, photo_url: '/img.jpg', introduced_at: '2026-03-13' }],
        }),
      });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter>
        <MachineList />
      </MemoryRouter>
    );
    await screen.findByText('총 1건');
    expect(screen.getByText('공장')).toBeInTheDocument();
    expect(screen.getByText('기계 이름')).toBeInTheDocument();
    expect(screen.getByText('기계 소요시간')).toBeInTheDocument();
    expect(screen.getByText('기계 사진')).toBeInTheDocument();
    expect(screen.getByText('도입일시')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '기계A' })).toHaveAttribute('href', '/machines/1');
  });

  it('전체 기능: 등록, 엑셀 다운로드 제공', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/processes')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/works')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/machines')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter>
        <MachineList />
      </MemoryRouter>
    );
    await screen.findByText('총 0건');
    expect(screen.getByRole('link', { name: '등록' })).toHaveAttribute('href', '/machines/new');
    expect(screen.getByRole('link', { name: '엑셀 다운로드' })).toHaveAttribute('href', '/api/machines/excel');
  });

  it('반응형(PRD Mobile): 검색 조건 중 적용 작업은 모바일에서 숨긴다(hide-on-mobile)', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/processes')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/works')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/machines')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    const { container } = render(
      <MemoryRouter>
        <MachineList />
      </MemoryRouter>
    );
    await screen.findByText('총 0건');
    const hideDivs = container.querySelectorAll('.hide-on-mobile');
    const applyWorkDiv = Array.from(hideDivs).find((el) => el.textContent?.includes('적용 작업'));
    expect(applyWorkDiv).toBeInTheDocument();
  });
});
