import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import LayerPopup from '../LayerPopup';
import PlanForm from './PlanForm';
import SymbolInfoBar from './SymbolInfoBar';
import SymbolEditPanel from './SymbolEditPanel';

// Shape of selectedSymbol state:
// { handle: string, data: object|null, svgCategory: string|null, svgFacility: string|null }

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
  const [reanalyzing,     setReanalyzing]     = useState(false);
  const [showEdit,        setShowEdit]        = useState(false);
  // Symbol interaction state (driven by postMessage from iframe)
  const [selectedSymbol,  setSelectedSymbol]  = useState(null);
  const [isEditMode,      setIsEditMode]      = useState(false);
  // { handle, x, y } | null  — set on SYMBOL_CONTEXTMENU, cleared on exit
  const [contextMenu,     setContextMenu]     = useState(null);
  // 범례·주석 목록 (GET /api/plan/:id/symbols 에서 로드)
  const [facilityLegend,  setFacilityLegend]  = useState([]);
  const [annotations,     setAnnotations]     = useState([]);
  // iframe 재로드 키 — 재분석 완료 시 증가
  const [viewerKey,       setViewerKey]       = useState(0);

  const navigate          = useNavigate();
  const pollTimerRef      = useRef(null);
  const iframeRef         = useRef(null);
  // Ref mirror of selectedSymbol — lets stable message-listener closures read latest value
  const selectedSymbolRef = useRef(null);
  useEffect(() => { selectedSymbolRef.current = selectedSymbol; }, [selectedSymbol]);

  // SymbolInfoBar 표시 여부를 body 클래스로 반영 → FAB 위치 CSS 조건부 조정
  useEffect(() => {
    if (selectedSymbol) {
      document.body.classList.add('symbol-infobar-open');
    } else {
      document.body.classList.remove('symbol-infobar-open');
    }
    return () => document.body.classList.remove('symbol-infobar-open');
  }, [selectedSymbol]);
  // 이전 analysis_status 추적 (ANALYZING → COMPLETED 전환 감지용)
  const prevStatusRef = useRef(null);

  // ── 심볼 인터랙션 상태 일괄 초기화 ──────────────────────────────
  const resetSymbolState = useCallback(() => {
    setSelectedSymbol(null);
    setIsEditMode(false);
    setContextMenu(null);
  }, []);

  // ANALYZING → COMPLETED 전환: iframe 재로드 + 심볼 상태 초기화
  // 재분석 전(handleReanalyze): plan 상태가 ANALYZING으로 바뀌면 심볼 상태만 초기화
  useEffect(() => {
    const status = plan?.analysis_status;
    const prev   = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status === 'ANALYZING' && prev !== 'ANALYZING') {
      // 재분석 시작 → 심볼 상태 초기화 (iframe은 아직 기존 SVG 유지)
      resetSymbolState();
    } else if (status === 'COMPLETED' && prev === 'ANALYZING') {
      // 재분석 완료 → iframe 재로드 + 상태 초기화
      setViewerKey(k => k + 1);
      resetSymbolState();
      setFacilityLegend([]);
      setAnnotations([]);
    }
  }, [plan?.analysis_status, resetSymbolState]);

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

  // ── iframe → React 메시지 수신 ────────────────────────────────────
  useEffect(() => {
    function handleMessage(ev) {
      // iframe 이외 출처 무시
      if (iframeRef.current && ev.source !== iframeRef.current.contentWindow) return;
      const msg = ev.data;
      if (!msg || typeof msg.type !== 'string') return;

      switch (msg.type) {
        case 'SYMBOL_CLICKED':
          setSelectedSymbol({
            handle:      msg.handle,
            data:        msg.data        ?? null,
            svgCategory: msg.svgCategory ?? null,
            svgFacility: msg.svgFacility ?? null,
          });
          break;
        case 'EDIT_MODE_ENTERED':
          setIsEditMode(true);
          break;
        case 'EDIT_MODE_EXITED':
          setIsEditMode(false);
          setContextMenu(null);
          break;

        case 'SYMBOL_CONTEXTMENU':
          setContextMenu({ handle: msg.handle, x: msg.clientX, y: msg.clientY });
          break;

        case 'SYMBOL_MOVED':
        case 'SYMBOL_RESIZED': {
          const handle = msg.handle;
          const sym    = selectedSymbolRef.current;
          // 현재 선택된 심볼의 기존 override 데이터 (없으면 빈 객체)
          const prev   = (sym?.handle === handle ? sym.data : null) ?? {};
          const category = prev.category || (sym?.handle === handle ? sym.svgCategory : null) || 'UNDEFINED';

          const body = {
            handle,
            category,
            description:   prev.description   ?? null,
            center_x:      msg.type === 'SYMBOL_MOVED'   ? msg.center_x         : (prev.center_x   ?? null),
            center_y:      msg.type === 'SYMBOL_MOVED'   ? msg.center_y         : (prev.center_y   ?? null),
            width:         msg.type === 'SYMBOL_RESIZED' ? msg.width            : (prev.width      ?? null),
            height:        msg.type === 'SYMBOL_RESIZED' ? msg.height           : (prev.height     ?? null),
            legend:        prev.legend        ?? null,
            annotation_id: prev.annotation_id ?? null,
          };

          apiFetch(`/api/plan/${planId}/symbols`, {
            method: 'PUT',
            body:   JSON.stringify(body),
          })
            .then(res => res.ok ? res.json() : null)
            .then(saved => {
              if (!saved) return;
              // selectedSymbol.data 를 저장된 결과로 갱신
              setSelectedSymbol(prev =>
                prev?.handle === handle ? { ...prev, data: saved } : prev
              );
              // iframe 의 symbolOverrideMap 도 동기화
              iframeRef.current?.contentWindow?.postMessage(
                { type: 'SYMBOL_SAVED', data: saved }, '*'
              );
            })
            .catch(() => {});
          break;
        }

        default:
          break;
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  // planId는 컴포넌트 수명 내 불변(route re-mount). selectedSymbol은 ref로 접근.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** iframe 으로 메시지 전송 (4-3/4-4에서 사용) */
  const sendToIframe = useCallback((msg) => {
    iframeRef.current?.contentWindow?.postMessage(msg, '*');
  }, []);

  /** 편집 패널 닫기: iframe에 EXIT_EDIT 전송 (viewer가 editMode 종료 + EDIT_MODE_EXITED 회신) */
  const handleCloseEditPanel = useCallback(() => {
    sendToIframe({ type: 'EXIT_EDIT' });
  }, [sendToIframe]);

  /** 컨텍스트 메뉴 닫기 */
  const handleCloseContextMenu = useCallback(() => setContextMenu(null), []);

  /** 심볼 정보 바 닫기: 편집 중이면 EXIT_EDIT도 전송 */
  const handleInfoBarClose = useCallback(() => {
    if (isEditMode) sendToIframe({ type: 'EXIT_EDIT' });
    setSelectedSymbol(null);
  }, [isEditMode, sendToIframe]);

  /**
   * 심볼 override 저장 (5-5에서 호출)
   * body: { handle, category, description?, center_x?, center_y?, width?, height?, legend?, annotation_id? }
   * 저장 성공 시 selectedSymbol.data 갱신 + SYMBOL_SAVED → iframe
   */
  const handleSymbolSave = useCallback(async (body) => {
    const res = await apiFetch(`/api/plan/${planId}/symbols`, {
      method: 'PUT',
      body:   JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `HTTP ${res.status}`);
    }
    const saved = await res.json();
    setSelectedSymbol(prev =>
      prev?.handle === saved.handle ? { ...prev, data: saved } : prev
    );
    sendToIframe({ type: 'SYMBOL_SAVED', data: saved });
    return saved;
  }, [planId, sendToIframe]);

  /**
   * 심볼 override 삭제 (5-5에서 호출)
   * 삭제 성공 시 selectedSymbol.data 초기화 + SYMBOL_OVERRIDE_DELETED → iframe
   */
  const handleSymbolDelete = useCallback(async (handle) => {
    const res = await apiFetch(
      `/api/plan/${planId}/symbols?handle=${encodeURIComponent(handle)}`,
      { method: 'DELETE' }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `HTTP ${res.status}`);
    }
    setSelectedSymbol(prev =>
      prev?.handle === handle ? { ...prev, data: null } : prev
    );
    sendToIframe({ type: 'SYMBOL_OVERRIDE_DELETED', handle });
  }, [planId, sendToIframe]);

  // ── facilityLegend / annotations 로드 (COMPLETED 전환 시 1회) ───────────
  useEffect(() => {
    if (plan?.analysis_status !== 'COMPLETED') return;
    let cancelled = false;
    apiFetch(`/api/plan/${planId}/symbols`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (cancelled || !data) return;
        if (Array.isArray(data.facilityLegend)) setFacilityLegend(data.facilityLegend);
        if (Array.isArray(data.annotations))    setAnnotations(data.annotations);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [plan?.analysis_status, planId]);

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
        <div className="plan-viewer-body">
          <iframe
            ref={iframeRef}
            key={`${planId}-${viewerKey}`}
            className="plan-viewer-iframe"
            src={`/api/plan/${planId}/viewer`}
            title="도면 뷰어"
            allowFullScreen
          />
          {/* 심볼 정보 바 (심볼 클릭 시 하단 overlay) */}
          <SymbolInfoBar
            symbol={selectedSymbol}
            isEditMode={isEditMode}
            onClose={handleInfoBarClose}
          />
          {/* 심볼 편집 패널 (더블클릭 → 편집 모드 진입 시 우측 overlay) */}
          {isEditMode && selectedSymbol && (
            <SymbolEditPanel
              symbol={selectedSymbol}
              facilityLegend={facilityLegend}
              annotations={annotations}
              onClose={handleCloseEditPanel}
              onSave={handleSymbolSave}
              onDelete={handleSymbolDelete}
            />
          )}
        </div>
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

    {/* 우클릭 컨텍스트 메뉴 */}
    {contextMenu && (
      <>
        <div className="symbol-ctx-overlay" onClick={handleCloseContextMenu} />
        <div
          className="symbol-ctx-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {isEditMode && (
            <button
              type="button"
              className="symbol-ctx-item"
              onClick={() => { handleCloseContextMenu(); handleCloseEditPanel(); }}
            >
              편집 종료
            </button>
          )}
          {selectedSymbol?.data && (
            <button
              type="button"
              className="symbol-ctx-item symbol-ctx-item-danger"
              onClick={() => {
                handleCloseContextMenu();
                handleSymbolDelete(contextMenu.handle).catch(() => {});
              }}
            >
              오버라이드 초기화
            </button>
          )}
          <button
            type="button"
            className="symbol-ctx-item"
            onClick={handleCloseContextMenu}
          >
            닫기
          </button>
        </div>
      </>
    )}

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
