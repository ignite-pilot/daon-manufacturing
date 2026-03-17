/**
 * @jest-environment jsdom
 * PRD 부품 상세: 필수→선택→부품 사용하는 기계/작업/공정 리스트
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PartDetailView from './PartDetailView';

jest.mock('../lib/api', () => ({
  apiFetch: (url) => {
    if (url.includes('/api/parts/1')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 1,
            factory_name: '테스트 공장',
            name: '테스트 부품',
            updated_at: '2026-03-13T00:00:00Z',
            updated_by: '홍길동',
            photo_url: null,
            description: '',
            manufacturer: '',
            as_contact: '',
            as_phone: '',
            used_machines: [{ machine_id: 1, machine_name: '기계1' }],
            used_works: [{ work_id: 2, work_name: '작업1' }],
            used_processes: [{ process_id: 10, process_name: '공정A' }],
          }),
      });
    }
    return Promise.resolve({ ok: false });
  },
}));

describe('PartDetailView (PRD 부품)', () => {
  it('필수 항목: 공장, 부품 이름, 수정일자, 수정자를 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/parts/1']}>
        <Routes>
          <Route path="/parts/:id" element={<PartDetailView />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('테스트 부품');
    expect(screen.getByText('공장')).toBeInTheDocument();
    expect(screen.getByText('부품 이름')).toBeInTheDocument();
    expect(screen.getByText('테스트 공장')).toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
  });

  it('부품 사용하는 기계/작업/공정 리스트를 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/parts/1']}>
        <Routes>
          <Route path="/parts/:id" element={<PartDetailView />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('테스트 부품');
    expect(screen.getByText('부품 사용하는 기계 리스트')).toBeInTheDocument();
    expect(screen.getByText('부품 사용하는 작업 리스트')).toBeInTheDocument();
    expect(screen.getByText('부품 사용하는 공정 리스트')).toBeInTheDocument();
    expect(screen.getByText('기계1')).toBeInTheDocument();
    expect(screen.getByText('작업1')).toBeInTheDocument();
    expect(screen.getByText('공정A')).toBeInTheDocument();
  });

  it('수정 버튼을 제공한다', async () => {
    render(
      <MemoryRouter initialEntries={['/parts/1']}>
        <Routes>
          <Route path="/parts/:id" element={<PartDetailView />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('테스트 부품');
    expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument();
  });
});
