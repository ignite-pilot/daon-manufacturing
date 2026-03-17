/**
 * @jest-environment jsdom
 * PRD 작업: 필수(작업 이름, 예상 소요시간, 작업 Type), 사용 부품/기계
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import WorkForm from './WorkForm';

describe('WorkForm (PRD 작업 정보)', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/parts')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/machines')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      return Promise.reject(new Error('unknown'));
    });
  });

  it('필수 항목: 작업 이름, 예상 소요시간, 작업 Type 라벨을 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/works/new']}>
        <Routes>
          <Route path="/works/new" element={<WorkForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('작업 이름');
    expect(screen.getByText(/예상 소요시간/)).toBeInTheDocument();
    expect(screen.getByText('작업 Type')).toBeInTheDocument();
  });

  it('사용 부품, 사용 기계 선택을 제공한다', async () => {
    render(
      <MemoryRouter initialEntries={['/works/new']}>
        <Routes>
          <Route path="/works/new" element={<WorkForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('사용 부품');
    expect(screen.getByText('사용 기계')).toBeInTheDocument();
  });

  it('부품 선택 버튼 클릭 시 사용 부품 선택 팝업이 열린다', async () => {
    render(
      <MemoryRouter initialEntries={['/works/new']}>
        <Routes>
          <Route path="/works/new" element={<WorkForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('사용 부품');
    const openBtn = screen.getByRole('button', { name: '부품 선택' });
    fireEvent.click(openBtn);
    expect(screen.getByText('사용 부품 선택')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('부품명 검색...')).toBeInTheDocument();
  });

  it('기계 선택 버튼 클릭 시 사용 기계 선택 팝업이 열린다', async () => {
    render(
      <MemoryRouter initialEntries={['/works/new']}>
        <Routes>
          <Route path="/works/new" element={<WorkForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('사용 기계');
    const openBtn = screen.getByRole('button', { name: '기계 선택' });
    fireEvent.click(openBtn);
    expect(screen.getByText('사용 기계 선택')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('기계명 검색...')).toBeInTheDocument();
  });

  it('수정 시 수정일자·수정자를 표시한다', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/parts')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/machines')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/works/1')) return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 1,
          name: '작업A',
          estimated_duration_sec: 1200,
          work_type: '가조립',
          part_ids: [],
          machine_ids: [],
          steps: [],
          updated_at: '2026-03-13T00:00:00Z',
          updated_by: 'admin',
        }),
      });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter initialEntries={['/works/1/edit']}>
        <Routes>
          <Route path="/works/:id/edit" element={<WorkForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByDisplayValue('작업A');
    expect(screen.getByText('수정일자')).toBeInTheDocument();
    expect(screen.getByText('수정자')).toBeInTheDocument();
  });
});
