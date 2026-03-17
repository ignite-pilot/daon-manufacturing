/**
 * @jest-environment jsdom
 * PRD 기계 상세: 필수→선택→기계 사용하는 작업/공정 리스트
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MachineDetailView from './MachineDetailView';

jest.mock('../lib/api', () => ({
  apiFetch: (url) => {
    if (url.includes('/api/machines/1')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 1,
            factory_name: '테스트 공장',
            name: '테스트 기계',
            total_duration_sec: 2700,
            updated_at: '2026-03-13T00:00:00Z',
            updated_by: '홍길동',
            photo_url: null,
            description: '',
            manufacturer: '',
            as_contact: '',
            as_phone: '',
            introduced_at: null,
            location_in_factory: '',
            used_works: [{ work_id: 1, work_name: '작업1' }],
            used_processes: [{ process_id: 10, process_name: '공정A' }],
          }),
      });
    }
    if (url.includes('/api/machines/2')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 2,
            factory_name: '공장2',
            name: '기계만',
            total_duration_sec: null,
            updated_at: '2026-03-13T00:00:00Z',
            updated_by: '김수정',
            photo_url: null,
            description: '',
            manufacturer: '',
            as_contact: '',
            as_phone: '',
            introduced_at: null,
            location_in_factory: '',
            used_works: [],
            used_processes: [],
          }),
      });
    }
    return Promise.resolve({ ok: false });
  },
}));

describe('MachineDetailView (PRD 기계)', () => {
  it('필수 항목: 공장, 기계 이름, 수정일자, 수정자와 기계 소요시간(선택)을 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/machines/1']}>
        <Routes>
          <Route path="/machines/:id" element={<MachineDetailView />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('테스트 기계');
    expect(screen.getByText('공장')).toBeInTheDocument();
    expect(screen.getByText('기계 이름')).toBeInTheDocument();
    expect(screen.getByText('기계 소요시간')).toBeInTheDocument();
    expect(screen.getByText('테스트 공장')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
  });

  it('기계 사용하는 작업 리스트와 공정 리스트를 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/machines/1']}>
        <Routes>
          <Route path="/machines/:id" element={<MachineDetailView />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('테스트 기계');
    expect(screen.getByText('기계 사용하는 작업 리스트')).toBeInTheDocument();
    expect(screen.getByText('기계 사용하는 공정 리스트')).toBeInTheDocument();
    expect(screen.getByText('작업1')).toBeInTheDocument();
    expect(screen.getByText('공정A')).toBeInTheDocument();
  });

  it('수정 버튼을 제공한다', async () => {
    render(
      <MemoryRouter initialEntries={['/machines/1']}>
        <Routes>
          <Route path="/machines/:id" element={<MachineDetailView />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('테스트 기계');
    expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument();
  });

  it('사용 작업/공정 리스트가 없을 때 하단 빈 영역을 렌더하지 않는다', async () => {
    render(
      <MemoryRouter initialEntries={['/machines/2']}>
        <Routes>
          <Route path="/machines/:id" element={<MachineDetailView />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('기계만');
    expect(screen.queryByText('기계 사용하는 작업 리스트')).not.toBeInTheDocument();
    expect(screen.queryByText('기계 사용하는 공정 리스트')).not.toBeInTheDocument();
    expect(screen.getByText('수정자')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument();
  });
});
