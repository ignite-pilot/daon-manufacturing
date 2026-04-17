import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';

const STATUS_MAP = {
  PENDING:   { label: '대기',    cls: 'plan-status-pending' },
  ANALYZING: { label: '분석 중', cls: 'plan-status-analyzing' },
  COMPLETED: { label: '완료',    cls: 'plan-status-completed' },
  FAILED:    { label: '실패',    cls: 'plan-status-failed' },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status || '-', cls: '' };
  return <span className={`plan-status-badge ${s.cls}`}>{s.label}</span>;
}

/**
 * 도면 뷰어 페이지 (step 7)
 *
 * - COMPLETED 상태 도면: plan_viewer/viewer.html 을 iframe 으로 embed
 * - 그 외 상태: 상태별 안내 메시지 표시
 *
 * @param {{ planId: number }} props
 */
export default function PlanViewer({ planId }) {
  const [plan,    setPlan]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/plan/${planId}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !data) { setError(data?.error || `HTTP ${res.status}`); return; }
        setPlan(data);
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [planId]);

  const goList = useCallback(() => navigate('/plan'), [navigate]);
  const goEdit = useCallback(() => navigate(`/plan/${planId}/edit`), [navigate, planId]);

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

  const isCompleted = plan.analysis_status === 'COMPLETED';
  const isAnalyzing = plan.analysis_status === 'ANALYZING';
  const isFailed    = plan.analysis_status === 'FAILED';

  return (
    <div className="plan-viewer-wrap">
      {/* 상단 헤더 */}
      <div className="plan-viewer-header">
        <div className="plan-viewer-header-left">
          <button type="button" className="plan-viewer-back" onClick={goList}>
            ← 목록
          </button>
          <h2 className="plan-viewer-title">{plan.name}</h2>
          {plan.factory_name && (
            <span className="plan-viewer-factory">{plan.factory_name}</span>
          )}
          <StatusBadge status={plan.analysis_status} />
        </div>
        <div className="plan-viewer-header-right">
          <span className="plan-viewer-meta">v{plan.version}</span>
          {plan.updated_at && (
            <span className="plan-viewer-meta hide-on-mobile">
              {String(plan.updated_at).slice(0, 10)}
            </span>
          )}
          {plan.updated_by && (
            <span className="plan-viewer-meta hide-on-mobile">{plan.updated_by}</span>
          )}
          <button type="button" className="btn-outline" style={{ fontSize: '0.8125rem' }} onClick={goEdit}>
            수정
          </button>
        </div>
      </div>

      {/* 뷰어 / 상태 영역 */}
      {isCompleted ? (
        <iframe
          className="plan-viewer-iframe"
          src="/plan_viewer/viewer.html"
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
                <p className="text-xs text-gray-400">분석이 완료되면 뷰어가 표시됩니다.</p>
              </>
            )}
            {!isAnalyzing && !isFailed && (
              <p className="text-sm text-gray-500">도면 분석이 시작되지 않았습니다.</p>
            )}
            {isFailed && (
              <>
                <p className="text-sm text-red-500">도면 분석에 실패했습니다.</p>
                {plan.analysis_error && (
                  <p className="text-xs text-gray-400 mt-1">{plan.analysis_error}</p>
                )}
              </>
            )}
            <button type="button" className="btn-outline mt-4" onClick={goList}>
              목록으로 돌아가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
