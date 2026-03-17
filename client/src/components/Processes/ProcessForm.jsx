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

/**
 * PRD 공정 등록: 4단계 Tree (왼쪽→오른쪽)
 * 1 Depth: 완제품 이름, 시간(2Depth 합)
 * 2 Depth: 세부 공정 - 이름, 설명, 시간(3Depth 합)
 * 3 Depth: 작업 리스트 - 작업 이름, 예상 시간(편집 가능)
 * 4 Depth: 해당 작업의 기계/부품 목록
 */
export default function ProcessForm({ processId: processIdProp, onSuccess, onCancel, inModal }) {
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
    subProcesses: [{ id: crypto.randomUUID?.() || '1', name: '', description: '', steps: [{ work_id: '', actual_duration_sec: '' }] }],
  });
  const [readOnlyMeta, setReadOnlyMeta] = useState({ updated_at: null, updated_by: null });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workDetails, setWorkDetails] = useState({}); // work_id -> { part_ids, machine_ids, part_names, machine_names }
  const [descriptionForSubProcessIndex, setDescriptionForSubProcessIndex] = useState(null); // 단계 설명 추가/보기용
  const [descriptionPopupAnchor, setDescriptionPopupAnchor] = useState(null); // { right, top } Note 버튼 위치 (팝업을 그 오른쪽 위에 띄우기 위함)
  const [workSelectContext, setWorkSelectContext] = useState(null); // { spIndex, stepIndex? } 작업 추가 시 stepIndex 없음, 작업 수정 시 stepIndex 있음. null이면 팝업 닫힘
  const [collapsedStepIds, setCollapsedStepIds] = useState(() => new Set()); // 하위 작업 숨김 상태인 단계 id 집합

  const loadWorkDetail = useCallback(async (workId) => {
    if (!workId || workDetails[workId]) return;
    try {
      const res = await apiFetch(`/api/works/${workId}`);
      if (!res.ok) return;
      const d = await res.json();
      const [pRes, mRes] = await Promise.all([
        apiFetch('/api/parts?pageSize=500'),
        apiFetch('/api/machines?pageSize=500'),
      ]);
      const parts = pRes.ok ? (await pRes.json()).items || [] : [];
      const machines = mRes.ok ? (await mRes.json()).items || [] : [];
      const partNames = (d.part_ids || []).map((pid) => parts.find((x) => x.id === pid)?.name || `#${pid}`);
      const machineNames = (d.machine_ids || []).map((mid) => machines.find((x) => x.id === mid)?.name || `#${mid}`);
      setWorkDetails((prev) => ({ ...prev, [workId]: { part_ids: d.part_ids || [], machine_ids: d.machine_ids || [], partNames, machineNames } }));
    } catch (_) {}
  }, [workDetails]);

  // 공장·작업 목록 + 완제품 코드(PRODUCT_CODE) API 조회
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch('/api/factories?pageSize=500').then((r) => (r.ok ? r.json() : { items: [] })),
      apiFetch('/api/works?pageSize=500').then((r) => (r.ok ? r.json() : { items: [] })),
      apiFetch('/api/config/product-codes')
        .then(async (r) => {
          if (!r.ok) return { items: [] };
          const data = await r.json().catch(() => ({}));
          const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
          return { items: items.filter((c) => c != null && String(c).trim() !== '') };
        }),
    ]).then(([factData, workData, configData]) => {
      if (cancelled) return;
      if (Array.isArray(factData?.items)) setFactories(factData.items);
      if (Array.isArray(workData?.items)) setWorks(workData.items);
      const codes = Array.isArray(configData?.items) ? configData.items : [];
      setProductCodes(codes);
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
            if (hasWork) current.steps.push({ work_id: s.work_id, actual_duration_sec: s.actual_duration_sec != null ? String(s.actual_duration_sec) : '', description: String(s.description ?? '') });
          } else {
            current = { id: crypto.randomUUID?.() || `sp-${i}`, name: '', description: '', steps: hasWork ? [{ work_id: s.work_id, actual_duration_sec: s.actual_duration_sec != null ? String(s.actual_duration_sec) : '', description: String(s.description ?? '') }] : [] };
            subProcesses.push(current);
          }
        }
        if (subProcesses.length === 0) subProcesses.push({ id: crypto.randomUUID?.() || '1', name: '', description: '', steps: [{ work_id: '', actual_duration_sec: '' }] });
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

  const totalDurationSec = form.subProcesses.reduce((sum, sp) => {
    const stepSum = sp.steps.reduce((s, st) => s + (st.actual_duration_sec !== '' ? Number(st.actual_duration_sec) : 0), 0);
    return sum + stepSum;
  }, 0);

  const addSubProcess = () => {
    setForm((f) => ({ ...f, subProcesses: [...f.subProcesses, { id: crypto.randomUUID?.() || String(Date.now()), name: '', description: '', steps: [{ work_id: '', actual_duration_sec: '' }] }] }));
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
  const addStep = (spIndex) => {
    setForm((f) => ({
      ...f,
      subProcesses: f.subProcesses.map((sp, i) => (i === spIndex ? { ...sp, steps: [...sp.steps, { work_id: '', actual_duration_sec: '' }] } : sp)),
    }));
  };
  /** 작업 목록에서 선택한 작업을 해당 단계에 추가 (빈 step이 있으면 교체, 없으면 추가). 작업의 예상 소요시간(초)을 기본값으로 넣음. */
  const addStepWithWork = (spIndex, workId) => {
    const id = Number(workId);
    if (Number.isNaN(id)) return;
    const work = works.find((w) => Number(w.id) === id);
    const defaultSec =
      work != null && work.estimated_duration_sec != null && Number(work.estimated_duration_sec) >= 0
        ? String(Number(work.estimated_duration_sec))
        : '';
    setForm((f) => ({
      ...f,
      subProcesses: f.subProcesses.map((sp, i) => {
        if (i !== spIndex) return sp;
        const steps = [...sp.steps];
        const last = steps[steps.length - 1];
        if (last && last.work_id === '') {
          steps[steps.length - 1] = { work_id: id, actual_duration_sec: defaultSec };
          return { ...sp, steps };
        }
        return { ...sp, steps: [...steps, { work_id: id, actual_duration_sec: defaultSec }] };
      }),
    }));
    setWorkSelectContext(null);
  };
  /** 기존 작업을 다른 작업으로 교체 (작업 수정) */
  const replaceStepWork = (spIndex, stepIndex, workId) => {
    const id = Number(workId);
    if (Number.isNaN(id)) return;
    const work = works.find((w) => Number(w.id) === id);
    const defaultSec =
      work != null && work.estimated_duration_sec != null && Number(work.estimated_duration_sec) >= 0
        ? String(Number(work.estimated_duration_sec))
        : '';
    setForm((f) => ({
      ...f,
      subProcesses: f.subProcesses.map((sp, i) =>
        i !== spIndex
          ? sp
          : { ...sp, steps: sp.steps.map((s, j) => (j === stepIndex ? { ...s, work_id: id, actual_duration_sec: defaultSec } : s)) }
      ),
    }));
    setWorkSelectContext(null);
  };
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
            description: idx === 0 ? encodeSubProcessMeta(sp.name, sp.description) : (s.description || null),
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
      if (inModal && onSuccess) { onSuccess(); return; }
      const saved = await res.json();
      navigate(`/processes/${saved.id}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">로딩 중...</div>;

  return (
    <div className={inModal ? 'process-form-in-modal' : ''}>
      {!inModal && <Link to={isEdit ? `/processes/${processId}` : '/processes'} className="text-blue-600 hover:underline text-sm mb-4 inline-block">← {isEdit ? '상세' : '목록'}</Link>}
      <form onSubmit={handleSubmit} className="space-y-4">
        {!inModal && <h2 className="text-2xl font-bold text-gray-900">{isEdit ? '공정 수정' : '공정 등록'}</h2>}

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">공장 <span className="text-red-600">*</span></label>
            <select required value={form.factory_id === '' ? '' : String(form.factory_id)} onChange={(e) => setForm((f) => ({ ...f, factory_id: e.target.value === '' ? '' : Number(e.target.value) }))} className="w-full border border rounded px-3 py-2 bg-white">
              <option value="">선택</option>
              {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">대상 완제품 <span className="text-red-600">*</span></label>
            {productCodes.length > 0 ? (
              <select required value={form.product_name} onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))} className="w-full border border rounded px-3 py-2 bg-white">
                <option value="">선택</option>
                {productCodes.map((code) => <option key={code} value={code}>{code}</option>)}
              </select>
            ) : (
              <>
                <input type="text" required value={form.product_name} onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))} className="w-full border border rounded px-3 py-2" placeholder="완제품 (PRODUCT_CODE 미설정 시 직접 입력)" />
                <p className="text-xs text-amber-600 mt-1">완제품 코드를 불러오지 못했습니다. config-manager 연동 또는 서버 환경 변수 PRODUCT_CODE를 확인하세요. (터미널에서 npm run list-product-codes 로 확인 가능)</p>
              </>
            )}
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">공정 이름 <span className="text-red-600">*</span></label>
            <input type="text" required value={form.process_name} onChange={(e) => setForm((f) => ({ ...f, process_name: e.target.value }))} className="w-full border border rounded px-3 py-2" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">공정 설명 <span className="text-gray-400 text-xs">(선택)</span></label>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full border border rounded px-3 py-2" rows={2} />
        </div>

        {/* 공정 상세 — 스크롤은 이 영역만, 팝업 전체 높이는 고정 */}
        <div className="process-detail-section">
          <label className="block text-sm font-medium text-gray-700 mb-1">공정 상세</label>
          <div className="process-detail-outer-panel border border-gray-300 rounded-lg p-4 bg-gray-50 w-full min-w-0">
            <div className="process-detail-inner flex items-stretch gap-6 min-h-[140px]">
              {/* 1열: 완제품 명 — 연결선으로 단계들과 연결 */}
              {(() => {
                const totalMin = Math.floor(totalDurationSec / 60);
                const totalSec = Math.floor(totalDurationSec % 60);
                return (
                  <div className="process-tree-product-col shrink-0 flex flex-col items-center">
                    <div className="process-tree-node process-tree-node-product bg-white border-2 border-gray-900 rounded-lg px-4 py-3 min-w-[140px] flex flex-col justify-center shrink-0 min-h-[120px]">
                      <div className="text-sm font-normal text-gray-900 text-center mb-1">완제품 명</div>
                      <div className="text-sm text-gray-800 text-center">{form.product_name || '(완제품)'}</div>
                      <div className="text-xs text-gray-700 mt-2 text-center">총 시간 : {totalMin}분 {totalSec}초</div>
                      <div className="flex justify-center mt-2">
                        <button type="button" onClick={addSubProcess} className="border border-gray-900 rounded-md px-2 py-1 text-xs font-medium text-gray-900 bg-white hover:bg-gray-50" title="단계 추가" aria-label="단계 추가">
                          단계추가
                        </button>
                      </div>
                    </div>
                    {/* 연결선: 완제품 → 단계들 */}
                    <div className="process-tree-connector-vertical w-px flex-1 min-h-[16px] bg-gray-400 self-stretch" aria-hidden />
                  </div>
                );
              })()}
              {/* 2열: 단계 패널들 (세로 나열) + 3열: 작업 패널들 (단계별 세로 그룹) */}
              <div className="process-detail-stages flex-1 min-w-0 flex flex-col gap-4">
                {form.subProcesses.map((sp, spIndex) => {
                  const spTimeSec = sp.steps.reduce((s, st) => s + (st.actual_duration_sec !== '' ? Number(st.actual_duration_sec) : 0), 0);
                  const min = Math.floor(spTimeSec / 60);
                  const sec = Math.floor(spTimeSec % 60);
                  return (
                    <div key={sp.id} className="process-detail-stage-row flex items-start gap-6">
                      {/* 연결선: 단계 왼쪽 가로선 */}
                      <div className="process-tree-connector-horizontal shrink-0 w-6 border-t-2 border-gray-400 self-center" style={{ marginTop: 0, marginBottom: 0 }} aria-hidden />
                      {/* 단계 패널 */}
                      <div className="process-step-card shrink-0 bg-white border-2 border-gray-300 rounded-lg shadow-sm overflow-hidden">
                        <div className="process-step-card-inner">
                          <div className="process-step-row process-step-row-name">
                            <input type="text" value={sp.name} onChange={(e) => updateSubProcess(spIndex, 'name', e.target.value)} placeholder="단계명" maxLength={15} className="process-step-name-input" />
                            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setWorkSelectContext({ spIndex }); }} className="process-step-add-work-btn" title="작업 추가" aria-label="작업 추가">작업 추가</button>
                          </div>
                          <div className="process-step-row process-step-row-time">
                            <span className="process-step-time-text">소요시간 : {min}분 {sec}초</span>
                            <div className="process-step-actions">
                              <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); const rect = e.currentTarget.getBoundingClientRect(); setDescriptionPopupAnchor({ right: rect.right, top: rect.top }); setDescriptionForSubProcessIndex(spIndex); }} className="process-step-icon-btn" title="설명" aria-label="설명">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 4h10l2 2v14H6V4z" /><path d="M7.5 4V3c0-.3.2-.5.5-.5h.5c.3 0 .5.2.5.5v1M12 4V3c0-.3.2-.5.5-.5h.5c.3 0 .5.2.5.5v1M16.5 4V3c0-.3.2-.5.5-.5h.5c.3 0 .5.2.5.5v1" /><path d="M8 9h6M8 12h4M8 15h5" /><path d="M15 17l4-4 1 1-5 5h-1l-1-1 1-1z" /></svg>
                              </button>
                              <button type="button" onClick={() => removeSubProcess(spIndex)} className="process-step-icon-btn" title="삭제" aria-label="삭제">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 6h16v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6z" /><path d="M9 6V5a1 1 0 011-1h4a1 1 0 011 1v1" /><path d="M3 6h18" /><path d="M10 11v5M14 11v5M12 11v5" /></svg>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCollapsedStepIds((prev) => {
                                    const n = new Set(prev);
                                    if (n.has(sp.id)) n.delete(sp.id);
                                    else n.add(sp.id);
                                    return n;
                                  });
                                }}
                                className="process-step-icon-btn"
                                title={collapsedStepIds.has(sp.id) ? '하위 작업 보이기' : '하위 작업 숨기기'}
                                aria-label={collapsedStepIds.has(sp.id) ? '하위 작업 보이기' : '하위 작업 숨기기'}
                              >
                                {collapsedStepIds.has(sp.id) ? (
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
                                ) : (
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 15l-6-6-6 6" /></svg>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* 작업 패널들 (단계와 top 정렬). sp.steps 인덱스로 순회해 각 작업의 소요시간이 올바른 step에 저장되도록 함 */}
                      {!collapsedStepIds.has(sp.id) && (
                      <div className="process-detail-tasks-col flex flex-col gap-2 flex-1 min-w-0 self-start">
                        {sp.steps.map((step, stepIndex) => {
                          if (step.work_id === '') return null;
                          const work = works.find((w) => Number(w.id) === Number(step.work_id));
                          const durationSec = step.actual_duration_sec !== '' ? step.actual_duration_sec : '';
                          const setDurationSec = (secStr) => {
                            if (secStr === '') { updateStep(spIndex, stepIndex, 'actual_duration_sec', ''); return; }
                            const num = Number(secStr);
                            if (Number.isNaN(num) || num < 0) return;
                            updateStep(spIndex, stepIndex, 'actual_duration_sec', String(Math.floor(num)));
                          };
                          return (
                            <div key={`${spIndex}-${stepIndex}`} className="process-step-task-card">
                              <div className="process-step-task-card-arrow" aria-hidden />
                              <div className="process-step-task-card-inner">
                                <div className="process-step-task-name-row">
                                  <span className="process-step-task-label">작업 명</span>
                                  <span className="process-step-task-name">{work?.name || `작업 #${step.work_id}`}</span>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); setWorkSelectContext({ spIndex, stepIndex }); }} className="process-step-icon-btn ml-1 shrink-0" title="작업 변경" aria-label="작업 변경">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                  </button>
                                </div>
                                <div className="process-step-task-time-row">
                                  <label className="process-step-task-time-label">소요시간 (초)</label>
                                  <input type="number" min={0} step={1} value={durationSec} onChange={(e) => setDurationSec(e.target.value === '' ? '' : e.target.value)} placeholder="초" className="process-step-task-time-input" />
                                  <button type="button" onClick={() => removeStep(spIndex, stepIndex)} className="process-step-task-delete" title="작업 제거" aria-label="작업 제거">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6z" /><path d="M9 6V5a1 1 0 011-1h4a1 1 0 011 1v1" /><path d="M3 6h18" /><path d="M10 11v5M14 11v5M12 11v5" /></svg>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 단계 설명 입력 — Excel Note 스타일 레이어 팝업 (Note 아이콘 오른쪽 위에 배치) */}
        {descriptionForSubProcessIndex != null && form.subProcesses[descriptionForSubProcessIndex] && descriptionPopupAnchor && createPortal(
          <div
            className="fixed inset-0 z-[9999]"
            style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.4)' }}
            onClick={() => { setDescriptionForSubProcessIndex(null); setDescriptionPopupAnchor(null); }}
            role="presentation"
          >
            <div
              className="excel-note-popup-wrap"
              style={{
                position: 'fixed',
                width: '220px',
                left: Math.min(descriptionPopupAnchor.right + 6, typeof window !== 'undefined' ? window.innerWidth - 226 : descriptionPopupAnchor.right + 6),
                top: Math.max(8, descriptionPopupAnchor.top - 8),
                zIndex: 10000,
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="설명 입력"
            >
              <div className="absolute -left-2 top-3 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-red-600" aria-hidden />
              <div className="excel-note-popup border border-black overflow-hidden shadow-lg" style={{ backgroundColor: '#FFFACD' }}>
                <div className="p-2">
                  <textarea
                    value={form.subProcesses[descriptionForSubProcessIndex].description}
                    onChange={(e) => updateSubProcess(descriptionForSubProcessIndex, 'description', e.target.value)}
                    placeholder="설명을 입력하세요"
                    className="excel-note-textarea w-full min-h-0 px-2 py-1.5 text-sm border-0 resize-y focus:outline-none focus:ring-0"
                    style={{ backgroundColor: '#FFFACD', minHeight: '80px' }}
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* 수정 시: 수정일자, 수정자 (한 행에 표시) */}
        {isEdit && (
          <div className="detail-view-bnk-card">
            <table className="detail-view-bnk-table w-full border-collapse">
              <tbody>
                <tr className="detail-view-bnk-row">
                  <td className="detail-view-bnk-label">수정일자</td>
                  <td className="detail-view-bnk-value">{readOnlyMeta.updated_at ? <ClientDate value={String(readOnlyMeta.updated_at)} /> : '-'}</td>
                  <td className="detail-view-bnk-label">수정자</td>
                  <td className="detail-view-bnk-value">{readOnlyMeta.updated_by || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? '저장 중...' : '저장'}</button>
          {inModal && onCancel ? <button type="button" onClick={onCancel} className="btn-outline">취소</button> : <Link to={isEdit ? `/processes/${processId}` : '/processes'} className="btn-outline inline-block">취소</Link>}
        </div>
      </form>

      {/* 작업 선택 레이어 팝업 (작업 추가 / 작업 수정) */}
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
