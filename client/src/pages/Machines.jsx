import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiFetch, getPhotoViewUrl } from '../lib/api';
import { ListPageWrap, TableHeader, Th, ActionCell } from '../components/ListPageWrap';

/**
 * PRD 기계 목록
 * 검색 조건: 기계 종류, 기계 이름, 적용 공정, 적용 작업 (Mobile: 기계 종류, 기계 이름, 적용 공정)
 * PC: 공장, 기계 이름, 기계 소요시간, 기계 사진, 도입일시, 기능
 * Mobile: 공장, 기계 이름, 기능
 */
export function MachineList() {
  const [items, setItems] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    machineName: '',
    processId: '',
    workId: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const machineNameRef = useRef(null);
  const processIdRef = useRef(null);
  const workIdRef = useRef(null);
  const lastFocusedSearchRef = useRef(null);
  const restoreFocusAfterSearchRef = useRef(false);

  const fetchList = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('pageSize', String(pageSize));
    if (filter.machineName.trim()) params.set('machineName', filter.machineName.trim());
    if (filter.processId) params.set('processId', filter.processId);
    if (filter.workId) params.set('workId', filter.workId);
    return apiFetch(`/api/machines?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { items: [], total: 0 }))
      .then((d) => {
        setItems(Array.isArray(d.items) ? d.items : []);
        setTotalCount(typeof d.total === 'number' ? d.total : 0);
      });
  }, [currentPage, pageSize, filter.machineName, filter.processId, filter.workId]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch('/api/processes?pageSize=500').then((r) => (r.ok ? r.json() : { items: [] })),
      apiFetch('/api/works?pageSize=500').then((r) => (r.ok ? r.json() : { items: [] })),
    ]).then(([pData, wData]) => {
      if (cancelled) return;
      if (Array.isArray(pData.items)) setProcesses(pData.items);
      if (Array.isArray(wData.items)) setWorks(wData.items);
    });
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
    const listPath = '/machines';
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
    const refs = [machineNameRef, processIdRef, workIdRef];
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
    setFilter({ machineName: '', processId: '', workId: '' });
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
    if (!window.confirm(`"${name}" 기계를 삭제하시겠습니까?`)) return;
    const res = await apiFetch(`/api/machines/${id}`, { method: 'DELETE' });
    const data = res.ok ? null : await res.json();
    if (!res.ok) {
      alert(data?.error || '삭제 실패');
      return;
    }
    setItems((prev) => prev.filter((r) => r.id !== id));
    setTotalCount((t) => Math.max(0, t - 1));
  };

  if (error) return <div className="p-4 text-red-600">목록을 불러올 수 없습니다. ({error})</div>;

  const filterCard = (
    <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">기계 종류</label>
        <select className="border border rounded px-3 py-2 bg-white text-sm min-w-[120px]" value="">
          <option value="">전체</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">기계 이름</label>
        <input
          ref={machineNameRef}
          type="text"
          value={filter.machineName}
          onChange={(e) => setFilter((f) => ({ ...f, machineName: e.target.value }))}
          onFocus={() => { lastFocusedSearchRef.current = machineNameRef.current; }}
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
      <div className="hide-on-mobile">
        <label className="block text-sm font-medium text-gray-700 mb-1">적용 작업</label>
        <select
          ref={workIdRef}
          value={filter.workId}
          onChange={(e) => setFilter((f) => ({ ...f, workId: e.target.value }))}
          onFocus={() => { lastFocusedSearchRef.current = workIdRef.current; }}
          className="border border rounded px-3 py-2 bg-white text-sm min-w-[160px]"
        >
          <option value="">전체</option>
          {works.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
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
    <ListPageWrap
      title="기계 정보"
      filterCard={filterCard}
      primaryAction={
        <Link to="/machines/new" className="btn-primary">
          등록
        </Link>
      }
      secondaryAction={
        <a href="/api/machines/excel" target="_blank" rel="noopener noreferrer" className="btn-outline">
          엑셀 다운로드
        </a>
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
          <Th>공장</Th>
          <Th>기계 이름</Th>
          <Th className="hide-on-mobile">기계 소요시간</Th>
          <Th className="hide-on-mobile">기계 사진</Th>
          <Th className="hide-on-mobile">도입일시</Th>
          <Th>기능</Th>
        </TableHeader>
        <tbody>
          {loading && items.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-4 text-center text-gray-500">로딩 중...</td>
            </tr>
          ) : (
            items.map((row) => (
            <tr key={row.id} className="border-b border hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700">{row.factory_name ?? '-'}</td>
              <td className="py-2 px-3">
                <Link to={`/machines/${row.id}`} className="text-blue-600 hover:underline font-medium">
                  {row.name}
                </Link>
              </td>
              <td className="py-2 px-3 hide-on-mobile">{row.total_duration_sec != null ? row.total_duration_sec : '-'}</td>
              <td className="py-2 px-3 hide-on-mobile align-middle">
                {row.photo_url ? (
                  <a href={getPhotoViewUrl(row.photo_url)} target="_blank" rel="noopener noreferrer" className="inline-block" title="클릭하여 보기">
                    <img src={getPhotoViewUrl(row.photo_url)} alt="기계 사진 미리보기" className="list-photo-thumb" />
                  </a>
                ) : '-'}
              </td>
              <td className="py-2 px-3 hide-on-mobile">{row.introduced_at ? String(row.introduced_at).slice(0, 10) : '-'}</td>
              <ActionCell
                editTo={`/machines/${row.id}/edit`}
                onDelete={() => handleDelete(row.id, row.name)}
              />
            </tr>
          ))
          )}
        </tbody>
      </table>
    </ListPageWrap>
  );
}

export default MachineList;
