import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { ListPageWrap, TableHeader, Th, ActionCell } from '../components/ListPageWrap';
import LayerPopup from '../components/LayerPopup';
import PlanForm from '../components/Plans/PlanForm';
import UploadWizard from '../components/Plans/UploadWizard';
import AnalyzingModal from '../components/Plans/AnalyzingModal';
import PlanViewer from '../components/Plans/PlanViewer';

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

// ---------------------------------------------------------------------------
// 도면 목록 테이블
// ---------------------------------------------------------------------------
const LIST_POLL_INTERVAL_MS = 5000; // ANALYZING 항목 존재 시 폴링 주기

export function PlanList({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();
  const pollTimerRef = useRef(null);

  const fetchList = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('pageSize', String(pageSize));
    return apiFetch(`/api/plan?${params.toString()}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error || `HTTP ${res.status}`);
          setItems([]);
          setTotalCount(0);
          return;
        }
        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotalCount(typeof data?.total === 'number' ? data.total : 0);
        setError(null);
      })
      .catch((e) => { setError(e.message); setItems([]); setTotalCount(0); })
      .finally(() => { if (!silent) setLoading(false); });
  }, [currentPage, pageSize]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchList().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchList, refreshKey]);

  // ANALYZING 항목이 있으면 주기적으로 자동 갱신
  const hasAnalyzing = useMemo(
    () => items.some((r) => r.analysis_status === 'ANALYZING'),
    [items]
  );
  useEffect(() => {
    if (!hasAnalyzing) { clearTimeout(pollTimerRef.current); return; }
    pollTimerRef.current = setTimeout(() => fetchList(true), LIST_POLL_INTERVAL_MS);
    return () => clearTimeout(pollTimerRef.current);
  }, [hasAnalyzing, items, fetchList]);

  // 하위 경로에서 목록으로 돌아올 때 새로고침
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathRef.current !== '/plan' && location.pathname === '/plan') {
      setLoading(true);
      fetchList().finally(() => setLoading(false));
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, fetchList]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}" 도면을 삭제하시겠습니까?`)) return;
    const res = await apiFetch(`/api/plan/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error || '삭제 실패');
      return;
    }
    setItems((prev) => prev.filter((r) => r.id !== id));
    setTotalCount((t) => Math.max(0, t - 1));
  };

  return (
    <ListPageWrap
      title="도면 목록"
      primaryAction={
        <button
          type="button"
          className="btn-primary"
          onClick={() => navigate('/plan/new')}
        >
          도면 업로드
        </button>
      }
      tableTopRight={
        <select
          className="text-sm border rounded px-2 py-1.5 bg-white text-gray-700"
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
        >
          <option value="10">10개</option>
          <option value="20">20개</option>
          <option value="50">50개</option>
          <option value="100">100개</option>
        </select>
      }
      totalCount={totalCount}
      pageSize={pageSize}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
    >
      {loading ? (
        <div className="p-6 text-center text-gray-400 text-sm">로딩 중...</div>
      ) : error ? (
        <div className="p-6 text-center text-red-500 text-sm">목록을 불러올 수 없습니다. ({error})</div>
      ) : (
        <table className="w-full text-sm border-collapse">
          <TableHeader>
            <Th style={{ width: '5rem' }}>버전</Th>
            <Th>이름</Th>
            <Th className="hide-on-mobile" style={{ width: '7rem' }}>상태</Th>
            <Th className="hide-on-mobile" style={{ width: '8rem' }}>수정일자</Th>
            <Th className="hide-on-mobile" style={{ width: '10rem' }}>수정자</Th>
            <Th style={{ width: '8rem' }}>기능</Th>
          </TableHeader>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-400">
                  등록된 도면이 없습니다.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-b border hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-500 text-center">{row.version}</td>
                  <td className="py-2 px-3">
                    <Link
                      to={`/plan/${row.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {row.name}
                    </Link>
                    {(row.building || row.floor) && (
                      <span className="ml-2 text-xs text-gray-400">
                        {[row.building, row.floor ? `${row.floor}층` : ''].filter(Boolean).join(' ')}
                      </span>
                    )}
                    {row.factory_name && (
                      <span className="ml-2 text-xs text-gray-400">{row.factory_name}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 hide-on-mobile">
                    <StatusBadge status={row.analysis_status} />
                  </td>
                  <td className="py-2 px-3 hide-on-mobile text-gray-500">
                    {row.updated_at ? String(row.updated_at).slice(0, 10) : '-'}
                  </td>
                  <td className="py-2 px-3 hide-on-mobile text-gray-500">
                    {row.updated_by || '-'}
                  </td>
                  <ActionCell
                    editTo={`/plan/${row.id}/edit`}
                    onDelete={() => handleDelete(row.id, row.name)}
                  />
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </ListPageWrap>
  );
}

// ---------------------------------------------------------------------------
// PlanPage: /plan/* 라우팅 분기
//   /plan           → 목록
//   /plan/new       → 목록 + 업로드 wizard
//   /plan/:id/edit  → 목록 + 수정 팝업
//   /plan/:id       → 도면 뷰어 (step 9에서 구현, 현재 placeholder)
// ---------------------------------------------------------------------------
export default function PlanPage() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const pathname  = location.pathname;

  const isNew      = pathname === '/plan/new';
  const editMatch  = pathname.match(/^\/plan\/(\d+)\/edit$/);
  const viewMatch  = !isNew && !editMatch && pathname.match(/^\/plan\/(\d+)$/);
  const isEdit     = !!editMatch;
  const isView     = !!viewMatch;
  const editPlanId = editMatch?.[1];

  const goList = useCallback(() => navigate('/plan'), [navigate]);

  // 업로드 완료 후 분석 대기 상태
  // { planId, instructions, format } | null
  // step 6 에서 AnalyzingModal 이 이 값을 감시하고 analyze_cad 를 호출
  const [analyzingTarget, setAnalyzingTarget] = useState(null);

  const [refreshKey, setRefreshKey] = useState(0);

  // wizard 완료 콜백: 목록으로 이동 후 AnalyzingModal 활성화
  const handleWizardAnalyze = useCallback((planId, instructions, format) => {
    goList();
    setAnalyzingTarget({ planId, instructions, format });
  }, [goList]);

  // AnalyzingModal 완료 콜백
  const handleAnalysisComplete = useCallback(({ success, error }) => {
    setAnalyzingTarget(null);
    setRefreshKey((k) => k + 1);
    if (!success) {
      // 모달이 언마운트된 후 alert 표시
      setTimeout(() => alert(`분석 실패: ${error || '알 수 없는 오류'}`), 50);
    }
  }, []);

  // 도면 뷰어
  if (isView) {
    return <PlanViewer planId={Number(viewMatch[1])} />;
  }

  return (
    <>
      <PlanList refreshKey={refreshKey} />

      {/* 도면 업로드 wizard */}
      {isNew && (
        <LayerPopup title="도면 업로드" onClose={goList} maxWidth={560}>
          <UploadWizard
            onAnalyze={handleWizardAnalyze}
            onCancel={goList}
          />
        </LayerPopup>
      )}

      {/* 도면 수정 팝업 */}
      {isEdit && editPlanId && (
        <LayerPopup title="도면 수정" onClose={goList}>
          <PlanForm
            planId={Number(editPlanId)}
            onSuccess={goList}
            onCancel={goList}
          />
        </LayerPopup>
      )}

      {/* 분석 대기 모달 (LayerPopup 위에 렌더) */}
      {analyzingTarget && (
        <AnalyzingModal
          target={analyzingTarget}
          onComplete={handleAnalysisComplete}
        />
      )}
    </>
  );
}
