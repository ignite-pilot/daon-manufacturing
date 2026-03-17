/**
 * @jest-environment jsdom
 * PRD 작업 목록: 검색(작업 이름, 적용 공정), PC/Mobile 노출, 상세 링크, 수정/삭제
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WorkList } from './Works';

describe('작업 목록 (PRD 62-82)', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('검색 조건: 작업 이름, 적용 공정을 제공한다', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/processes')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/works')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [], total: 0 }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter>
        <WorkList />
      </MemoryRouter>
    );
    await screen.findByText('총 0건');
    expect(screen.getByText('작업 이름')).toBeInTheDocument();
    expect(screen.getByText('적용 공정')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '검색' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '초기화' })).toBeInTheDocument();
  });

  it('PC 노출 항목: 작업 이름, 예상 소요시간, 수정일자, 수정자, 기능', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/processes')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/works')) return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          items: [{ id: 1, name: '작업1', estimated_duration_sec: 1800, updated_at: '2026-03-13', updated_by: 'admin' }],
          total: 1,
        }),
      });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter>
        <WorkList />
      </MemoryRouter>
    );
    await screen.findByText('총 1건');
    expect(screen.getByText('작업 이름')).toBeInTheDocument();
    expect(screen.getByText('예상 소요시간')).toBeInTheDocument();
    expect(screen.getByText('수정일자')).toBeInTheDocument();
    expect(screen.getByText('수정자')).toBeInTheDocument();
    expect(screen.getByText('기능')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '작업1' })).toHaveAttribute('href', '/works/1');
  });

  it('전체 기능: 등록, 엑셀 다운로드 제공', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/processes')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/works')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [], total: 0 }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter>
        <WorkList />
      </MemoryRouter>
    );
    await screen.findByText('총 0건');
    expect(screen.getByRole('link', { name: '등록' })).toHaveAttribute('href', '/works/new');
    expect(screen.getByRole('link', { name: '엑셀 다운로드' })).toHaveAttribute('href', '/api/works/excel');
  });

  it('검색 시 포커스 복원: 작업 이름 입력 후 검색 버튼 클릭하면 검색 완료 후 해당 입력에 포커스가 유지된다', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/processes')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/works')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [], total: 0 }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter>
        <WorkList />
      </MemoryRouter>
    );
    await screen.findByText('총 0건');
    const workNameInput = screen.getByPlaceholderText('검색');
    workNameInput.focus();
    expect(document.activeElement).toBe(workNameInput);
    fireEvent.click(screen.getByRole('button', { name: '검색' }));
    await screen.findByText('총 0건');
    await waitFor(() => {
      expect(document.activeElement).toBe(workNameInput);
    });
  });

  it('페이징: 총 건수, 한번에 보기(페이지 크기), 이전/다음 버튼을 제공한다', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/processes')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/works')) return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 25 }),
      });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter>
        <WorkList />
      </MemoryRouter>
    );
    await screen.findByText('총 25건');
    expect(screen.getByRole('button', { name: '이전' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음' })).toBeInTheDocument();
    expect(screen.getByText('10개')).toBeInTheDocument();
    expect(screen.getByText('20개')).toBeInTheDocument();
  });
});
