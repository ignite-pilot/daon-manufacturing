/**
 * BNK-MES 보기 화면 레이아웃 (원자재 보기 스타일)
 * - 제목은 카드 위에 굵은 검정 텍스트
 * - 흰색 둥근 카드(그림자) 안에 2열 테이블: 왼쪽 라벨(회색 배경), 오른쪽 값(흰 배경), 행마다 얇은 구분선
 * - 카드 하단 왼쪽에 수정(파랑), 닫기(회색) 버튼
 */
export default function DetailViewLayout({ title, rows, onEdit, onClose, inModal, children }) {
  return (
    <div className="detail-view-bnk flex flex-col">
      {title && (
        <h2 className="detail-view-bnk-title text-xl font-bold text-black mb-4">
          {title}
        </h2>
      )}
      <div className="detail-view-bnk-card">
        <table className="detail-view-bnk-table w-full border-collapse">
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="detail-view-bnk-row">
                <td className="detail-view-bnk-label">{row.label}</td>
                <td className="detail-view-bnk-value">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {children && <div className="detail-view-bnk-extra">{children}</div>}
      </div>
      {(onEdit || onClose) && (
        <div className="detail-view-bnk-actions">
          {onEdit && (
            <button type="button" onClick={onEdit} className="detail-view-bnk-btn-edit">
              수정
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} className="detail-view-bnk-btn-close">
              닫기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
