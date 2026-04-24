import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../../lib/api';

// 현재 허용 형식. stage 1/2 확장 시 이 목록에 추가
const ACCEPTED_EXTS = ['dxf'];
const ACCEPT_ATTR   = ACCEPTED_EXTS.map((e) => `.${e}`).join(',');

function fileBaseName(file) {
  return file.name.replace(/\.[^/.]+$/, '');
}

function formatBytes(bytes) {
  if (bytes < 1024)      return `${bytes} B`;
  if (bytes < 1024**2)   return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024**2).toFixed(1)} MB`;
}

/**
 * 도면 업로드 위저드 (step 1~3)
 *
 * Step 1 – 파일 선택 + 이름·공장 입력
 * Step 2 – MinIO 업로드 + 악성 파일 검증 (현재 stub)
 * Step 3 – 분석 보조 정보 입력
 *
 * onAnalyze(planId, additionalInstructions | null, format) 콜백으로 완료 신호 전달
 */
export default function UploadWizard({ onAnalyze, onCancel }) {
  const [step,   setStep]   = useState(1);
  const [file,   setFile]   = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [form,   setForm]   = useState({ name: '', factory_id: '', building: '', floor: '1' });
  const [factories, setFactories] = useState([]);
  const [uploadErr, setUploadErr] = useState(null);
  const [instructions, setInstructions] = useState('');
  const [createdPlanId, setCreatedPlanId] = useState(null);
  const [detectedFormat,  setDetectedFormat]  = useState(null);

  const fileInputRef = useRef(null);

  // 공장 목록
  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/factories?pageSize=500')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => { if (!cancelled && Array.isArray(d.items)) setFactories(d.items); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // ── 파일 선택 처리 ───────────────────────────────────────────
  const selectFile = useCallback((selected) => {
    if (!selected) return;
    const ext = selected.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ACCEPTED_EXTS.includes(ext)) {
      alert(`지원하지 않는 파일 형식입니다.\n현재 허용 형식: ${ACCEPTED_EXTS.map((e) => `.${e}`).join(', ')}`);
      return;
    }
    setFile(selected);
    setUploadErr(null);
    // 파일명을 도면 이름으로 자동 완성 (이미 입력값이 있으면 유지)
    setForm((prev) => ({ ...prev, name: prev.name || fileBaseName(selected) }));
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    selectFile(e.dataTransfer.files?.[0]);
  }, [selectFile]);

  // ── Step 1 → 2: 업로드 실행 ──────────────────────────────────
  const handleUpload = async () => {
    if (!file) return;
    const name     = form.name.trim();
    const building = form.building.trim();
    const floor    = form.floor.trim();
    if (!name)     { alert('도면 이름을 입력해 주세요.'); return; }
    if (!building) { alert('건물 이름을 입력해 주세요.'); return; }
    if (!floor)    { alert('층을 입력해 주세요.'); return; }

    setStep(2);
    setUploadErr(null);

    try {
      // ① MinIO 업로드
      const fd = new FormData();
      fd.append('file', file);
      fd.append('prefix', 'plans');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) throw new Error(uploadData?.error || '파일 업로드에 실패했습니다.');

      const { url: fileUrl, format: fmt } = uploadData;
      setDetectedFormat(fmt);

      // ② plan 레코드 생성
      const planRes = await apiFetch('/api/plan', {
        method: 'POST',
        body: JSON.stringify({
          name,
          factory_id: form.factory_id ? Number(form.factory_id) : null,
          building,
          floor,
          original_file_name: file.name,
          original_file_format: fmt ?? ACCEPTED_EXTS[0],
          original_file_path: fileUrl,
          file_size: file.size,
        }),
      });
      const planData = await planRes.json().catch(() => ({}));
      if (!planRes.ok) throw new Error(planData?.error || 'plan 등록에 실패했습니다.');

      setCreatedPlanId(planData.id);

      // ③ 악성 파일 검증 (stub: 실제 구현 시 교체)
      //    현재는 400ms 대기 후 통과 처리
      await new Promise((r) => setTimeout(r, 400));

      setStep(3);
    } catch (e) {
      setUploadErr(e.message || '업로드 중 오류가 발생했습니다.');
      setStep(1);
    }
  };

  // ── Step 3: 분석 시작 ─────────────────────────────────────────
  const handleAnalyze = () => {
    const text = instructions.trim();
    if (!text) {
      const confirmed = window.confirm('추가 정보 없이 계속하시겠습니까?');
      if (!confirmed) return;
    }
    onAnalyze(createdPlanId, text || null, detectedFormat ?? ACCEPTED_EXTS[0]);
  };

  // ────────────────────────────────────────────────────────────
  // Step 1: 파일 선택
  // ────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="flex flex-col gap-4">

        {/* 드래그 앤 드롭 영역 */}
        <div
          className={`plan-upload-drop${dragOver ? ' plan-upload-drop-over' : ''}`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="파일 선택 영역"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            style={{ display: 'none' }}
            onChange={(e) => selectFile(e.target.files?.[0])}
          />
          {file ? (
            <div className="plan-upload-drop-selected">
              <span className="plan-upload-icon">📄</span>
              <span className="font-medium text-gray-700 text-sm">{file.name}</span>
              <span className="text-gray-400 text-xs">{formatBytes(file.size)}</span>
              <span className="text-xs text-blue-500 underline mt-1">다른 파일 선택</span>
            </div>
          ) : (
            <div className="plan-upload-drop-placeholder">
              <span className="plan-upload-icon">⬆</span>
              <p className="text-sm text-gray-500">파일을 드래그하거나 클릭하여 선택하세요</p>
              <p className="text-xs text-gray-400">
                현재 지원 형식: {ACCEPTED_EXTS.map((e) => `.${e}`).join(', ')}
              </p>
            </div>
          )}
        </div>

        {uploadErr && (
          <p className="text-sm text-red-500 bg-red-50 rounded px-3 py-2">{uploadErr}</p>
        )}

        {/* 도면 이름 */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            도면 이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="도면 이름을 입력하세요"
          />
        </div>

        {/* 건물 / 층 */}
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm font-medium text-gray-700">
              건물 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.building}
              onChange={(e) => setForm((p) => ({ ...p, building: e.target.value }))}
              className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="예) A동"
            />
          </div>
          <div className="flex flex-col gap-1" style={{ width: '6rem' }}>
            <label className="text-sm font-medium text-gray-700">
              층 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.floor}
              onChange={(e) => setForm((p) => ({ ...p, floor: e.target.value }))}
              className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="예) 1"
            />
          </div>
        </div>

        {/* 연관 공장 */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">연관 공장</label>
          <select
            value={form.factory_id}
            onChange={(e) => setForm((p) => ({ ...p, factory_id: e.target.value }))}
            className="border rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">선택 안 함</option>
            {factories.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-outline" onClick={onCancel}>취소</button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleUpload}
            disabled={!file}
          >
            다음
          </button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // Step 2: 업로드 / 검증 중
  // ────────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="plan-spinner" role="status" aria-label="처리 중" />
        <p className="text-sm text-gray-600">파일을 업로드하고 검증 중입니다...</p>
        <p className="text-xs text-gray-400">잠시만 기다려 주세요.</p>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // Step 3: 추가 정보 입력
  // ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600 leading-relaxed">
        이 도면을 분석하는 데 필요한 추가 지식, 정보를 자유롭게 입력해 주세요.
        이 지식은 도면 분석의 정확도를 향상시키는 데에 활용됩니다.
      </p>
      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        className="border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
        rows={7}
        placeholder="예) 1층 생산라인 중심으로 분석해 주세요. 기계 배치 위주로 Annotation을 작성해 주세요."
      />
      <div className="flex justify-between items-center pt-1">
        <button
          type="button"
          className="text-sm text-gray-400 hover:text-gray-600 underline"
          onClick={() => { setStep(1); setUploadErr(null); }}
        >
          ← 처음으로
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleAnalyze}
        >
          분석 시작
        </button>
      </div>
    </div>
  );
}
