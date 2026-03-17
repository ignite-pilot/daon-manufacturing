/**
 * @jest-environment jsdom
 * PRD 공정 목록: 검색 조건(공장, 완제품, 공정 이름), PC/Mobile 노출, 상세 링크, 수정/삭제
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProcessList } from './Processes';

describe('공정 목록 (PRD 41-60)', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('검색 조건: 공장 이름, 완제품 이름, 공정 이름을 제공한다', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/factories')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/processes')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter>
        <ProcessList />
      </MemoryRouter>
    );
    await screen.findByText('총 0건');
    expect(screen.getByText('공장 이름')).toBeInTheDocument();
    expect(screen.getByText('완제품 이름')).toBeInTheDocument();
    expect(screen.getByText('공정 이름')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '검색' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '초기화' })).toBeInTheDocument();
  });

  it('PC 노출 항목: 공장, 완제품, 공정 이름, 예상 소요시간, 작업 단계 수, 수정일자, 수정자, 기능', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/factories')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/processes')) return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          items: [{ id: 1, factory_name: 'F1', product_name: 'P1', process_name: '공정1', total_duration_sec: 3600, step_count: 2, updated_at: '2026-03-13', updated_by: 'admin' }],
        }),
      });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter>
        <ProcessList />
      </MemoryRouter>
    );
    await screen.findByText('총 1건');
    expect(screen.getByText('공장')).toBeInTheDocument();
    expect(screen.getByText('완제품')).toBeInTheDocument();
    expect(screen.getByText('공정 이름')).toBeInTheDocument();
    expect(screen.getByText('예상 소요시간')).toBeInTheDocument();
    expect(screen.getByText('작업 단계 수')).toBeInTheDocument();
    expect(screen.getByText('수정일자')).toBeInTheDocument();
    expect(screen.getByText('수정자')).toBeInTheDocument();
    expect(screen.getByText('기능')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '공정1' })).toHaveAttribute('href', '/processes/1/edit');
  });

  it('전체 기능: 등록, 엑셀 다운로드 제공', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/factories')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/processes')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter>
        <ProcessList />
      </MemoryRouter>
    );
    await screen.findByText('총 0건');
    expect(screen.getByRole('link', { name: '등록' })).toHaveAttribute('href', '/processes/new');
    expect(screen.getByRole('link', { name: '엑셀 다운로드' })).toHaveAttribute('href', '/api/processes/excel');
  });
});
