/**
 * @jest-environment jsdom
 * 목록 + 레이어 팝업: 목록만 보이는 경로 vs 팝업이 열리는 경로
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ListWithLayerPopup from './ListWithLayerPopup';

const MockList = () => <div data-testid="list">목록 페이지</div>;
const MockForm = ({ inModal }) => <div data-testid="form">폼 {inModal ? '(팝업)' : ''}</div>;
const MockDetail = ({ inModal }) => <div data-testid="detail">상세 {inModal ? '(팝업)' : ''}</div>;

function renderWithRoute(initialPath) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="factories/*"
          element={
            <ListWithLayerPopup
              basePath="factories"
              ListComponent={MockList}
              FormComponent={MockForm}
              DetailComponent={MockDetail}
              titleAdd="공장 등록"
              titleView="공장 보기"
              titleEdit="공장 수정"
            />
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ListWithLayerPopup', () => {
  it('경로가 /factories일 때 목록만 보이고 팝업은 없다', () => {
    renderWithRoute('/factories');
    expect(screen.getByTestId('list')).toBeInTheDocument();
    expect(screen.queryByTestId('form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('detail')).not.toBeInTheDocument();
    expect(screen.queryByText('공장 등록')).not.toBeInTheDocument();
  });

  it('경로가 /factories/new일 때 목록과 팝업(등록)을 보여준다', () => {
    renderWithRoute('/factories/new');
    expect(screen.getByTestId('list')).toBeInTheDocument();
    expect(screen.getByText('공장 등록')).toBeInTheDocument();
    expect(screen.getByTestId('form')).toBeInTheDocument();
    expect(screen.getByTestId('form')).toHaveTextContent('폼 (팝업)');
  });

  it('경로가 /factories/1일 때 목록과 팝업(보기)을 보여준다', () => {
    renderWithRoute('/factories/1');
    expect(screen.getByTestId('list')).toBeInTheDocument();
    expect(screen.getByText('공장 보기')).toBeInTheDocument();
    expect(screen.getByTestId('detail')).toBeInTheDocument();
    expect(screen.getByTestId('detail')).toHaveTextContent('상세 (팝업)');
  });

  it('경로가 /factories/1/edit일 때 목록과 팝업(수정)을 보여준다', () => {
    renderWithRoute('/factories/1/edit');
    expect(screen.getByTestId('list')).toBeInTheDocument();
    expect(screen.getByText('공장 수정')).toBeInTheDocument();
    expect(screen.getByTestId('form')).toBeInTheDocument();
    expect(screen.getByTestId('form')).toHaveTextContent('폼 (팝업)');
  });

  it('팝업이 열릴 때 레이어 팝업 오버레이가 있다', () => {
    const { container } = renderWithRoute('/factories/new');
    const overlay = container.querySelector('.layer-popup-overlay');
    expect(overlay).toBeInTheDocument();
  });
});
