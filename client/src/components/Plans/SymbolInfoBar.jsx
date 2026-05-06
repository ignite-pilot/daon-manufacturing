import { useCallback } from 'react';

const CATEGORY_META = {
  STATION:   { bg: '#fff3e0', color: '#e65100', label: '스테이션' },
  CONVEYOR:  { bg: '#e3f2fd', color: '#1565c0', label: '컨베이어' },
  BUFFER:    { bg: '#e8f5e9', color: '#2e7d32', label: '버퍼'     },
  FOOTPATH:  { bg: '#f3e5f5', color: '#6a1b9a', label: '통로'     },
  UNDEFINED: { bg: '#f3f4f6', color: '#6b7280', label: '미분류'   },
};

/**
 * 도면 뷰어 하단에 overlay로 표시되는 심볼 정보 바.
 *
 * props:
 *   symbol     — selectedSymbol state ({ handle, data, svgCategory, svgFacility })
 *   isEditMode — 현재 편집 모드 여부
 *   onClose    — 닫기 버튼 핸들러 (부모에서 selectedSymbol 클리어 + EXIT_EDIT 전송)
 */
export default function SymbolInfoBar({ symbol, isEditMode, onClose }) {
  if (!symbol) return null;

  const category = symbol.data?.category || symbol.svgCategory || 'UNDEFINED';
  const legend   = symbol.data?.legend   ?? symbol.svgFacility  ?? null;
  const desc     = symbol.data?.description ?? null;
  const catMeta  = CATEGORY_META[category] ?? CATEGORY_META.UNDEFINED;

  return (
    <div className="symbol-info-bar">
      {/* 카테고리 배지 */}
      <span
        className="symbol-info-cat"
        style={{ background: catMeta.bg, color: catMeta.color }}
      >
        {catMeta.label}
      </span>

      {/* 핸들 */}
      <span className="symbol-info-handle">{symbol.handle}</span>

      {/* 범례 */}
      {legend && (
        <>
          <span className="symbol-info-sep">·</span>
          <span className="symbol-info-legend">{legend}</span>
        </>
      )}

      {/* 설명 */}
      {desc && (
        <>
          <span className="symbol-info-sep">·</span>
          <span className="symbol-info-desc">{desc}</span>
        </>
      )}

      {/* 편집 중 배지 */}
      {isEditMode && (
        <span className="symbol-info-editing">편집 중</span>
      )}

      {/* 닫기 */}
      <button type="button" className="symbol-info-close" onClick={onClose} title="닫기">
        ×
      </button>
    </div>
  );
}
