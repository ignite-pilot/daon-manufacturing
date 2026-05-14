import { Link } from 'react-router-dom';

/**
 * BBNK MES 스타일 리스트 페이지 공통 레이아웃
 * - 페이지 제목, 검색 카드(children), 액션 버튼, 테이블, 페이지네이션
 */
export function ListPageWrap({
  title,
  filterCard,
  primaryAction,
  secondaryAction,
  tableTopRight,
  children,
  totalCount = 0,
  pageSize = 20,
  currentPage = 1,
  onPageChange,
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasPagination = true;

  // 표시할 페이지 번호 (최대 10개), 현재 페이지 기준 슬라이딩 윈도우
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
    <div className="flex flex-col gap-4">
      <h1 className="page-title-bnk">{title}</h1>

      {filterCard != null && (
        <div className="filter-card-bnk">{filterCard}</div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2 list-page-actions-bnk">
        <div className="flex items-center gap-2">
          {primaryAction}
          {secondaryAction}
        </div>
        {tableTopRight != null && (
          <div className="table-top-right-bnk">
            <span className="table-top-right-label">한번에 보기</span>
            {tableTopRight}
          </div>
        )}
      </div>

      <div className="table-wrap-bnk">{children}</div>

      {hasPagination && (
        <div className="pagination-bnk">
          <span className="pagination-info">총 {totalCount}건</span>
          <div className="pagination-bnk-buttons">
            <button
              type="button"
              className="pagination-nav-btn"
              disabled={currentPage <= 1}
              onClick={() => onPageChange?.(currentPage - 1)}
            >
              이전
            </button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                type="button"
                className={p === currentPage ? 'pagination-page-btn pagination-page-btn-active' : 'pagination-page-btn'}
                onClick={() => onPageChange?.(p)}
                aria-current={p === currentPage ? 'page' : undefined}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="pagination-nav-btn"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange?.(currentPage + 1)}
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** BBNK 스타일 테이블 헤더 (연한 파란 배경) */
export function TableHeader({ children, ...rest }) {
  return (
    <thead className="bg-table-header border-b border" {...rest}>
      <tr>{children}</tr>
    </thead>
  );
}

/** BBNK 스타일 th */
export function Th({ children, className = '', ...rest }) {
  return (
    <th className={`text-left py-3 px-3 font-semibold text-gray-900 ${className}`} {...rest}>
      {children}
    </th>
  );
}

/** 기능 열: 수정(연한 파란), 삭제(연한 빨강) 버튼 */
export function ActionCell({ editTo, onDelete, deleteLabel = '삭제' }) {
  return (
    <td className="py-2 px-3">
      <div className="inline-flex items-center gap-2">
        {editTo != null && (
          <Link to={editTo} className="btn-table-edit">
            수정
          </Link>
        )}
        {onDelete != null && (
          <button type="button" className="btn-table-delete" onClick={onDelete}>
            {deleteLabel}
          </button>
        )}
      </div>
    </td>
  );
}
