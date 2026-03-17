import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { ListPageWrap, TableHeader, Th, ActionCell } from '../components/ListPageWrap';

/**
 * PRD 공정 목록
 * 검색 조건: 공장 이름, 완제품 이름, 공정 이름
 * PC: 공장, 완제품, 공정 이름, 예상 소요시간, 작업 단계 수, 수정일자, 수정자, 기능
 * Mobile: 공장, 완제품, 공정 이름, 기능
 */
export function ProcessList() {
  const [items, setItems] = useState([]);
  const [factories, setFactories] = useState([]);
  const [productCodes, setProductCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    factoryId: '',
    productName: '',
    processName: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const factoryIdRef = useRef(null);
  const productNameInputRef = useRef(null);
  const processNameInputRef = useRef(null);
  const lastFocusedSearchRef = useRef(null);
  const restoreFocusAfterSearchRef = useRef(false);

  const fetchList = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('pageSize', String(pageSize));
    if (filter.factoryId) params.set('factoryId', filter.factoryId);
    if (filter.productName.trim()) params.set('productName', filter.productName.trim());
    if (filter.processName.trim()) params.set('processName', filter.processName.trim());
    return apiFetch(`/api/processes?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { items: [], total: 0 }))
      .then((d) => {
        setItems(Array.isArray(d.items) ? d.items : []);
        setTotalCount(typeof d.total === 'number' ? d.total : 0);
      });
  }, [currentPage, pageSize, filter.factoryId, filter.productName, filter.processName]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch('/api/factories?pageSize=500').then((r) => (r.ok ? r.json() : { items: [] })),
      apiFetch('/api/config/product-codes').then((r) => (r.ok ? r.json() : { items: [] })),
    ]).then(([fData, configData]) => {
      if (cancelled) return;
      if (Array.isArray(fData.items)) setFactories(fData.items);
      if (Array.isArray(configData.items)) setProductCodes(configData.items);
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
    const listPath = '/processes';
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
    const refs = [factoryIdRef, productNameInputRef, processNameInputRef];
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
    setFilter({ factoryId: '', productName: '', processName: '' });
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
    if (!window.confirm(`"${name}" 공정을 삭제하시겠습니까?`)) return;
    const res = await apiFetch(`/api/processes/${id}`, { method: 'DELETE' });
    const data = res.ok ? null : await res.json();
    if (!res.ok) {
      alert(data?.error || '삭제 실패');
      return;
    }
    setItems((prev) => prev.filter((r) => r.id !== id));
    setTotalCount((t) => Math.max(0, t - 1));
  };

  if (loading && items.length === 0) return <div className="p-4 text-gray-500">로딩 중...</div>;
  if (error) return <div className="p-4 text-red-600">목록을 불러올 수 없습니다. ({error})</div>;

  const filterCard = (
    <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">공장 이름</label>
        <select
          ref={factoryIdRef}
          value={filter.factoryId}
          onChange={(e) => setFilter((f) => ({ ...f, factoryId: e.target.value }))}
          onFocus={() => { lastFocusedSearchRef.current = factoryIdRef.current; }}
          className="border border rounded px-3 py-2 bg-white text-sm min-w-[160px]"
        >
          <option value="">전체</option>
          {factories.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">완제품 이름</label>
        {productCodes.length > 0 ? (
          <select
            ref={productNameInputRef}
            value={filter.productName}
            onChange={(e) => setFilter((f) => ({ ...f, productName: e.target.value }))}
            onFocus={() => { lastFocusedSearchRef.current = productNameInputRef.current; }}
            className="border border rounded px-3 py-2 bg-white text-sm min-w-[160px]"
          >
            <option value="">전체</option>
            {productCodes.map((code) => <option key={code} value={code}>{code}</option>)}
          </select>
        ) : (
          <input
            ref={productNameInputRef}
            type="text"
            value={filter.productName}
            onChange={(e) => setFilter((f) => ({ ...f, productName: e.target.value }))}
            onFocus={() => { lastFocusedSearchRef.current = productNameInputRef.current; }}
            className="border border rounded px-3 py-2 text-sm min-w-[140px]"
            placeholder="검색"
          />
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">공정 이름</label>
        <input
          ref={processNameInputRef}
          type="text"
          value={filter.processName}
          onChange={(e) => setFilter((f) => ({ ...f, processName: e.target.value }))}
          onFocus={() => { lastFocusedSearchRef.current = processNameInputRef.current; }}
          className="border border rounded px-3 py-2 text-sm min-w-[140px]"
          placeholder="검색"
        />
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
      title="공정 정보"
      filterCard={filterCard}
      primaryAction={
        <Link to="/processes/new" className="btn-primary">
          등록
        </Link>
      }
      secondaryAction={
        <a href="/api/processes/excel" target="_blank" rel="noopener noreferrer" className="btn-outline">
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
          <Th>완제품</Th>
          <Th>공정 이름</Th>
          <Th className="hide-on-mobile">예상 소요시간</Th>
          <Th className="hide-on-mobile">작업 단계 수</Th>
          <Th className="hide-on-mobile">수정일자</Th>
          <Th className="hide-on-mobile">수정자</Th>
          <Th>기능</Th>
        </TableHeader>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-b border hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700">{row.factory_name ?? '-'}</td>
              <td className="py-2 px-3 text-gray-700">{row.product_name ?? '-'}</td>
              <td className="py-2 px-3">
                <Link to={`/processes/${row.id}/edit`} className="text-blue-600 hover:underline font-medium">
                  {row.process_name}
                </Link>
              </td>
              <td className="py-2 px-3 hide-on-mobile">{row.total_duration_sec != null ? row.total_duration_sec : '-'}</td>
              <td className="py-2 px-3 hide-on-mobile">{row.step_count != null ? row.step_count : '-'}</td>
              <td className="py-2 px-3 hide-on-mobile">{row.updated_at ? String(row.updated_at).slice(0, 10) : '-'}</td>
              <td className="py-2 px-3 hide-on-mobile">{row.updated_by_name || row.updated_by || '-'}</td>
              <ActionCell
                editTo={`/processes/${row.id}/edit`}
                onDelete={() => handleDelete(row.id, row.process_name)}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </ListPageWrap>
  );
}

export default ProcessList;
