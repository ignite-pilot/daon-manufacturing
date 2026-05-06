import { useState, useEffect, useRef } from 'react';

const CATEGORY_OPTIONS = [
  { value: 'STATION',   label: '스테이션 (STATION)'  },
  { value: 'CONVEYOR',  label: '컨베이어 (CONVEYOR)' },
  { value: 'BUFFER',    label: '버퍼 (BUFFER)'        },
  { value: 'FOOTPATH',  label: '통로 (FOOTPATH)'      },
  { value: 'UNDEFINED', label: '미분류 (UNDEFINED)'   },
];

const EMPTY_FORM = {
  category:     'UNDEFINED',
  description:  '',
  legend:       '',
  annotation_id: '',   // 5-4에서 select로 전환
  center_x:     '',
  center_y:     '',
  width:        '',
  height:       '',
};

function toFormCoords(d) {
  return {
    center_x: d?.center_x != null ? String(parseFloat(d.center_x).toFixed(2)) : '',
    center_y: d?.center_y != null ? String(parseFloat(d.center_y).toFixed(2)) : '',
    width:    d?.width    != null ? String(parseFloat(d.width).toFixed(2))    : '',
    height:   d?.height   != null ? String(parseFloat(d.height).toFixed(2))   : '',
  };
}

/**
 * 도면 뷰어 우측 overlay 편집 패널.
 * isEditMode && selectedSymbol 일 때 렌더된다.
 *
 * props:
 *   symbol      — selectedSymbol state
 *   facilityLegend — 범례 목록 (5-4에서 전달); 현재는 []
 *   annotations    — 주석 목록 (5-4에서 전달); 현재는 []
 *   onClose  — 닫기 (handleCloseEditPanel)
 *   onSave   — 저장 (handleSymbolSave) — 5-5에서 연결
 *   onDelete — 삭제 (handleSymbolDelete) — 5-5에서 연결
 */
export default function SymbolEditPanel({
  symbol,
  facilityLegend = [],
  annotations    = [],
  onClose,
  onSave,
  onDelete,
}) {
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState(null);

  // handle이 바뀌면 전체 리셋; data만 바뀌면 좌표만 업데이트 (편집 중인 텍스트 보존)
  const prevHandleRef = useRef(null);
  useEffect(() => {
    if (!symbol) { prevHandleRef.current = null; return; }
    const d = symbol.data;
    const handleChanged = prevHandleRef.current !== symbol.handle;
    prevHandleRef.current = symbol.handle;

    if (handleChanged) {
      setForm({
        category:     d?.category    || symbol.svgCategory || 'UNDEFINED',
        description:  d?.description ?? '',
        legend:       d?.legend      ?? (symbol.svgFacility || ''),
        annotation_id: d?.annotation_id != null ? String(d.annotation_id) : '',
        ...toFormCoords(d),
      });
      setError(null);
    } else {
      // 드래그·리사이즈 자동저장으로 인한 data 업데이트 → 좌표만 반영
      setForm(prev => ({ ...prev, ...toFormCoords(d) }));
    }
  }, [symbol?.handle, symbol?.data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!symbol) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSave = async () => {
    if (!onSave) return;
    setError(null);
    setSaving(true);
    try {
      await onSave(buildBody());
    } catch (e) {
      setError(e.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm(`"${symbol.handle}" 오버라이드를 삭제하고 원래 분석값으로 되돌리겠습니까?`)) return;
    setError(null);
    setDeleting(true);
    try {
      await onDelete(symbol.handle);
    } catch (e) {
      setError(e.message || '삭제 실패');
    } finally {
      setDeleting(false);
    }
  };

  function buildBody() {
    return {
      handle:        symbol.handle,
      category:      form.category      || 'UNDEFINED',
      description:   form.description.trim()   || null,
      legend:        form.legend.trim()         || null,
      annotation_id: form.annotation_id !== ''
        ? parseInt(form.annotation_id, 10) : null,
      center_x: form.center_x !== '' ? parseFloat(form.center_x) : null,
      center_y: form.center_y !== '' ? parseFloat(form.center_y) : null,
      width:    form.width    !== '' ? parseFloat(form.width)    : null,
      height:   form.height   !== '' ? parseFloat(form.height)   : null,
    };
  }

  const hasOverride = !!symbol.data;
  const busy = saving || deleting;

  return (
    <div className="symbol-edit-panel">
      {/* 헤더 */}
      <div className="symbol-edit-panel-header">
        <span className="symbol-edit-panel-title">심볼 편집</span>
        <span className="symbol-edit-panel-handle">{symbol.handle}</span>
        <button type="button" className="symbol-edit-panel-close" onClick={onClose} title="닫기">×</button>
      </div>

      {/* 본문 */}
      <div className="symbol-edit-panel-body">
        <p className="symbol-edit-hint">
          드래그·리사이즈로 직접 편집하거나 아래 값을 수정하세요.
        </p>

        {/* 분류 */}
        <section className="symbol-edit-section">
          <h3 className="symbol-edit-section-title">분류</h3>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="symbol-edit-input symbol-edit-select"
            disabled={busy}
          >
            {CATEGORY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </section>

        {/* 범례 */}
        <section className="symbol-edit-section">
          <h3 className="symbol-edit-section-title">범례</h3>
          {/* 5-4에서 facilityLegend 목록이 오면 <select>로 전환 */}
          {facilityLegend.length > 0 ? (
            <select
              name="legend"
              value={form.legend}
              onChange={handleChange}
              className="symbol-edit-input symbol-edit-select"
              disabled={busy}
            >
              <option value="">— 선택 안 함 —</option>
              {facilityLegend.map((item, i) => (
                <option key={i} value={item.name ?? item}>{item.name ?? item}</option>
              ))}
            </select>
          ) : (
            <input
              type="text" name="legend" value={form.legend}
              onChange={handleChange} className="symbol-edit-input"
              placeholder="범례 이름" disabled={busy}
            />
          )}
        </section>

        {/* 설명 */}
        <section className="symbol-edit-section">
          <h3 className="symbol-edit-section-title">설명</h3>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="symbol-edit-input symbol-edit-textarea"
            placeholder="심볼 설명 (선택)"
            rows={3}
            disabled={busy}
          />
        </section>

        {/* 주석 — 5-4에서 annotations 목록이 오면 <select>로 전환 */}
        {annotations.length > 0 && (
          <section className="symbol-edit-section">
            <h3 className="symbol-edit-section-title">주석</h3>
            <select
              name="annotation_id"
              value={form.annotation_id}
              onChange={handleChange}
              className="symbol-edit-input symbol-edit-select"
              disabled={busy}
            >
              <option value="">— 연결 없음 —</option>
              {annotations.map(a => (
                <option key={a.id} value={String(a.id)}>
                  {a.title ?? `주석 #${a.id}`}
                </option>
              ))}
            </select>
          </section>
        )}

        {/* 위치 */}
        <section className="symbol-edit-section">
          <h3 className="symbol-edit-section-title">위치</h3>
          <div className="symbol-edit-row">
            <label className="symbol-edit-label">중심 X</label>
            <input type="number" name="center_x" value={form.center_x}
              onChange={handleChange} className="symbol-edit-input"
              placeholder="—" step="0.01" disabled={busy} />
          </div>
          <div className="symbol-edit-row">
            <label className="symbol-edit-label">중심 Y</label>
            <input type="number" name="center_y" value={form.center_y}
              onChange={handleChange} className="symbol-edit-input"
              placeholder="—" step="0.01" disabled={busy} />
          </div>
        </section>

        {/* 크기 */}
        <section className="symbol-edit-section">
          <h3 className="symbol-edit-section-title">크기</h3>
          <div className="symbol-edit-row">
            <label className="symbol-edit-label">너비</label>
            <input type="number" name="width" value={form.width}
              onChange={handleChange} className="symbol-edit-input"
              placeholder="—" step="0.01" min="1" disabled={busy} />
          </div>
          <div className="symbol-edit-row">
            <label className="symbol-edit-label">높이</label>
            <input type="number" name="height" value={form.height}
              onChange={handleChange} className="symbol-edit-input"
              placeholder="—" step="0.01" min="1" disabled={busy} />
          </div>
        </section>

        {error && <p className="symbol-edit-error">{error}</p>}
      </div>

      {/* 푸터 */}
      <div className="symbol-edit-panel-footer">
        {hasOverride && (
          <button type="button" className="btn-outline"
            style={{ fontSize: '0.8125rem', color: '#dc2626', borderColor: '#fca5a5' }}
            onClick={handleDelete} disabled={busy}>
            {deleting ? '삭제 중…' : '초기화'}
          </button>
        )}
        <button type="button" className="btn-outline" style={{ fontSize: '0.8125rem' }}
          onClick={onClose} disabled={busy}>
          닫기
        </button>
        <button type="button" className="btn-primary" style={{ fontSize: '0.8125rem' }}
          onClick={handleSave} disabled={busy || !onSave}>
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  );
}
