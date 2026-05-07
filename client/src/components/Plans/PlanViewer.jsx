import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
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
const CTX_OFFSET_X     = 8; // 우클릭 좌표 기준 메뉴 좌측 여백 (px)

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
  const ctxMenuRef        = useRef(null);
  // Ref mirrors — stable message-listener closures에서 최신 state 읽기용
  const selectedSymbolRef = useRef(null);
  const isEditModeRef     = useRef(false);
  // 편집 진입 시점의 symbol.data 스냅샷 — 취소 시 복원용
  const editStartDataRef  = useRef(null);
  useEffect(() => { selectedSymbolRef.current = selectedSymbol; }, [selectedSymbol]);
  useEffect(() => { isEditModeRef.current     = isEditMode;     }, [isEditMode]);

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

  // ── 컨텍스트 메뉴 viewport-aware 포지셔닝 ───────────────────────────
  // useLayoutEffect: DOM 변경 직후 paint 전에 실행 → 깜빡임 없이 위치 계산
  useLayoutEffect(() => {
    const el = ctxMenuRef.current;
    if (!el || !contextMenu) return;

    // 먼저 숨기고 측정 (측정 중 렌더 노출 방지)
    el.style.visibility = 'hidden';
    el.style.left   = '0';
    el.style.top    = '0';
    el.style.right  = 'auto';
    el.style.bottom = 'auto';

    const { width: menuW, height: menuH } = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const defaultLeft = contextMenu.x + CTX_OFFSET_X;
    const defaultTop  = contextMenu.y;

    // 수평: 우측 초과 → 클릭 좌표 왼쪽으로 전환
    if (defaultLeft + menuW > vw) {
      el.style.left  = 'auto';
      el.style.right = `${vw - (contextMenu.x - CTX_OFFSET_X)}px`;
    } else {
      el.style.left  = `${defaultLeft}px`;
      el.style.right = 'auto';
    }

    // 수직: 하단 초과 → 클릭 좌표 위쪽으로 전환
    if (defaultTop + menuH > vh) {
      el.style.top    = 'auto';
      el.style.bottom = `${vh - contextMenu.y}px`;
    } else {
      el.style.top    = `${defaultTop}px`;
      el.style.bottom = 'auto';
    }

    el.style.visibility = 'visible';
  }, [contextMenu]);

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
          setContextMenu(null);
          editStartDataRef.current = selectedSymbolRef.current?.data ?? null;
          break;
        case 'EDIT_MODE_EXITED':
          setIsEditMode(false);
          setContextMenu(null);
          break;

        case 'SYMBOL_CONTEXTMENU': {
          // 편집 모드에서는 우측 패널로 편집하므로 컨텍스트 메뉴 표시 안 함
          if (isEditModeRef.current) break;
          // msg.clientX/Y는 iframe 뷰포트 기준 → 메인 창 뷰포트 기준으로 변환
          const iframeRect = iframeRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
          setContextMenu({
            handle: msg.handle,
            x: msg.clientX + iframeRect.left,
            y: msg.clientY + iframeRect.top,
          });
          break;
        }

        case 'SYMBOL_MOVED':
        case 'SYMBOL_RESIZED': {
          // 드래그·리사이즈는 DB에 즉시 저장하지 않는다.
          // [저장] 클릭 시 편집 패널 폼 값(이 업데이트를 반영한)이 한꺼번에 저장됨.
          // [취소] 클릭 시 iframe이 시각을 원복하고 아래 로컬 state도 원복된다.
          // edge 핸들 리사이즈는 center_x/y 도 변경되므로 null-safe merge 사용.
          const handle = msg.handle;
          setSelectedSymbol(prev => {
            if (!prev || prev.handle !== handle) return prev;
            const prevData = prev.data ?? {};
            return {
              ...prev,
              data: {
                ...prevData,
                handle,
                center_x: msg.center_x != null ? msg.center_x : (prevData.center_x ?? null),
                center_y: msg.center_y != null ? msg.center_y : (prevData.center_y ?? null),
                width:    msg.width    != null ? msg.width    : (prevData.width    ?? null),
                height:   msg.height   != null ? msg.height   : (prevData.height   ?? null),
              },
            };
          });
          break;
        }

        case 'SYMBOL_COORDS_CHANGED': {
          // undo/redo 후 폼 좌표 동기화
          const { handle: cHandle, center_x, center_y, width, height } = msg;
          setSelectedSymbol(prev => {
            if (!prev || prev.handle !== cHandle) return prev;
            const prevData = prev.data ?? {};
            return {
              ...prev,
              data: { ...prevData, handle: cHandle, center_x, center_y, width, height },
            };
          });
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

  /** 편집 취소: iframe에 EXIT_EDIT_CANCEL 전송 → viewer가 시각 원복 + editMode 종료.
   *  selectedSymbol.data도 편집 진입 시점 값으로 복원한다. */
  const handleCloseEditPanel = useCallback(() => {
    sendToIframe({ type: 'EXIT_EDIT_CANCEL' });
    const revertData = editStartDataRef.current;
    setSelectedSymbol(prev => prev ? { ...prev, data: revertData } : prev);
    editStartDataRef.current = null;
  }, [sendToIframe]);

  // 편집 모드 중 SymbolEditPanel이 포커스를 가져가면 iframe의 keydown이 동작하지 않으므로
  // 부모 창에서도 ESC / Ctrl+Z / Ctrl+Y 를 감지해 iframe으로 전달
  useEffect(() => {
    if (!isEditMode) return;
    function onKeyDown(ev) {
      if (ev.key === 'Escape') { handleCloseEditPanel(); return; }
      const mod = ev.ctrlKey || ev.metaKey;
      if (!mod) return;
      const tag = ev.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (ev.key === 'z' || ev.key === 'Z') {
        ev.preventDefault();
        sendToIframe({ type: 'UNDO' });
      } else if (ev.key === 'y' || ev.key === 'Y') {
        ev.preventDefault();
        sendToIframe({ type: 'REDO' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isEditMode, handleCloseEditPanel, sendToIframe]);

  /** 컨텍스트 메뉴 닫기 */
  const handleCloseContextMenu = useCallback(() => setContextMenu(null), []);

  /** 심볼 정보 바 닫기: 편집 중이면 취소(원복) 처리 */
  const handleInfoBarClose = useCallback(() => {
    if (isEditModeRef.current) {
      sendToIframe({ type: 'EXIT_EDIT_CANCEL' });
      editStartDataRef.current = null;
    }
    setSelectedSymbol(null);
  }, [sendToIframe]);

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
    editStartDataRef.current = null;
    // EXIT_EDIT(원복 없음) → iframe overlay 클리어 + editMode 종료
    // SYMBOL_SAVED → iframe이 저장된 값으로 시각적 transform 적용
    sendToIframe({ type: 'EXIT_EDIT' });
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
          ref={ctxMenuRef}
          className="symbol-ctx-menu"
          style={{ visibility: 'hidden' }}
        >
          <button
            type="button"
            className="symbol-ctx-item"
            onClick={() => {
              handleCloseContextMenu();
              sendToIframe({ type: 'ENTER_EDIT', handle: contextMenu.handle });
            }}
          >
            수정
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
