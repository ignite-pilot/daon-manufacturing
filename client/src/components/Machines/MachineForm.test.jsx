/**
 * @jest-environment jsdom
 * PRD 기계: 필수(공장, 기계 이름), 선택(기계 소요시간, 기계 사진, 설명, 제조사 등), 수정일자·수정자
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MachineForm from './MachineForm';

describe('MachineForm (PRD 기계 정보)', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/factories')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      return Promise.reject(new Error('unknown'));
    });
  });

  it('필수 항목: 공장, 기계 이름 라벨과 기계 소요시간(선택) 라벨을 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/machines/new']}>
        <Routes>
          <Route path="/machines/new" element={<MachineForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('공장');
    expect(screen.getByText('기계 이름')).toBeInTheDocument();
    expect(screen.getByText(/기계 소요시간/)).toBeInTheDocument();
  });

  it('선택 항목: 기계 사진, 기계 설명, 제조사, AS 담당자, AS 연락처, 도입일시, 공장내 위치를 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/machines/new']}>
        <Routes>
          <Route path="/machines/new" element={<MachineForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('공장');
    expect(screen.getByText(/기계 사진/)).toBeInTheDocument();
    expect(screen.getByText(/기계 설명/)).toBeInTheDocument();
    expect(screen.getByText('제조사')).toBeInTheDocument();
    expect(screen.getByText('AS 담당자')).toBeInTheDocument();
    expect(screen.getByText('AS 연락처')).toBeInTheDocument();
    expect(screen.getByText('도입일시')).toBeInTheDocument();
    expect(screen.getByText('공장내 위치')).toBeInTheDocument();
  });

  it('수정 시 수정일자·수정자를 표시한다', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/factories')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/machines/1')) return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 1,
          factory_id: 1,
          name: '기계X',
          total_duration_sec: 1800,
          updated_at: '2026-03-13T00:00:00Z',
          updated_by: 'admin',
        }),
      });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter initialEntries={['/machines/1/edit']}>
        <Routes>
          <Route path="/machines/:id/edit" element={<MachineForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByDisplayValue('기계X');
    expect(screen.getByText('수정일자')).toBeInTheDocument();
    expect(screen.getByText('수정자')).toBeInTheDocument();
  });
});
