/**
 * @jest-environment jsdom
 * 사용 부품 선택 팝업: 이중 목록(부품 목록 ↔ 사용 부품), 이동 버튼, 확인/취소
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PartSelectPopup from './PartSelectPopup';

describe('PartSelectPopup', () => {
  const parts = [
    { id: 1, name: '부품A' },
    { id: 2, name: '부품B' },
    { id: 3, name: '볼트' },
  ];
  const onConfirm = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    onConfirm.mockClear();
    onClose.mockClear();
  });

  it('제목과 검색 입력, 부품 목록/사용 부품 영역을 렌더링한다', () => {
    render(
      <PartSelectPopup parts={parts} selectedIds={[]} onConfirm={onConfirm} onClose={onClose} />
    );
    expect(screen.getByText('사용 부품 선택')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('부품명 검색...')).toBeInTheDocument();
    expect(screen.getByText('부품 목록')).toBeInTheDocument();
    expect(screen.getByText('사용 부품')).toBeInTheDocument();
    expect(screen.getByText('부품A')).toBeInTheDocument();
    expect(screen.getByText('부품B')).toBeInTheDocument();
    expect(screen.getByText('볼트')).toBeInTheDocument();
  });

  it('검색어 입력 시 왼쪽 목록에 해당 이름이 포함된 부품만 표시한다', () => {
    render(
      <PartSelectPopup parts={parts} selectedIds={[]} onConfirm={onConfirm} onClose={onClose} />
    );
    const search = screen.getByPlaceholderText('부품명 검색...');
    fireEvent.change(search, { target: { value: '부품' } });
    expect(screen.getByText('부품A')).toBeInTheDocument();
    expect(screen.getByText('부품B')).toBeInTheDocument();
    expect(screen.queryByText('볼트')).not.toBeInTheDocument();
  });

  it('왼쪽에서 선택 후 이동 버튼으로 사용 부품에 추가하고 확인 시 onConfirm 호출', () => {
    render(
      <PartSelectPopup parts={parts} selectedIds={[1]} onConfirm={onConfirm} onClose={onClose} />
    );
    fireEvent.click(screen.getByText('부품B'));
    fireEvent.click(screen.getByRole('button', { name: '사용 부품으로 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(onConfirm).toHaveBeenCalledWith([1, 2]);
    expect(onClose).toHaveBeenCalled();
  });

  it('취소 클릭 시 onClose만 호출하고 onConfirm은 호출하지 않는다', () => {
    render(
      <PartSelectPopup parts={parts} selectedIds={[]} onConfirm={onConfirm} onClose={onClose} />
    );
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('왼쪽에서 여러 부품을 이동한 뒤 확인 시 모든 id를 onConfirm에 넘긴다', () => {
    render(
      <PartSelectPopup parts={parts} selectedIds={[]} onConfirm={onConfirm} onClose={onClose} />
    );
    fireEvent.click(screen.getByText('부품A'));
    fireEvent.click(screen.getByRole('button', { name: '사용 부품으로 추가' }));
    fireEvent.click(screen.getByText('부품B'));
    fireEvent.click(screen.getByRole('button', { name: '사용 부품으로 추가' }));
    fireEvent.click(screen.getByText('볼트'));
    fireEvent.click(screen.getByRole('button', { name: '사용 부품으로 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(onConfirm).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('오른쪽 사용 부품에서 선택 후 제거 버튼으로 취소(왼쪽으로 이동)한다', () => {
    render(
      <PartSelectPopup parts={parts} selectedIds={[1, 2]} onConfirm={onConfirm} onClose={onClose} />
    );
    fireEvent.click(screen.getByText('부품B'));
    fireEvent.click(screen.getByRole('button', { name: '선택 취소(제거)' }));
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(onConfirm).toHaveBeenCalledWith([1]);
    expect(onClose).toHaveBeenCalled();
  });
});
