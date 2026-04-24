import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import ClientDate from '../ClientDate';
import WorkSelectPopup from '../Works/WorkSelectPopup';

const SUB_PREFIX = '[세부공정]';

function parseSubProcessMeta(description) {
  if (!description || typeof description !== 'string' || !description.startsWith(SUB_PREFIX)) return null;
  const rest = description.slice(SUB_PREFIX.length);
  const i = rest.indexOf('|');
  if (i < 0) return { name: rest.trim(), description: '' };
  return { name: rest.slice(0, i).trim(), description: rest.slice(i + 1).trim() };
}

function encodeSubProcessMeta(name, description) {
  return `${SUB_PREFIX}${name || ''}|${description || ''}`;
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}분 ${s}초`;
}

// ── 아이콘 ──────────────────────────────────────────────────────────────────

function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 6h16v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6z" />
      <path d="M9 6V5a1 1 0 011-1h4a1 1 0 011 1v1" />
      <path d="M3 6h18" />
    </svg>
  );
}

function IconMemo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="2" width="14" height="20" rx="1" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </svg>
  );
}

export default function ProcessForm({ processId: processIdProp, onSuccess, onCancel, inModal, topBar }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const processId = processIdProp != null ? processIdProp : (id ? Number(id) : null);
  const isEdit = processId != null;

  const [factories, setFactories] = useState([]);
  const [works, setWorks] = useState([]);
  const [productCodes, setProductCodes] = useState([]);
  const [form, setForm] = useState({
    factory_id: '',
    product_name: '',
    process_name: '',
    description: '',
    subProcesses: [{ id: crypto.randomUUID?.() || '1', name: '', description: '', steps: [] }],
  });
  const [readOnlyMeta, setReadOnlyMeta] = useState({ updated_at: null, updated_by: null });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [descriptionForSubProcessIndex, setDescriptionForSubProcessIndex] = useState(null);
  const [descriptionPopupAnchor, setDescriptionPopupAnchor] = useState(null);
  const [workSelectContext, setWorkSelectContext] = useState(null);

  // ── 데이터 로드 ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch('/api/factories?pageSize=500').then((r) => (r.ok ? r.json() : { items: [] })),
      apiFetch('/api/works?pageSize=500').then((r) => (r.ok ? r.json() : { items: [] })),
      apiFetch('/api/config/product-codes').then(async (r) => {
        if (!r.ok) return { items: [] };
        const data = await r.json().catch(() => ({}));
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        return { items: items.filter((c) => c != null && String(c).trim() !== '') };
      }),
    ]).then(([factData, workData, configData]) => {
      if (cancelled) return;
      if (Array.isArray(factData?.items)) setFactories(factData.items);
      if (Array.isArray(workData?.items)) setWorks(workData.items);
      setProductCodes(Array.isArray(configData?.items) ? configData.items : []);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isEdit || processId == null) return;
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/processes/${processId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        const steps = Array.isArray(d.steps) ? d.steps : [];
        const subProcesses = [];
        let current = null;
        for (let i = 0; i < steps.length; i++) {
          const s = steps[i];
          const meta = parseSubProcessMeta(s.description);
          const hasWork = s.work_id != null && s.work_id !== '';
          if (meta) {
            current = { id: crypto.randomUUID?.() || `sp-${i}`, name: meta.name, description: meta.description, steps: [] };
            subProcesses.push(current);
            if (hasWork) current.steps.push({ work_id: s.work_id, actual_duration_sec: s.actual_duration_sec != null ? String(s.actual_duration_sec) : '' });
          } else if (current) {
            if (hasWork) current.steps.push({ work_id: s.work_id, actual_duration_sec: s.actual_duration_sec != null ? String(s.actual_duration_sec) : '' });
          } else {
            current = { id: crypto.randomUUID?.() || `sp-${i}`, name: '', description: '', steps: hasWork ? [{ work_id: s.work_id, actual_duration_sec: s.actual_duration_sec != null ? String(s.actual_duration_sec) : '' }] : [] };
            subProcesses.push(current);
          }
        }
        if (subProcesses.length === 0) subProcesses.push({ id: crypto.randomUUID?.() || '1', name: '', description: '', steps: [] });
        setForm({
          factory_id: Number(d.factory_id),
          product_name: String(d.product_name ?? ''),
          process_name: String(d.process_name ?? ''),
          description: String(d.description ?? ''),
          subProcesses,
        });
        setReadOnlyMeta({ updated_at: d.updated_at || null, updated_by: d.updated_by_name ?? d.updated_by ?? null });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [processId, isEdit]);

  // ── 계산 ─────────────────────────────────────────────────────────────────

  const totalDurationSec = form.subProcesses.reduce((sum, sp) =>
    sum + sp.steps.reduce((s, st) => s + (st.actual_duration_sec !== '' ? Number(st.actual_duration_sec) : 0), 0), 0);

  // ── 단계 조작 ─────────────────────────────────────────────────────────────

  const addSubProcess = () => {
    setForm((f) => ({
      ...f,
      subProcesses: [...f.subProcesses, { id: crypto.randomUUID?.() || String(Date.now()), name: '', description: '', steps: [] }],
    }));
  };

  const updateSubProcess = (spIndex, field, value) => {
    setForm((f) => ({
      ...f,
      subProcesses: f.subProcesses.map((sp, i) => (i === spIndex ? { ...sp, [field]: value } : sp)),
    }));
  };

  const removeSubProcess = (spIndex) => {
    setForm((f) => ({ ...f, subProcesses: f.subProcesses.filter((_, i) => i !== spIndex) }));
  };

  const addStepWithWork = useCallback((spIndex, workId) => {
    const id = Number(workId);
    if (Number.isNaN(id)) return;
    const work = works.find((w) => Number(w.id) === id);
    const defaultSec = work != null && work.estimated_duration_sec != null && Number(work.estimated_duration_sec) >= 0
      ? String(Number(work.estimated_duration_sec)) : '';
    setForm((f) => ({
      ...f,
      subProcesses: f.subProcesses.map((sp, i) => {
        if (i !== spIndex) return sp;
        return { ...sp, steps: [...sp.steps, { work_id: id, actual_duration_sec: defaultSec }] };
      }),
    }));
    setWorkSelectContext(null);
  }, [works]);

  const replaceStepWork = useCallback((spIndex, stepIndex, workId) => {
    const id = Number(workId);
    if (Number.isNaN(id)) return;
    const work = works.find((w) => Number(w.id) === id);
    const defaultSec = work != null && work.estimated_duration_sec != null && Number(work.estimated_duration_sec) >= 0
      ? String(Number(work.estimated_duration_sec)) : '';
    setForm((f) => ({
      ...f,
      subProcesses: f.subProcesses.map((sp, i) =>
        i !== spIndex ? sp
          : { ...sp, steps: sp.steps.map((s, j) => (j === stepIndex ? { ...s, work_id: id, actual_duration_sec: defaultSec } : s)) }
      ),
    }));
    setWorkSelectContext(null);
  }, [works]);

  const updateStep = (spIndex, stepIndex, field, value) => {
    setForm((f) => ({
      ...f,
      subProcesses: f.subProcesses.map((sp, i) =>
        i === spIndex ? { ...sp, steps: sp.steps.map((s, j) => (j === stepIndex ? { ...s, [field]: value } : s)) } : sp
      ),
    }));
  };

  const removeStep = (spIndex, stepIndex) => {
    setForm((f) => ({
      ...f,
      subProcesses: f.subProcesses.map((sp, i) =>
        i === spIndex ? { ...sp, steps: sp.steps.filter((_, j) => j !== stepIndex) } : sp
      ),
    }));
  };

  // ── 저장 ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    const factoryId = form.factory_id === '' ? null : Number(form.factory_id);
    if (factoryId == null || !form.product_name.trim() || !form.process_name.trim()) {
      alert('공장, 대상 완제품, 공정 이름은 필수입니다.');
      return;
    }
    const steps = [];
    for (const sp of form.subProcesses) {
      const validSteps = sp.steps.filter((s) => s.work_id !== '');
      if (validSteps.length === 0) {
        steps.push({ work_id: null, actual_duration_sec: null, description: encodeSubProcessMeta(sp.name, sp.description) });
      } else {
        validSteps.forEach((s, idx) => {
          const sec = s.actual_duration_sec !== '' ? Number(s.actual_duration_sec) : null;
          steps.push({
            work_id: Number(s.work_id),
            actual_duration_sec: sec != null ? Math.max(0, Math.floor(sec)) : null,
            description: idx === 0 ? encodeSubProcessMeta(sp.name, sp.description) : null,
          });
        });
      }
    }
    const totalSec = steps.reduce((sum, s) => sum + (s.actual_duration_sec != null ? s.actual_duration_sec : 0), 0);
    setSaving(true);
    try {
      const body = {
        factory_id: factoryId,
        product_name: form.product_name.trim(),
        process_name: form.process_name.trim(),
        total_duration_sec: totalSec,
        description: form.description.trim() || null,
        steps,
      };
      const url = isEdit ? `/api/processes/${processId}` : '/api/processes';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await apiFetch(url, { method, body: JSON.stringify(body) });
      const errData = res.ok ? null : await res.json();
      if (!res.ok) { alert(errData?.error || '저장 실패'); return; }
      if ((inModal || topBar) && onSuccess) { onSuccess(); return; }
      const saved = await res.json();
      navigate(`/processes/${saved.id}`);
    } finally {
      setSaving(false);
    }
  };

  // ── 메모 팝업 열기 헬퍼 ────────────────────────────────────────────────────

  const openMemo = (e, spIndex) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDescriptionPopupAnchor({ right: rect.right, top: rect.top });
    setDescriptionForSubProcessIndex(spIndex);
  };

  if (loading) return <div className="pf-loading">로딩 중...</div>;

  // ── 렌더 ─────────────────────────────────────────────────────────────────

  return (
    <div className={`pf-wrap${inModal ? ' process-form-in-modal' : ''}`}>
      <form onSubmit={handleSubmit} className="pf-form-layout">

        {/* 상단 액션 바 (topBar 모드) */}
        {topBar && (
          <div className="pf-top-bar">
            <h2 className="pf-top-title">{isEdit ? '공정 수정' : '공정 등록'}</h2>
            <div className="pf-top-actions">
              <button type="button" onClick={onCancel} className="pf-btn-secondary" disabled={saving}>
                취소
              </button>
              <button type="submit" disabled={saving} className="pf-btn-primary">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            두 패널 행
        ══════════════════════════════════════════════ */}
        <div className="pf-body">

        {/* ══════════════════════════════════════════════
            왼쪽 패널 — 공정 기본 정보 입력
        ══════════════════════════════════════════════ */}
        <div className="pf-left">
          {!inModal && !topBar && (
            <Link to={isEdit ? `/processes/${processId}` : '/processes'} className="pf-back-link">
              ← {isEdit ? '목록' : '목록'}
            </Link>
          )}

          {!topBar && <h2 className="pf-form-title">{isEdit ? '공정 수정' : '공정 등록'}</h2>}

          {/* 공장 */}
          <div className="pf-field">
            <label className="pf-label">공장 <span className="pf-required">*</span></label>
            <select
              required
              value={form.factory_id === '' ? '' : String(form.factory_id)}
              onChange={(e) => setForm((f) => ({ ...f, factory_id: e.target.value === '' ? '' : Number(e.target.value) }))}
              className="pf-select"
            >
              <option value="">선택</option>
              {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          {/* 대상 완제품 */}
          <div className="pf-field">
            <label className="pf-label">대상 완제품 <span className="pf-required">*</span></label>
            {productCodes.length > 0 ? (
              <select
                required
                value={form.product_name}
                onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
                className="pf-select"
              >
                <option value="">선택</option>
                {productCodes.map((code) => <option key={code} value={code}>{code}</option>)}
              </select>
            ) : (
              <input
                type="text"
                required
                value={form.product_name}
                onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
                className="pf-input"
                placeholder="완제품 이름"
              />
            )}
          </div>

          {/* 공정 이름 */}
          <div className="pf-field">
            <label className="pf-label">공정 이름 <span className="pf-required">*</span></label>
            <input
              type="text"
              required
              value={form.process_name}
              onChange={(e) => setForm((f) => ({ ...f, process_name: e.target.value }))}
              className="pf-input"
              placeholder="공정 이름"
            />
          </div>

          {/* 공정 설명 */}
          <div className="pf-field pf-field-grow">
            <label className="pf-label">공정 설명 <span className="pf-optional">(선택)</span></label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="pf-textarea"
              rows={3}
              placeholder="공정 설명을 입력하세요"
            />
          </div>

          <div className="pf-left-bottom">
            {/* 수정 메타 */}
            {isEdit && (
              <div className="pf-meta">
                <div className="pf-meta-row">
                  <span className="pf-meta-label">수정일자</span>
                  <span className="pf-meta-value">
                    {readOnlyMeta.updated_at ? <ClientDate value={String(readOnlyMeta.updated_at)} /> : '-'}
                  </span>
                </div>
                <div className="pf-meta-row">
                  <span className="pf-meta-label">수정자</span>
                  <span className="pf-meta-value">{readOnlyMeta.updated_by || '-'}</span>
                </div>
              </div>
            )}

            {/* 저장 / 취소 (topBar 모드에서는 숨김) */}
            {!topBar && (
              <div className="pf-btns">
                <button type="submit" disabled={saving} className="pf-btn-primary">
                  {saving ? '저장 중...' : '저장'}
                </button>
                {inModal && onCancel
                  ? <button type="button" onClick={onCancel} className="pf-btn-secondary">취소</button>
                  : <Link to={isEdit ? `/processes/${processId}` : '/processes'} className="pf-btn-secondary">취소</Link>
                }
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            오른쪽 패널 — 공정 단계 카드
        ══════════════════════════════════════════════ */}
        <div className="pf-right">
          {/* 헤더 */}
          <div className="pf-right-header">
            <div className="pf-right-title">
              <span className="pf-right-product">{form.product_name || '완제품'}</span>
              <span className="pf-right-time">총 시간 : {fmtTime(totalDurationSec)}</span>
            </div>
            <button type="button" onClick={addSubProcess} className="pf-btn-add-stage">
              단계 추가
            </button>
          </div>

          {/* 카드 목록 */}
          <div className="pf-cards-area">
            {form.subProcesses.map((sp, spIndex) => {
              const spSec = sp.steps.reduce((s, st) => s + (st.actual_duration_sec !== '' ? Number(st.actual_duration_sec) : 0), 0);
              const validSteps = sp.steps.filter((s) => s.work_id !== '');

              return (
                <div key={sp.id} className="pf-card">
                  {/* 카드 헤더 */}
                  <div className="pf-card-header">
                    <span className="pf-card-header-label">공정 정보</span>
                    <div className="pf-card-header-btns">
                      <button
                        type="button"
                        className="pf-icon-btn"
                        onClick={(e) => openMemo(e, spIndex)}
                        title="메모"
                        aria-label="메모"
                      >
                        <IconMemo />
                      </button>
                      <button
                        type="button"
                        className="pf-icon-btn"
                        onClick={() => removeSubProcess(spIndex)}
                        title="단계 삭제"
                        aria-label="단계 삭제"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* 단계명 입력 */}
                  <input
                    type="text"
                    value={sp.name}
                    onChange={(e) => updateSubProcess(spIndex, 'name', e.target.value)}
                    placeholder="단계명"
                    maxLength={15}
                    className="pf-card-name"
                  />

                  {/* 소요시간 */}
                  <p className="pf-card-time">소요시간 : {fmtTime(spSec)}</p>

                  {/* 작업 추가 / 메모 */}
                  <div className="pf-card-actions">
                    <button
                      type="button"
                      className="pf-text-btn"
                      onClick={() => setWorkSelectContext({ spIndex })}
                    >
                      작업 추가
                    </button>
                    <span className="pf-card-action-sep" aria-hidden>|</span>
                    <button
                      type="button"
                      className="pf-text-btn"
                      onClick={(e) => openMemo(e, spIndex)}
                    >
                      메모
                    </button>
                  </div>

                  {/* 작업 목록 */}
                  {validSteps.length > 0 && (
                    <div className="pf-work-list">
                      {validSteps.map((step) => {
                        const stepIndex = sp.steps.indexOf(step);
                        const work = works.find((w) => Number(w.id) === Number(step.work_id));
                        return (
                          <div key={`${spIndex}-${stepIndex}`} className="pf-work-item">
                            <p className="pf-work-name">{work?.name || `작업 #${step.work_id}`}</p>
                            <div className="pf-work-row">
                              <input
                                type="number"
                                min={0}
                                value={step.actual_duration_sec}
                                onChange={(e) => {
                                  if (e.target.value === '') { updateStep(spIndex, stepIndex, 'actual_duration_sec', ''); return; }
                                  const num = Number(e.target.value);
                                  if (!Number.isNaN(num) && num >= 0) updateStep(spIndex, stepIndex, 'actual_duration_sec', String(Math.floor(num)));
                                }}
                                className="pf-work-time-input"
                              />
                              <span className="pf-work-time-unit">초 소요</span>
                              <button
                                type="button"
                                className="pf-icon-btn"
                                onClick={() => setWorkSelectContext({ spIndex, stepIndex })}
                                title="작업 변경"
                                aria-label="작업 변경"
                              >
                                <IconEdit />
                              </button>
                              <button
                                type="button"
                                className="pf-icon-btn"
                                onClick={() => removeStep(spIndex, stepIndex)}
                                title="작업 제거"
                                aria-label="작업 제거"
                              >
                                <IconTrash />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 빈 상태 안내 */}
            {form.subProcesses.length === 0 && (
              <div className="pf-empty-state">
                단계 추가 버튼으로 공정 단계를 추가하세요.
              </div>
            )}
          </div>
        </div>
        </div> {/* pf-body */}
      </form>

      {/* 메모(설명) 팝업 — Excel Note 스타일 */}
      {descriptionForSubProcessIndex != null
        && form.subProcesses[descriptionForSubProcessIndex]
        && descriptionPopupAnchor
        && createPortal(
          <div
            className="fixed inset-0 z-[9999]"
            style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.4)' }}
            onClick={() => { setDescriptionForSubProcessIndex(null); setDescriptionPopupAnchor(null); }}
            role="presentation"
          >
            <div
              style={{
                position: 'fixed',
                width: '220px',
                left: Math.min(descriptionPopupAnchor.right + 6, typeof window !== 'undefined' ? window.innerWidth - 226 : descriptionPopupAnchor.right + 6),
                top: Math.max(8, descriptionPopupAnchor.top - 8),
                zIndex: 10000,
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="메모 입력"
            >
              <div className="absolute -left-2 top-3 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-red-600" aria-hidden />
              <div className="excel-note-popup border border-black overflow-hidden shadow-lg" style={{ backgroundColor: '#FFFACD' }}>
                <div className="p-2">
                  <textarea
                    value={form.subProcesses[descriptionForSubProcessIndex].description}
                    onChange={(e) => updateSubProcess(descriptionForSubProcessIndex, 'description', e.target.value)}
                    placeholder="메모를 입력하세요"
                    className="excel-note-textarea w-full px-2 py-1.5 text-sm border-0 resize-y focus:outline-none focus:ring-0"
                    style={{ backgroundColor: '#FFFACD', minHeight: '80px' }}
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 작업 선택 팝업 */}
      <WorkSelectPopup
        isOpen={workSelectContext != null}
        onClose={() => setWorkSelectContext(null)}
        onSelect={(work) => {
          if (workSelectContext == null) return;
          if (workSelectContext.stepIndex !== undefined) {
            replaceStepWork(workSelectContext.spIndex, workSelectContext.stepIndex, work.id);
          } else {
            addStepWithWork(workSelectContext.spIndex, work.id);
          }
        }}
      />
    </div>
  );
}
