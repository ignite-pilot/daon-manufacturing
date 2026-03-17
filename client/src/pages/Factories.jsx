import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiFetch, getPhotoViewUrl } from '../lib/api';
import { ListPageWrap, TableHeader, Th, ActionCell } from '../components/ListPageWrap';

/** PRD: 주소 = address + address_detail */
function formatAddress(row) {
  const a = row.address || '';
  const b = row.address_detail || '';
  return [a, b].filter(Boolean).join(' ') || '-';
}

export function FactoryList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const fetchList = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('pageSize', String(pageSize));
    return apiFetch(`/api/factories?${params.toString()}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error || `HTTP ${res.status}`);
          setItems([]);
          setTotalCount(0);
          return;
        }
        const list = Array.isArray(data?.items) ? data.items : [];
        setItems(list);
        setTotalCount(typeof data?.total === 'number' ? data.total : 0);
        setError(null);
      })
      .catch((e) => { setError(e.message); setItems([]); setTotalCount(0); })
      .finally(() => setLoading(false));
  }, [currentPage, pageSize]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchList().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchList]);

  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    const listPath = '/factories';
    const isListPath = location.pathname === listPath;
    const cameFromChild = prevPathRef.current !== listPath && isListPath;
    prevPathRef.current = location.pathname;
    if (cameFromChild) {
      setLoading(true);
      fetchList().finally(() => setLoading(false));
    }
  }, [location.pathname, fetchList]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}" 공장을 삭제하시겠습니까?`)) return;
    const res = await apiFetch(`/api/factories/${id}`, { method: 'DELETE' });
    const data = res.ok ? null : await res.json();
    if (!res.ok) {
      alert(data?.error || '삭제 실패');
      return;
    }
    setItems((prev) => prev.filter((r) => r.id !== id));
    setTotalCount((t) => Math.max(0, t - 1));
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  if (loading) return <div className="p-4 text-gray-500">로딩 중...</div>;
  if (error) return <div className="p-4 text-red-600">목록을 불러올 수 없습니다. ({error})</div>;

  return (
    <ListPageWrap
      title="공장 정보"
      primaryAction={
        <Link to="/factories/new" className="btn-primary">
          등록
        </Link>
      }
      secondaryAction={
        <a
          href="/api/factories/excel"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline"
        >
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
          <Th>공장 이름</Th>
          <Th className="hide-on-mobile">주소</Th>
          <Th>면적</Th>
          <Th>CAD 파일</Th>
          <Th className="hide-on-mobile">수정일자</Th>
          <Th className="hide-on-mobile">수정자</Th>
          <Th>기능</Th>
        </TableHeader>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-b border hover:bg-gray-50">
              <td className="py-2 px-3">
                <Link to={`/factories/${row.id}`} className="text-blue-600 hover:underline font-medium">
                  {row.name}
                </Link>
              </td>
              <td className="py-2 px-3 text-gray-600 hide-on-mobile">{formatAddress(row)}</td>
              <td className="py-2 px-3">{row.area != null ? row.area : '-'}</td>
              <td className="py-2 px-3 hide-on-mobile align-middle">
                {row.cad_file_path ? (
                  <a href={getPhotoViewUrl(row.cad_file_path)} target="_blank" rel="noopener noreferrer" className="inline-block" title="클릭하여 보기">
                    <img
                      src={getPhotoViewUrl(row.cad_file_path)}
                      alt="CAD 미리보기"
                      className="list-photo-thumb list-cad-thumb-img"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallback = e.target.nextElementSibling;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <span className="list-photo-thumb list-cad-thumb-fallback" style={{ display: 'none' }} aria-hidden>CAD</span>
                  </a>
                ) : '-'}
              </td>
              <td className="py-2 px-3 hide-on-mobile">{row.updated_at ? String(row.updated_at).slice(0, 10) : '-'}</td>
              <td className="py-2 px-3 hide-on-mobile">{row.updated_by_name || row.updated_by || '-'}</td>
              <ActionCell
                editTo={`/factories/${row.id}/edit`}
                onDelete={() => handleDelete(row.id, row.name)}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </ListPageWrap>
  );
}

export default FactoryList;
