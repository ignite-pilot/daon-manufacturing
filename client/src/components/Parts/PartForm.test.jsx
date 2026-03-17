/**
 * @jest-environment jsdom
 * PRD 부품: 필수(공장, 부품 이름), 선택(부품 사진, 설명, 제조사, AS 담당자, AS 연락처), 수정일자·수정자
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PartForm from './PartForm';

describe('PartForm (PRD 부품 정보)', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/factories')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      return Promise.reject(new Error('unknown'));
    });
  });

  it('필수 항목: 공장, 부품 이름 라벨을 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/parts/new']}>
        <Routes>
          <Route path="/parts/new" element={<PartForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('공장');
    expect(screen.getByText('부품 이름')).toBeInTheDocument();
  });

  it('선택 항목: 부품 사진, 부품 설명, 제조사, AS 담당자, AS 연락처를 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/parts/new']}>
        <Routes>
          <Route path="/parts/new" element={<PartForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('공장');
    expect(screen.getByText(/부품 사진/)).toBeInTheDocument();
    expect(screen.getByText(/부품 설명/)).toBeInTheDocument();
    expect(screen.getByText('제조사')).toBeInTheDocument();
    expect(screen.getByText('AS 담당자')).toBeInTheDocument();
    expect(screen.getByText('AS 연락처')).toBeInTheDocument();
  });

  it('수정 시 수정일자·수정자를 표시한다', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/factories')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/parts/1')) return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 1,
          factory_id: 1,
          name: '부품X',
          updated_at: '2026-03-13T00:00:00Z',
          updated_by: 'admin',
        }),
      });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter initialEntries={['/parts/1/edit']}>
        <Routes>
          <Route path="/parts/:id/edit" element={<PartForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByDisplayValue('부품X');
    expect(screen.getByText('수정일자')).toBeInTheDocument();
    expect(screen.getByText('수정자')).toBeInTheDocument();
  });
});
