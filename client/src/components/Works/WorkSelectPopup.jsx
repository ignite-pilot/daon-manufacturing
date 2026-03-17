import { useEffect, useState, useCallback, useRef } from 'react';
import LayerPopup from '../LayerPopup';
import { apiFetch } from '../../lib/api';

/**
 * 공정 상세에서 사용하는 작업 선택 레이어 팝업
 * - 작업 이름으로 검색
 * - 페이징
 * - 한 개 선택하면 onSelect(work) 호출
 */
export default function WorkSelectPopup({ isOpen, onClose, onSelect }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10; // 고정
  const [currentPage, setCurrentPage] = useState(1);
  const [searchName, setSearchName] = useState('');
  const [searchTrigger, setSearchTrigger] = useState(0);
  const inputRef = useRef(null);

  const fetchList = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('pageSize', String(pageSize));
    if (searchName.trim()) params.set('workName', searchName.trim());
    return apiFetch(`/api/works?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { items: [], total: 0 }))
      .then((d) => {
        setItems(Array.isArray(d.items) ? d.items : []);
        setTotalCount(typeof d.total === 'number' ? d.total : 0);
      });
  }, [currentPage, pageSize, searchName]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    fetchList()
      .then(() => { if (!cancelled) setError(null); })
      .catch((e) => { if (!cancelled) { setError(e.message); setItems([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, fetchList, searchTrigger]);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentPage(1);
    setSearchTrigger((s) => s + 1);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => { inputRef.current?.focus(); }, 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    setSearchTrigger((s) => s + 1);
  };
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    setSearchTrigger((s) => s + 1);
  };

  const handleSelect = (work) => {
    if (!work) return;
    if (onSelect) onSelect(work);
    if (onClose) onClose();
  };

  // 페이지 번호 슬라이딩 윈도우 (ListPageWrap와 동일 로직)
  const maxPageButtons = 10;
  let startPage = 1;
  let endPage = totalPages;
  if (totalPages > maxPageButtons) {
    endPage = Math.min(totalPages, Math.max(currentPage + 4, maxPageButtons));
    startPage = Math.max(1, endPage - maxPageButtons + 1);
    if (currentPage <= 5) {
      startPage = 1;
      endPage = Math.min(totalPages, maxPageButtons);
    } else if (currentPage >= totalPages - 4) {
      endPage = totalPages;
      startPage = Math.max(1, totalPages - maxPageButtons + 1);
    }
  }
  const pageNumbers = [];
  for (let p = startPage; p <= endPage; p++) pageNumbers.push(p);

  return (
    <LayerPopup
      title="작업 선택"
      onClose={onClose}
      maxWidth={700}
      maxHeight="85vh"
      height="85vh"
      aria-labelledby="work-select-popup-title"
    >
      <div className="work-select-popup flex flex-col gap-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">작업 이름</label>
            <input
              ref={inputRef}
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="border border rounded px-3 py-2 text-sm min-w-[160px]"
              placeholder="작업 이름 검색"
            />
          </div>
          <div className="flex flex-col">
            <span className="filter-label-placeholder" aria-hidden="true" />
            <div className="flex gap-2 items-center">
              <button type="submit" className="btn-primary h-full flex items-center">검색</button>
              <button
                type="button"
                className="btn-outline h-full flex items-center"
                onClick={() => { setSearchName(''); setCurrentPage(1); setSearchTrigger((s) => s + 1); }}
              >
                초기화
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="text-sm text-red-600 mt-1">작업 목록을 불러올 수 없습니다. ({error})</div>
        )}

        <div className="table-wrap-bnk mt-2">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-table-header border-b border">
              <tr>
                <th className="text-left py-2 px-3 font-semibold text-gray-900">작업 이름</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900">예상 소요시간(초)</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900">선택</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-500">로딩 중...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-500">검색 결과가 없습니다.</td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="border-b border hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-900">{row.name}</td>
                    <td className="py-2 px-3 text-gray-700">{row.estimated_duration_sec != null ? row.estimated_duration_sec : '-'}</td>
                    <td className="py-2 px-3">
                      <button
                        type="button"
                        className="btn-primary text-xs px-3 py-1"
                        onClick={() => handleSelect(row)}
                      >
                        선택
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-bnk mt-3">
          <span className="pagination-info">총 {totalCount}건</span>
          <div className="pagination-bnk-buttons">
            <button
              type="button"
              className="pagination-nav-btn"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              이전
            </button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                type="button"
                className={p === currentPage ? 'pagination-page-btn pagination-page-btn-active' : 'pagination-page-btn'}
                onClick={() => handlePageChange(p)}
                aria-current={p === currentPage ? 'page' : undefined}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="pagination-nav-btn"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              다음
            </button>
          </div>
        </div>

        <div className="flex justify-end mt-3 pt-3 border-t border-gray-200">
          <button
            type="button"
            className="btn-outline"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </LayerPopup>
  );
}

