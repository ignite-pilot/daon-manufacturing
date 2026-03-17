/**
 * @jest-environment jsdom
 * PRD 제조 공장 상세: 필수(공장 이름, 주소, 수정일자, 수정자) → 선택(공장 설명, 면적, CAD 파일)
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import FactoryDetailView from './FactoryDetailView';

jest.mock('../../lib/api', () => ({
  apiFetch: (url) => {
    if (url.includes('/api/factories/1')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 1,
            name: '테스트 공장',
            address: '서울시 강남구',
            address_detail: '101동',
            description: '설명',
            area: 200,
            cad_file_path: '/cad.dwg',
            updated_at: '2026-03-13T00:00:00Z',
            updated_by: '홍길동',
          }),
      });
    }
    return Promise.resolve({ ok: false });
  },
}));

describe('FactoryDetailView (PRD 공장 정보)', () => {
  it('필수 항목 순서: 공장 이름, 주소, 수정일자, 수정자를 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/factories/1']}>
        <Routes>
          <Route path="/factories/:id" element={<FactoryDetailView />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('테스트 공장');
    expect(screen.getByText('공장 이름')).toBeInTheDocument();
    expect(screen.getByText('주소')).toBeInTheDocument();
    expect(screen.getByText('테스트 공장')).toBeInTheDocument();
    expect(screen.getByText('서울시 강남구 101동')).toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
  });

  it('선택 항목: 공장 설명, 면적, CAD 파일을 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/factories/1']}>
        <Routes>
          <Route path="/factories/:id" element={<FactoryDetailView />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('테스트 공장');
    expect(screen.getByText('공장 설명')).toBeInTheDocument();
    expect(screen.getByText('면적')).toBeInTheDocument();
    expect(screen.getByText('CAD 파일')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('/cad.dwg')).toBeInTheDocument();
  });

  it('수정 버튼을 제공한다', async () => {
    render(
      <MemoryRouter initialEntries={['/factories/1']}>
        <Routes>
          <Route path="/factories/:id" element={<FactoryDetailView />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('테스트 공장');
    expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument();
  });
});
