import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import LayerPopup from '../LayerPopup';
import PlanForm from './PlanForm';

const STATUS_MAP = {
  PENDING:   { label: '대기',    cls: 'plan-status-pending' },
  ANALYZING: { label: '분석 중', cls: 'plan-status-analyzing' },
  COMPLETED: { label: '완료',    cls: 'plan-status-completed' },
  FAILED:    { label: '실패',    cls: 'plan-status-failed' },
};

const POLL_INTERVAL_MS = 5000;

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status || '-', cls: '' };
  return <span className={`plan-status-badge ${s.cls}`}>{s.label}</span>;
}

/**
 * 도면 뷰어 페이지
 *
 * iframe src = /api/plan/:id/viewer
 *   → Next.js 가 MinIO에서 SVG·메타데이터를 fetch하여 viewer.html 에 주입 후 반환
 *   → URL 파라미터 불필요. CORS 문제 없음.
 *   → MinIO 미가동 / stub 경로인 경우 내장 샘플 데이터로 폴백
 *
 * 상태별 동작:
 *   COMPLETED → iframe 표시
 *   ANALYZING → 5초 폴링 → 완료 시 자동 전환
 *   PENDING   → 분석 시작 버튼
 *   FAILED    → 에러 메시지 + 재분석 버튼
 */
export default function PlanViewer({ planId }) {
  const [plan,        setPlan]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [showEdit,    setShowEdit]    = useState(false);
  const navigate     = useNavigate();
  const pollTimerRef = useRef(null);

  // ── 도면 정보 로드 ─────────────────────────────────────────────
  const loadPlan = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    return apiFetch(`/api/plan/${planId}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) { setError(data?.error || `HTTP ${res.status}`); return null; }
        setError(null);
        setPlan(data);
        return data;
      })
      .catch((e) => { setError(e.message); return null; })
      .finally(() => { if (!silent) setLoading(false); });
  }, [planId]);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  // ── ANALYZING 상태 폴링 ────────────────────────────────────────
  useEffect(() => {
    if (plan?.analysis_status !== 'ANALYZING') {
      clearTimeout(pollTimerRef.current);
      return;
    }
    pollTimerRef.current = setTimeout(() => loadPlan(true), POLL_INTERVAL_MS);
    return () => clearTimeout(pollTimerRef.current);
  }, [plan, loadPlan]);

  // ── 재분석 실행 ────────────────────────────────────────────────
  const handleReanalyze = useCallback(async () => {
    if (!plan) return;
    if (!window.confirm(
      `"${plan.name}" 도면을 재분석하시겠습니까?\n기존 분석 결과가 새 결과로 교체됩니다.`
    )) return;

    setReanalyzing(true);
    try {
      const res = await apiFetch(
        `/api/plan/${planId}/analyze_cad?format=${plan.original_file_format ?? 'dxf'}`,
        { method: 'POST', body: JSON.stringify({ additional_instructions: plan.additional_instructions ?? null }) }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(`재분석 실패: ${data?.error || `HTTP ${res.status}`}`); return; }
      setPlan(data);
    } catch (e) {
      alert(`재분석 오류: ${e.message || '알 수 없는 오류'}`);
    } finally {
      setReanalyzing(false);
    }
  }, [plan, planId]);

  const goList    = useCallback(() => navigate('/plan'), [navigate]);
  const openEdit  = useCallback(() => setShowEdit(true), []);
  const closeEdit = useCallback(() => setShowEdit(false), []);
  const handleEditSuccess = useCallback(() => {
    setShowEdit(false);
    loadPlan(true);
  }, [loadPlan]);

  // ── 렌더 ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="plan-viewer-wrap plan-viewer-center">
        <div className="plan-spinner" role="status" aria-label="로딩 중" />
        <p className="text-sm text-gray-400 mt-3">도면 정보를 불러오는 중...</p>
      </div>
    );
  }
  if (error || !plan) {
    return (
      <div className="plan-viewer-wrap plan-viewer-center">
        <p className="text-sm text-red-500">도면 정보를 불러올 수 없습니다. ({error})</p>
        <button type="button" className="btn-outline mt-4" onClick={goList}>목록으로</button>
      </div>
    );
  }

  const isCompleted  = plan.analysis_status === 'COMPLETED';
  const isAnalyzing  = plan.analysis_status === 'ANALYZING';
  const isFailed     = plan.analysis_status === 'FAILED';
  const canReanalyze = !isAnalyzing && !reanalyzing;

  return (
    <>
    <div className="plan-viewer-wrap">
      {/* 상단 헤더 */}
      <div className="plan-viewer-header">
        <div className="plan-viewer-header-left">
          <button type="button" className="plan-viewer-back" onClick={goList}>← 목록</button>
          <h2 className="plan-viewer-title">{plan.name}</h2>
          {plan.factory_name && <span className="plan-viewer-factory">{plan.factory_name}</span>}
          <StatusBadge status={plan.analysis_status} />
          {isAnalyzing && <span className="plan-viewer-polling-hint">자동 갱신 중</span>}
        </div>
        <div className="plan-viewer-header-right">
          <span className="plan-viewer-meta">v{plan.version}</span>
          {plan.updated_at && (
            <span className="plan-viewer-meta hide-on-mobile">{String(plan.updated_at).slice(0, 10)}</span>
          )}
          {plan.updated_by && (
            <span className="plan-viewer-meta hide-on-mobile">{plan.updated_by}</span>
          )}
          {canReanalyze && (
            <button type="button" className="btn-outline" style={{ fontSize: '0.8125rem' }} onClick={handleReanalyze}>
              재분석
            </button>
          )}
          {reanalyzing && <span className="plan-viewer-meta">재분석 시작 중...</span>}
          <button type="button" className="btn-outline" style={{ fontSize: '0.8125rem' }} onClick={openEdit}>
            수정
          </button>
        </div>
      </div>

      {/* 뷰어 / 상태 영역 */}
      {isCompleted ? (
        <iframe
          key={planId}
          className="plan-viewer-iframe"
          src={`/api/plan/${planId}/viewer`}
          title="도면 뷰어"
          allowFullScreen
        />
      ) : (
        <div className="plan-viewer-placeholder">
          <div className="plan-viewer-placeholder-inner">
            {isAnalyzing && (
              <>
                <div className="plan-spinner" />
                <p className="text-sm text-gray-600 mt-2">도면 분석 중입니다...</p>
                <p className="text-xs text-gray-400">분석이 완료되면 뷰어가 자동으로 표시됩니다.</p>
              </>
            )}
            {!isAnalyzing && !isFailed && (
              <>
                <p className="text-sm text-gray-500">도면 분석이 시작되지 않았습니다.</p>
                <button
                  type="button" className="btn-primary mt-4" style={{ fontSize: '0.875rem' }}
                  onClick={handleReanalyze} disabled={reanalyzing}
                >
                  분석 시작
                </button>
              </>
            )}
            {isFailed && (
              <>
                <p className="text-sm text-red-500">도면 분석에 실패했습니다.</p>
                {plan.analysis_error && (
                  <p className="plan-viewer-error-detail mt-1">{plan.analysis_error}</p>
                )}
                <button
                  type="button" className="btn-primary mt-4" style={{ fontSize: '0.875rem' }}
                  onClick={handleReanalyze} disabled={reanalyzing}
                >
                  재분석
                </button>
              </>
            )}
            <button type="button" className="btn-outline mt-3" onClick={goList}>
              목록으로 돌아가기
            </button>
          </div>
        </div>
      )}
    </div>

    {showEdit && (
      <LayerPopup title="도면 수정" onClose={closeEdit}>
        <PlanForm
          planId={planId}
          onSuccess={handleEditSuccess}
          onCancel={closeEdit}
        />
      </LayerPopup>
    )}
    </>
  );
}
