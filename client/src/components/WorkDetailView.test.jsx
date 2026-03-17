/**
 * @jest-environment jsdom
 * PRD 작업 상세: 필수, 사용 부품·기계, 적용된 공정 리스트
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import WorkDetailView from './WorkDetailView';

jest.mock('../lib/api', () => ({
  apiFetch: (url) => {
    if (url.includes('/api/works/1')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 1,
            name: '테스트 작업',
            estimated_duration_sec: 2700,
            work_type: '조립',
            part_ids: [1],
            machine_ids: [2],
            updated_at: '2026-03-13T00:00:00Z',
            updated_by: '홍길동',
            steps: [
              { step_name: '1단계', duration_min: 20, part_ids: [1], machine_ids: [], description: null },
            ],
            applied_processes: [{ process_id: 10, process_name: '공정A' }],
          }),
      });
    }
    if (url.includes('/api/parts')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [{ id: 1, name: '부품1' }] }) });
    }
    if (url.includes('/api/machines')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [{ id: 2, name: '기계1' }] }) });
    }
    return Promise.resolve({ ok: false });
  },
}));

describe('WorkDetailView (PRD 작업)', () => {
  it('필수 항목: 작업 이름, 예상 소요시간, 작업 Type, 수정일자, 수정자를 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/works/1']}>
        <Routes>
          <Route path="/works/:id" element={<WorkDetailView />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('테스트 작업');
    expect(screen.getByText('작업 이름')).toBeInTheDocument();
    expect(screen.getByText('예상 소요시간')).toBeInTheDocument();
    expect(screen.getByText('작업 Type')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('조립')).toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
  });

  it('사용 부품, 사용 기계를 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/works/1']}>
        <Routes>
          <Route path="/works/:id" element={<WorkDetailView />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('테스트 작업');
    expect(screen.getByText('사용 부품')).toBeInTheDocument();
    expect(screen.getByText('사용 기계')).toBeInTheDocument();
  });

  it('적용된 공정 리스트를 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/works/1']}>
        <Routes>
          <Route path="/works/:id" element={<WorkDetailView />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('테스트 작업');
    expect(screen.getByText('적용된 공정 리스트')).toBeInTheDocument();
    expect(screen.getByText('공정A')).toBeInTheDocument();
  });

  it('수정 버튼을 제공한다', async () => {
    render(
      <MemoryRouter initialEntries={['/works/1']}>
        <Routes>
          <Route path="/works/:id" element={<WorkDetailView />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('테스트 작업');
    expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument();
  });

  it('id를 prop으로 받을 때(팝업용) 상세를 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/works']}>
        <WorkDetailView id="1" inModal onClose={() => {}} title="작업 보기" />
      </MemoryRouter>
    );
    await screen.findByText('테스트 작업');
    expect(screen.getByText('작업 보기')).toBeInTheDocument();
    expect(screen.getByText('작업 이름')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument();
  });
});
