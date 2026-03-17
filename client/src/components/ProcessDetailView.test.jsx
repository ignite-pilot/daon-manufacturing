/**
 * @jest-environment jsdom
 * PRD 공정 상세: 필수(공장, 대상 완제품, 공정 이름, 전체 소요시간, 수정일자, 수정자) → 선택(공정 설명) → 세부 공정
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProcessDetailView from './ProcessDetailView';

jest.mock('../lib/api', () => ({
  apiFetch: (url) => {
    if (url.includes('/api/processes/1')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 1,
            factory_name: '테스트 공장',
            product_name: '완제품A',
            process_name: '공정이름',
            total_duration_sec: 5400,
            description: '설명',
            updated_at: '2026-03-13T00:00:00Z',
            updated_by: '홍길동',
            steps: [
              { work_name: '작업1', actual_duration_sec: 1800, description: '1단계' },
              { work_name: '작업2', actual_duration_sec: 3600, description: null },
            ],
          }),
      });
    }
    return Promise.resolve({ ok: false });
  },
}));

describe('ProcessDetailView (PRD 공정)', () => {
  it('필수 항목: 공장, 대상 완제품, 공정 이름, 전체 소요시간, 수정일자, 수정자를 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/processes/1']}>
        <Routes>
          <Route path="/processes/:id" element={<ProcessDetailView />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('공정이름');
    expect(screen.getByText('공장')).toBeInTheDocument();
    expect(screen.getByText('대상 완제품')).toBeInTheDocument();
    expect(screen.getByText('공정 이름')).toBeInTheDocument();
    expect(screen.getByText('테스트 공장')).toBeInTheDocument();
    expect(screen.getByText('완제품A')).toBeInTheDocument();
    expect(screen.getByText('5400')).toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
  });

  it('선택 항목: 공정 설명을 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/processes/1']}>
        <Routes>
          <Route path="/processes/:id" element={<ProcessDetailView />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('공정이름');
    expect(screen.getByText('공정 설명')).toBeInTheDocument();
    expect(screen.getByText('설명')).toBeInTheDocument();
  });

  it('세부 공정(작업 단계)을 순서대로 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/processes/1']}>
        <Routes>
          <Route path="/processes/:id" element={<ProcessDetailView />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('공정이름');
    expect(screen.getByText('세부 공정 (작업 단계)')).toBeInTheDocument();
    expect(screen.getByText('작업1')).toBeInTheDocument();
    expect(screen.getByText('작업2')).toBeInTheDocument();
  });

  it('수정 버튼을 제공한다', async () => {
    render(
      <MemoryRouter initialEntries={['/processes/1']}>
        <Routes>
          <Route path="/processes/:id" element={<ProcessDetailView />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('공정이름');
    expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument();
  });
});
