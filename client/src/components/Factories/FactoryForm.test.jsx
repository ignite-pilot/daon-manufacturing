/**
 * @jest-environment jsdom
 * PRD 제조 공장: 필수(공장 이름, 주소), 선택(공장 설명, 면적, CAD 파일), 수정 시 수정일자/수정자 표시
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import FactoryForm from './FactoryForm';

jest.mock('../../lib/daum-postcode', () => ({
  openDaumPostcode: () => Promise.resolve({ address: '', zonecode: '' }),
}));

describe('FactoryForm (PRD 공장 정보)', () => {
  it('등록 시 필수 항목: 공장 이름, 주소 라벨을 표시한다', () => {
    render(
      <MemoryRouter initialEntries={['/factories/new']}>
        <Routes>
          <Route path="/factories/new" element={<FactoryForm />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('공장 이름')).toBeInTheDocument();
    expect(screen.getByText(/^주소/)).toBeInTheDocument();
  });

  it('선택 항목: 공장 설명, 면적, CAD 파일 라벨을 표시한다', () => {
    render(
      <MemoryRouter initialEntries={['/factories/new']}>
        <Routes>
          <Route path="/factories/new" element={<FactoryForm />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/공장 설명/)).toBeInTheDocument();
    expect(screen.getByText(/면적/)).toBeInTheDocument();
    expect(screen.getByText(/CAD 파일/)).toBeInTheDocument();
  });

  it('수정 시 수정일자·수정자를 표시한다', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 1,
          name: '공장',
          address: '주소',
          zip_code: '',
          address_detail: '',
          description: '',
          area: null,
          cad_file_path: '',
          updated_at: '2026-03-13T00:00:00Z',
          updated_by: 'admin',
        }),
    });
    render(
      <MemoryRouter initialEntries={['/factories/1/edit']}>
        <Routes>
          <Route path="/factories/:id/edit" element={<FactoryForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByDisplayValue('공장');
    expect(screen.getByText('수정일자')).toBeInTheDocument();
    expect(screen.getByText('수정자')).toBeInTheDocument();
  });
});
