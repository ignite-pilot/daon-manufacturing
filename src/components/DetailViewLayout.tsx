'use client';

/**
 * 보기 화면 공통 레이아웃 (공급 업체 보기 스타일)
 * - 상단: 제목
 * - 본문: 두 컬럼 테이블 (라벨 회색 배경, 값 흰색), 가벼운 테두리·행 구분선
 * - 하단: 수정(파란색), 닫기(흰색+테두리) 버튼
 */
export interface DetailViewRow {
  label: string;
  value: React.ReactNode;
}

interface DetailViewLayoutProps {
  title?: string;
  rows: DetailViewRow[];
  onEdit?: () => void;
  onClose?: () => void;
  inModal?: boolean;
  /** 테이블 아래 추가 영역 (예: 작업 단계 목록) */
  children?: React.ReactNode;
}

export default function DetailViewLayout({
  title,
  rows,
  onEdit,
  onClose,
  inModal,
  children,
}: DetailViewLayoutProps) {
  return (
    <div className="flex flex-col">
      <div className="bg-white rounded-lg shadow-sm border border-[#E0E0E0] overflow-hidden">
        {title && (
          <h2 className="text-xl font-bold text-gray-900 pt-6 px-5 pb-4">
            {title}
          </h2>
        )}
        <table className="w-full text-sm border-collapse">
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-[#E0E0E0] last:border-b-0">
                <td className="py-3 px-5 align-top w-[200px] min-w-[180px] shrink-0 text-gray-700 font-medium bg-[#F8F8F8]">
                  {row.label}
                </td>
                <td className="py-3 px-5 text-gray-900 bg-white">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {children && (
          <div className="border-t border-[#E0E0E0] px-5 py-4 bg-white">
            {children}
          </div>
        )}
      </div>
      {(onEdit || onClose) && (
        <div className="flex gap-2 mt-6">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-[#3B82F6] rounded-lg hover:bg-[#2563eb] transition-colors"
            >
              수정
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-gray-800 bg-[#E9ECEF] border border-[#DEE2E6] rounded-lg hover:bg-[#DEE2E6] transition-colors"
            >
              닫기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
