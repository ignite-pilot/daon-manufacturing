/**
 * bnk-mes 스타일 레이어 팝업 (등록/수정/보기용)
 * - 보기 모드(hideTitle): 제목은 카드 안에만 표시 (원자재 보기 UI)
 * - 오버레이 클릭 시 닫기, 내부 클릭 시 유지
 */
export default function LayerPopup({ title, children, onClose, maxWidth = 520, maxHeight, height, hideTitle = false, 'aria-labelledby': ariaLabelledBy }) {
  const modalStyle = {
    ...(maxWidth ? { maxWidth: `${maxWidth}px` } : {}),
    ...(maxHeight != null ? { maxHeight: typeof maxHeight === 'string' ? maxHeight : `${maxHeight}px` } : {}),
    ...(height != null ? { height: typeof height === 'string' ? height : `${height}px` } : {}),
  };
  return (
    <div
      className="layer-popup-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`layer-popup-modal ${hideTitle ? 'layer-popup-view' : ''} ${height != null ? 'layer-popup-modal-fixed-height' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy || undefined}
        style={Object.keys(modalStyle).length ? modalStyle : undefined}
      >
        {title && !hideTitle && (
          <h2 id={ariaLabelledBy} className="layer-popup-title">
            {title}
          </h2>
        )}
        <div className="layer-popup-body">
          {children}
        </div>
      </div>
    </div>
  );
}
