import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../lib/api';

const CATEGORY_OPTIONS = [
  { value: 'STATION',   label: '스테이션 (STATION)'  },
  { value: 'CONVEYOR',  label: '컨베이어 (CONVEYOR)' },
  { value: 'BUFFER',    label: '버퍼 (BUFFER)'        },
  { value: 'SOURCE',    label: '소스 (SOURCE)'        },
  { value: 'DRAIN',     label: '드레인 (DRAIN)'       },
  { value: 'FOOTPATH',  label: '통로 (FOOTPATH)'      },
  { value: 'UNDEFINED', label: '미분류 (UNDEFINED)'   },
];

const WORK_CATEGORIES = new Set(['STATION', 'CONVEYOR', 'BUFFER', 'SOURCE', 'DRAIN']);
const WORK_PAGE_SIZE  = 20;

const EMPTY_FORM = {
  category:     'UNDEFINED',
  description:  '',
  legend:       '',
  annotation_id: '',
  work_id:      '',
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
 * 작업 검색·선택 컴포넌트.
 * - 서버 페이징: GET /api/works?workName=&page=&pageSize=20
 * - 열릴 때 1페이지 fetch, 스크롤 하단 도달 시 다음 페이지 append
 * - 검색어 입력(300ms debounce): 1페이지부터 다시 fetch
 * - 선택된 작업이 있을 경우 최초 1회 GET /api/works/:id 로 표시 이름 조회
 */
function WorkSearchSelect({ value, onChange, disabled }) {
  const [open,         setOpen]         = useState(false);
  const [search,       setSearch]       = useState('');
  const [items,        setItems]        = useState([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [selectedWork, setSelectedWork] = useState(null);

  const wrapRef     = useRef(null);
  const inputRef    = useRef(null);
  const listRef     = useRef(null);
  const debounceRef = useRef(null);
  // 스크롤 핸들러의 stale closure를 피하기 위한 refs
  const loadingRef  = useRef(false);
  const pageRef     = useRef(1);
  const itemsRef    = useRef([]);
  const totalRef    = useRef(0);
  const searchRef   = useRef('');

  // value가 있을 때 표시 이름 조회 (이미 로드된 목록에 있으면 재사용)
  useEffect(() => {
    if (!value) { setSelectedWork(null); return; }
    const found = itemsRef.current.find(w => String(w.id) === value);
    if (found) { setSelectedWork(found); return; }
    apiFetch(`/api/works/${value}`)
      .then(r => r.ok ? r.json() : null)
      .then(w => { if (w?.id) setSelectedWork(w); })
      .catch(() => {});
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchPage(q, pageNum, append) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        pageSize: String(WORK_PAGE_SIZE),
        page:     String(pageNum),
      });
      if (q) params.set('workName', q);
      const res = await apiFetch(`/api/works?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      const newItems = Array.isArray(data.items) ? data.items : [];
      setItems(prev => {
        const next = append ? [...prev, ...newItems] : newItems;
        itemsRef.current = next;
        return next;
      });
      totalRef.current = data.total ?? 0;
      pageRef.current  = pageNum;
      setTotal(data.total ?? 0);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  // 열릴 때 초기화 + 1페이지 fetch
  useEffect(() => {
    if (!open) return;
    setSearch('');
    searchRef.current = '';
    setItems([]);
    itemsRef.current = [];
    pageRef.current  = 1;
    totalRef.current = 0;
    fetchPage('', 1, false);
    inputRef.current?.focus();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // 검색어 입력 debounce
  function handleSearchChange(e) {
    const q = e.target.value;
    setSearch(q);
    searchRef.current = q;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setItems([]);
      itemsRef.current = [];
      pageRef.current  = 1;
      fetchPage(q.trim(), 1, false);
    }, 300);
  }

  // 스크롤 하단 → 다음 페이지 append
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    function onScroll() {
      if (loadingRef.current) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
        if (itemsRef.current.length < totalRef.current) {
          fetchPage(searchRef.current.trim(), pageRef.current + 1, true);
        }
      }
    }
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function select(id, work) {
    onChange(id);
    setSelectedWork(work ?? null);
    setOpen(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') setOpen(false);
  }

  const hasMore = items.length < total;

  return (
    <div ref={wrapRef} className="work-search-wrap">
      {/* 트리거 */}
      <button
        type="button"
        className={`work-search-trigger${open ? ' work-search-trigger-open' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
      >
        <span className={selectedWork ? 'work-search-trigger-label' : 'work-search-trigger-placeholder'}>
          {selectedWork
            ? <>
                {selectedWork.name}
                {selectedWork.work_type && (
                  <span className="work-search-type-badge">{selectedWork.work_type}</span>
                )}
              </>
            : '연결 없음'}
        </span>
        <span className={`work-search-arrow${open ? ' work-search-arrow-up' : ''}`}>▾</span>
      </button>

      {/* 인라인 확장 영역 */}
      {open && (
        <div className="work-search-dropdown">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            placeholder="작업명 입력"
            className="work-search-input"
          />
          <ul ref={listRef} className="work-search-list">
            {/* 연결 없음 */}
            <li
              className={`work-search-item work-search-item-none${!value ? ' is-selected' : ''}`}
              onMouseDown={() => select('', null)}
            >
              연결 없음
            </li>

            {items.map(w => (
              <li
                key={w.id}
                className={`work-search-item${String(w.id) === value ? ' is-selected' : ''}`}
                onMouseDown={() => select(String(w.id), w)}
              >
                <span className="work-search-item-name">{w.name}</span>
                {w.work_type && <span className="work-search-type-badge">{w.work_type}</span>}
              </li>
            ))}

            {!loading && items.length === 0 && (
              <li className="work-search-empty">일치하는 작업이 없습니다.</li>
            )}

            {loading && (
              <li className="work-search-loading">불러오는 중…</li>
            )}

            {!loading && hasMore && (
              <li className="work-search-more">
                ↓ 스크롤하여 더 보기 ({total - items.length}개 남음)
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * 범례 검색·선택 컴포넌트.
 * facility_legend 항목: { name, color, label, count }
 * 저장 값은 name(문자열), 목록에는 색상 스워치 + 이름 + 개수 표시.
 */
function LegendSearchSelect({ items, value, onChange, disabled }) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) { setSearch(''); inputRef.current?.focus(); }
  }, [open]);

  const toName   = (item) => (typeof item === 'string' ? item : item.name) ?? '';
  const selected = items.find(item => toName(item) === value);
  const trimmed  = search.trim().toLowerCase();
  const filtered = trimmed
    ? items.filter(item => toName(item).toLowerCase().includes(trimmed))
    : items;

  function select(val) { onChange(val); setOpen(false); }

  return (
    <div ref={wrapRef} className="work-search-wrap">
      <button
        type="button"
        className={`work-search-trigger${open ? ' work-search-trigger-open' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
      >
        <span className={selected ? 'work-search-trigger-label' : 'work-search-trigger-placeholder'}>
          {selected
            ? <>
                {selected.color && (
                  <span className="legend-color-swatch" style={{ background: selected.color }} />
                )}
                {toName(selected)}
              </>
            : (value || '선택 안 함')}
          {!selected && value && (
            <span style={{ fontSize: '0.78em', color: '#888', marginLeft: 4 }}>(목록에 없음)</span>
          )}
        </span>
        <span className={`work-search-arrow${open ? ' work-search-arrow-up' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="work-search-dropdown">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setOpen(false)}
            placeholder="범례 이름 입력"
            className="work-search-input"
          />
          <ul className="work-search-list">
            <li
              className={`work-search-item work-search-item-none${!value ? ' is-selected' : ''}`}
              onMouseDown={() => select('')}
            >
              선택 안 함
            </li>
            {filtered.map((item, i) => {
              const name = toName(item);
              return (
                <li
                  key={i}
                  className={`work-search-item${name === value ? ' is-selected' : ''}`}
                  onMouseDown={() => select(name)}
                >
                  {item.color && (
                    <span className="legend-color-swatch" style={{ background: item.color }} />
                  )}
                  <span className="work-search-item-name">{name}</span>
                  {item.count != null && (
                    <span className="work-search-type-badge">{item.count}</span>
                  )}
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="work-search-empty">일치하는 범례가 없습니다.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * 주석 검색·선택 컴포넌트.
 * annotations는 metadata.json 기반 소규모 목록이므로 클라이언트 필터링 사용.
 * 표시 형식: "FRT 자재보관(#1)", "라지에이터그릴(#2)" — text(#id)
 */
function annotationLabel(a) {
  return `${a.text ?? '주석'}(#${a.id})`;
}

function AnnotationSearchSelect({ annotations, value, onChange, disabled }) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) { setSearch(''); inputRef.current?.focus(); }
  }, [open]);

  const selected = value ? annotations.find(a => String(a.id) === value) : null;
  const trimmed  = search.trim().toLowerCase();
  const filtered = trimmed
    ? annotations.filter(a => annotationLabel(a).toLowerCase().includes(trimmed))
    : annotations;

  function select(id) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="work-search-wrap">
      <button
        type="button"
        className={`work-search-trigger${open ? ' work-search-trigger-open' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
      >
        <span className={selected ? 'work-search-trigger-label' : 'work-search-trigger-placeholder'}>
          {selected ? annotationLabel(selected) : '연결 없음'}
        </span>
        <span className={`work-search-arrow${open ? ' work-search-arrow-up' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="work-search-dropdown">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setOpen(false)}
            placeholder="주석 이름 입력"
            className="work-search-input"
          />
          <ul className="work-search-list">
            <li
              className={`work-search-item work-search-item-none${!value ? ' is-selected' : ''}`}
              onMouseDown={() => select('')}
            >
              연결 없음
            </li>
            {filtered.map(a => (
              <li
                key={a.id}
                className={`work-search-item${String(a.id) === value ? ' is-selected' : ''}`}
                onMouseDown={() => select(String(a.id))}
              >
                <span className="work-search-item-name">{annotationLabel(a)}</span>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="work-search-empty">일치하는 주석이 없습니다.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * 도면 뷰어 우측 overlay 편집 패널.
 * isEditMode && selectedSymbol 일 때 렌더된다.
 */
export default function SymbolEditPanel({
  symbol,
  hasOverride    = false,
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

  const prevHandleRef = useRef(null);
  useEffect(() => {
    if (!symbol) { prevHandleRef.current = null; return; }
    const d = symbol.data;
    const handleChanged = prevHandleRef.current !== symbol.handle;
    prevHandleRef.current = symbol.handle;

    if (handleChanged) {
      setForm({
        category:      d?.category    || symbol.svgCategory || 'UNDEFINED',
        description:   d?.description ?? '',
        legend:        d?.legend      ?? (symbol.svgFacility || ''),
        annotation_id: d?.annotation_id != null ? String(d.annotation_id) : '',
        work_id:       d?.work_id != null ? String(d.work_id) : '',
        ...toFormCoords(d),
      });
      setError(null);
    } else {
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
      work_id:       form.work_id !== '' ? parseInt(form.work_id, 10) : null,
      center_x: form.center_x !== '' ? parseFloat(form.center_x) : null,
      center_y: form.center_y !== '' ? parseFloat(form.center_y) : null,
      width:    form.width    !== '' ? parseFloat(form.width)    : null,
      height:   form.height   !== '' ? parseFloat(form.height)   : null,
    };
  }

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
          {facilityLegend.length > 0 ? (
            <LegendSearchSelect
              items={facilityLegend}
              value={form.legend}
              onChange={(val) => { setForm(prev => ({ ...prev, legend: val })); setError(null); }}
              disabled={busy}
            />
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

        {/* 주석 */}
        {annotations.length > 0 && (
          <section className="symbol-edit-section">
            <h3 className="symbol-edit-section-title">주석</h3>
            <AnnotationSearchSelect
              annotations={annotations}
              value={form.annotation_id}
              onChange={(id) => { setForm(prev => ({ ...prev, annotation_id: id })); setError(null); }}
              disabled={busy}
            />
          </section>
        )}

        {/* 연결된 작업 — STATION / CONVEYOR / BUFFER 전용 */}
        {WORK_CATEGORIES.has(form.category) && (
          <section className="symbol-edit-section">
            <h3 className="symbol-edit-section-title">연결된 작업</h3>
            <p className="symbol-edit-hint" style={{ marginTop: 0, marginBottom: '0.25rem' }}>
              이 설비를 사용하는 작업 정보를 연결하세요.
            </p>
            <WorkSearchSelect
              value={form.work_id}
              onChange={(id) => { setForm(prev => ({ ...prev, work_id: id })); setError(null); }}
              disabled={busy}
            />
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
          취소
        </button>
        <button type="button" className="btn-primary" style={{ fontSize: '0.8125rem' }}
          onClick={handleSave} disabled={busy || !onSave}>
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  );
}
