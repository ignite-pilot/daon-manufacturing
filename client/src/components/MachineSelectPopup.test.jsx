/**
 * @jest-environment jsdom
 * 사용 기계 선택 팝업: 이중 목록(기계 목록 ↔ 사용 기계), 검색, 화살표 이동, 확인/취소
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MachineSelectPopup from './MachineSelectPopup';

describe('MachineSelectPopup', () => {
  const machines = [
    { id: 1, name: '기계A' },
    { id: 2, name: '기계B' },
    { id: 3, name: '용접기' },
  ];
  const onConfirm = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    onConfirm.mockClear();
    onClose.mockClear();
  });

  it('제목과 검색 입력, 기계 목록·사용 기계 영역을 렌더링한다', () => {
    render(
      <MachineSelectPopup machines={machines} selectedIds={[]} onConfirm={onConfirm} onClose={onClose} />
    );
    expect(screen.getByText('사용 기계 선택')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('기계명 검색...')).toBeInTheDocument();
    expect(screen.getByText('기계 목록')).toBeInTheDocument();
    expect(screen.getByText(/사용 기계/)).toBeInTheDocument();
    expect(screen.getByText('기계A')).toBeInTheDocument();
    expect(screen.getByText('기계B')).toBeInTheDocument();
    expect(screen.getByText('용접기')).toBeInTheDocument();
  });

  it('검색어 입력 시 왼쪽 목록에 해당 이름이 포함된 기계만 표시한다', () => {
    render(
      <MachineSelectPopup machines={machines} selectedIds={[]} onConfirm={onConfirm} onClose={onClose} />
    );
    const search = screen.getByPlaceholderText('기계명 검색...');
    fireEvent.change(search, { target: { value: '기계' } });
    expect(screen.getByText('기계A')).toBeInTheDocument();
    expect(screen.getByText('기계B')).toBeInTheDocument();
    expect(screen.queryByText('용접기')).not.toBeInTheDocument();
  });

  it('왼쪽에서 기계 선택 후 → 로 추가하고 확인 시 선택 id 배열을 onConfirm으로 넘긴다', () => {
    render(
      <MachineSelectPopup machines={machines} selectedIds={[1]} onConfirm={onConfirm} onClose={onClose} />
    );
    const leftList = screen.getByText('기계 목록').closest('div').nextElementSibling;
    const 기계B = leftList.querySelector('li');
    fireEvent.click(기계B);
    fireEvent.click(screen.getByRole('button', { name: '사용 기계로 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(onConfirm).toHaveBeenCalledWith([1, 2]);
    expect(onClose).toHaveBeenCalled();
  });

  it('취소 클릭 시 onClose만 호출하고 onConfirm은 호출하지 않는다', () => {
    render(
      <MachineSelectPopup machines={machines} selectedIds={[]} onConfirm={onConfirm} onClose={onClose} />
    );
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('왼쪽에서 여러 기계 선택 후 → 로 모두 추가하고 확인 시 모든 id를 onConfirm에 넘긴다', () => {
    render(
      <MachineSelectPopup machines={machines} selectedIds={[]} onConfirm={onConfirm} onClose={onClose} />
    );
    const leftList = screen.getByText('기계 목록').closest('div').nextElementSibling;
    const items = leftList.querySelectorAll('li');
    fireEvent.click(items[0]);
    fireEvent.click(items[1]);
    fireEvent.click(items[2]);
    fireEvent.click(screen.getByRole('button', { name: '사용 기계로 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(onConfirm).toHaveBeenCalledWith([1, 2, 3]);
  });
});
