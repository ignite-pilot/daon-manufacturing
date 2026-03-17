import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { ListPageWrap, TableHeader, Th, ActionCell } from '../components/ListPageWrap';

/**
 * PRD 작업 목록
 * 검색 조건: 작업 이름, 적용 공정
 * PC: 작업 이름, 예상 소요시간, 수정일자, 수정자, 기능
 * Mobile: 작업 이름, 기능
 */
export function WorkList() {
  const [items, setItems] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const bulkInputRef = useRef(null);
  const workNameRef = useRef(null);
  const processIdRef = useRef(null);
  const lastFocusedSearchRef = useRef(null);
  const restoreFocusAfterSearchRef = useRef(false);
  const [filter, setFilter] = useState({
    workName: '',
    processId: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTrigger, setSearchTrigger] = useState(0);

  const fetchList = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('pageSize', String(pageSize));
    if (filter.workName.trim()) params.set('workName', filter.workName.trim());
    if (filter.processId) params.set('processId', filter.processId);
    return apiFetch(`/api/works?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { items: [], total: 0 }))
      .then((d) => {
        setItems(Array.isArray(d.items) ? d.items : []);
        setTotalCount(typeof d.total === 'number' ? d.total : 0);
      });
  }, [currentPage, pageSize, filter.workName, filter.processId]);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/processes?pageSize=500')
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((d) => { if (!cancelled && Array.isArray(d.items)) setProcesses(d.items); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchList()
      .then(() => setError(null))
      .catch((e) => { if (!cancelled) setError(e.message); setItems([]); })
      .finally(() => {
        if (!cancelled) setLoading(false);
        if (restoreFocusAfterSearchRef.current && lastFocusedSearchRef.current) {
          const el = lastFocusedSearchRef.current;
          restoreFocusAfterSearchRef.current = false;
          setTimeout(() => el?.focus(), 0);
        }
      });
    return () => { cancelled = true; };
  }, [fetchList, searchTrigger]);

  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    const listPath = '/works';
    const isListPath = location.pathname === listPath;
    const cameFromChild = prevPathRef.current !== listPath && isListPath;
    prevPathRef.current = location.pathname;
    if (cameFromChild) {
      setLoading(true);
      fetchList()
        .then(() => setError(null))
        .catch((e) => { setError(e.message); setItems([]); })
        .finally(() => setLoading(false));
    }
  }, [location.pathname, fetchList]);

  const handleSearch = (e) => {
    e.preventDefault();
    const active = document.activeElement;
    const refs = [workNameRef, processIdRef];
    if (active && refs.some((r) => r.current === active)) {
      lastFocusedSearchRef.current = active;
    } else {
      lastFocusedSearchRef.current = lastFocusedSearchRef.current || refs.find((r) => r.current)?.current;
    }
    restoreFocusAfterSearchRef.current = true;
    setCurrentPage(1);
    setSearchTrigger((s) => s + 1);
  };

  const handleReset = () => {
    setFilter({ workName: '', processId: '' });
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}" 작업을 삭제하시겠습니까?`)) return;
    const res = await apiFetch(`/api/works/${id}`, { method: 'DELETE' });
    const data = res.ok ? null : await res.json();
    if (!res.ok) {
      alert(data?.error || '삭제 실패');
      return;
    }
    setItems((prev) => prev.filter((r) => r.id !== id));
    setTotalCount((t) => Math.max(0, t - 1));
  };

  const handleBulkClick = () => {
    bulkInputRef.current?.click();
  };

  const handleBulkFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setBulkUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch('/api/works/bulk', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || '일괄 등록에 실패했습니다.');
        return;
      }
      if (data.error) {
        alert(`${data.success ?? 0}건 등록. 오류: ${data.error}`);
      } else {
        alert(`${data.success ?? 0}건 등록되었습니다.`);
      }
      setLoading(true);
      await fetchList();
      setError(null);
    } catch (err) {
      alert(err?.message || '일괄 등록 중 오류가 발생했습니다.');
    } finally {
      setBulkUploading(false);
    }
  };

  if (error) return <div className="p-4 text-red-600">목록을 불러올 수 없습니다. ({error})</div>;

  const filterCard = (
    <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">작업 이름</label>
        <input
          ref={workNameRef}
          type="text"
          value={filter.workName}
          onChange={(e) => setFilter((f) => ({ ...f, workName: e.target.value }))}
          onFocus={() => { lastFocusedSearchRef.current = workNameRef.current; }}
          className="border border rounded px-3 py-2 text-sm min-w-[140px]"
          placeholder="검색"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">적용 공정</label>
        <select
          ref={processIdRef}
          value={filter.processId}
          onChange={(e) => setFilter((f) => ({ ...f, processId: e.target.value }))}
          onFocus={() => { lastFocusedSearchRef.current = processIdRef.current; }}
          className="border border rounded px-3 py-2 bg-white text-sm min-w-[160px]"
        >
          <option value="">전체</option>
          {processes.map((p) => (
            <option key={p.id} value={p.id}>{p.process_name}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col">
        <span className="filter-label-placeholder" aria-hidden="true" />
        <div className="flex gap-2 items-center filter-btn-row">
          <button type="submit" className="btn-primary h-full flex items-center">검색</button>
          <button type="button" onClick={handleReset} className="btn-outline h-full flex items-center">초기화</button>
        </div>
      </div>
    </form>
  );

  return (
    <>
      <ListPageWrap
        title="작업 정보"
        filterCard={filterCard}
        primaryAction={
          <Link to="/works/new" className="btn-primary">
            등록
          </Link>
        }
        secondaryAction={
          <>
            <input
              ref={bulkInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              aria-hidden="true"
              onChange={handleBulkFileChange}
            />
            <button
              type="button"
              onClick={handleBulkClick}
              disabled={bulkUploading}
              className="btn-outline"
            >
              {bulkUploading ? '등록 중...' : '일괄 등록'}
            </button>
            <a href="/api/works/excel" target="_blank" rel="noopener noreferrer" className="btn-outline">
              엑셀 다운로드
            </a>
          </>
        }
      tableTopRight={
        <select
          className="text-sm border border rounded px-2 py-1.5 bg-white text-gray-700"
          value={pageSize}
          onChange={handlePageSizeChange}
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
      onPageChange={handlePageChange}
    >
      <table className="w-full text-sm border-collapse">
        <TableHeader>
          <Th>작업 이름</Th>
          <Th className="hide-on-mobile">예상 소요시간</Th>
          <Th className="hide-on-mobile">수정일자</Th>
          <Th className="hide-on-mobile">수정자</Th>
          <Th>기능</Th>
        </TableHeader>
        <tbody>
          {loading && items.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-4 text-center text-gray-500">로딩 중...</td>
            </tr>
          ) : (
            items.map((row) => (
            <tr key={row.id} className="border-b border hover:bg-gray-50">
              <td className="py-2 px-3">
                <Link to={`/works/${row.id}`} className="text-blue-600 hover:underline font-medium">
                  {row.name}
                </Link>
              </td>
              <td className="py-2 px-3 hide-on-mobile">{row.estimated_duration_sec != null ? row.estimated_duration_sec : '-'}</td>
              <td className="py-2 px-3 hide-on-mobile">{row.updated_at ? String(row.updated_at).slice(0, 10) : '-'}</td>
              <td className="py-2 px-3 hide-on-mobile">{row.updated_by_name || row.updated_by || '-'}</td>
              <ActionCell
                editTo={`/works/${row.id}/edit`}
                onDelete={() => handleDelete(row.id, row.name)}
              />
            </tr>
            ))
          )}
        </tbody>
      </table>
    </ListPageWrap>
    </>
  );
}

export default WorkList;
