/**
 * @jest-environment jsdom
 * bnk-mes 스타일 레이어 팝업: 오버레이/모달/타이틀 렌더, 오버레이 클릭 시 onClose 호출
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LayerPopup from './LayerPopup';

describe('LayerPopup (bnk-mes layer popup)', () => {
  it('title과 children을 렌더링한다', () => {
    render(
      <LayerPopup title="테스트 제목" onClose={() => {}}>
        <p>팝업 내용</p>
      </LayerPopup>
    );
    expect(screen.getByText('테스트 제목')).toBeInTheDocument();
    expect(screen.getByText('팝업 내용')).toBeInTheDocument();
  });

  it('title이 없어도 children만 렌더링한다', () => {
    render(
      <LayerPopup onClose={() => {}}>
        <span data-testid="body">본문</span>
      </LayerPopup>
    );
    expect(screen.getByTestId('body')).toHaveTextContent('본문');
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
  });

  it('오버레이에 layer-popup-overlay 클래스를 적용한다', () => {
    const { container } = render(
      <LayerPopup title="제목" onClose={() => {}}>
        <div />
      </LayerPopup>
    );
    const overlay = container.querySelector('.layer-popup-overlay');
    expect(overlay).toBeInTheDocument();
  });

  it('모달에 layer-popup-modal 클래스를 적용한다', () => {
    const { container } = render(
      <LayerPopup title="제목" onClose={() => {}}>
        <div />
      </LayerPopup>
    );
    const modal = container.querySelector('.layer-popup-modal');
    expect(modal).toBeInTheDocument();
  });

  it('오버레이 클릭 시 onClose를 호출한다', () => {
    const onClose = jest.fn();
    const { container } = render(
      <LayerPopup title="제목" onClose={onClose}>
        <div data-testid="inner">내용</div>
      </LayerPopup>
    );
    const overlay = container.querySelector('.layer-popup-overlay');
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('모달 내부 클릭 시 onClose를 호출하지 않는다', () => {
    const onClose = jest.fn();
    render(
      <LayerPopup title="제목" onClose={onClose}>
        <div data-testid="inner">내용</div>
      </LayerPopup>
    );
    fireEvent.click(screen.getByTestId('inner'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('maxWidth를 적용하면 모달 스타일에 반영한다', () => {
    const { container } = render(
      <LayerPopup title="제목" onClose={() => {}} maxWidth={600}>
        <div />
      </LayerPopup>
    );
    const modal = container.querySelector('.layer-popup-modal');
    expect(modal).toHaveStyle({ maxWidth: '600px' });
  });

  it('height를 전달하면 모달 높이가 고정되고 layer-popup-modal-fixed-height 클래스가 적용된다', () => {
    const { container } = render(
      <LayerPopup title="제목" onClose={() => {}} height="85vh">
        <div />
      </LayerPopup>
    );
    const modal = container.querySelector('.layer-popup-modal');
    expect(modal).toHaveStyle({ height: '85vh' });
    expect(modal).toHaveClass('layer-popup-modal-fixed-height');
  });

  it('role="dialog"와 aria-modal="true"를 모달에 지정한다', () => {
    const { container } = render(
      <LayerPopup title="제목" onClose={() => {}} aria-labelledby="popup-title">
        <div />
      </LayerPopup>
    );
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'popup-title');
  });
});
