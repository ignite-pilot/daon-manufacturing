import { useState, useEffect, useMemo } from 'react';
import LayerPopup from './LayerPopup';

/**
 * 사용 부품 선택 팝업 (이중 목록: 왼쪽 부품 목록 ↔ 오른쪽 사용 부품)
 * 왼쪽에서 선택 후 이동 → 사용 부품에 추가, 오른쪽에서 선택 후 이동 → 취소(제거)
 */
const toId = (v) => (v === null || v === undefined ? NaN : Number(v));

export default function PartSelectPopup({ parts = [], selectedIds = [], onConfirm, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelected, setLocalSelected] = useState(() => new Set((selectedIds || []).map(toId).filter((n) => !Number.isNaN(n))));
  const [leftSelection, setLeftSelection] = useState(() => new Set());
  const [rightSelection, setRightSelection] = useState(() => new Set());

  useEffect(() => {
    const ids = (selectedIds || []).map(toId).filter((n) => !Number.isNaN(n));
    setLocalSelected(new Set(ids));
    setSearchQuery('');
    setLeftSelection(new Set());
    setRightSelection(new Set());
  }, [(selectedIds || []).map(toId).join(',')]);

  const filteredParts = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return parts;
    return parts.filter((p) => (p.name || '').toLowerCase().includes(q));
  }, [parts, searchQuery]);

  const availableParts = useMemo(
    () => filteredParts.filter((p) => !localSelected.has(toId(p.id))),
    [filteredParts, localSelected]
  );
  const selectedParts = useMemo(
    () => parts.filter((p) => localSelected.has(toId(p.id))).sort((a, b) => toId(a.id) - toId(b.id)),
    [parts, localSelected]
  );

  const toggleLeft = (id) => {
    const n = toId(id);
    if (Number.isNaN(n)) return;
    setLeftSelection((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };
  const toggleRight = (id) => {
    const n = toId(id);
    if (Number.isNaN(n)) return;
    setRightSelection((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const moveToRight = () => {
    if (leftSelection.size === 0) return;
    setLocalSelected((prev) => {
      const next = new Set(prev);
      leftSelection.forEach((id) => next.add(id));
      return next;
    });
    setLeftSelection(new Set());
  };
  const moveToLeft = () => {
    if (rightSelection.size === 0) return;
    setLocalSelected((prev) => {
      const next = new Set(prev);
      rightSelection.forEach((id) => next.delete(id));
      return next;
    });
    setRightSelection(new Set());
  };

  const handleConfirm = () => {
    onConfirm(Array.from(localSelected));
    onClose();
  };

  return (
    <LayerPopup title="사용 부품 선택" onClose={onClose} maxWidth={640}>
      <div className="part-select-popup min-w-[560px]">
        <div className="mb-3">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="부품명 검색..."
            className="w-full border border rounded px-3 py-2 text-sm"
            aria-label="부품명 검색"
          />
        </div>
        <div className="flex gap-3 items-stretch h-[300px] part-select-popup-body">
          <div className="flex-1 flex flex-col border border rounded-lg overflow-hidden min-w-0">
            <div className="px-2 py-1.5 bg-gray-100 border-b border-gray-200 text-sm font-medium text-gray-700 shrink-0">
              부품 목록
            </div>
            <ul className="flex-1 min-h-0 overflow-y-auto bg-white list-none">
              {availableParts.length === 0 ? (
                <li className="p-3 text-gray-500 text-sm">
                  {searchQuery.trim() ? '검색 결과 없음' : '추가할 부품 없음'}
                </li>
              ) : (
                availableParts.map((p) => {
                  const isSelected = leftSelection.has(toId(p.id));
                  return (
                    <li
                      key={p.id}
                      onClick={() => toggleLeft(p.id)}
                      className="block w-full text-sm cursor-pointer rounded truncate border-2 border-transparent hover:bg-gray-100"
                      style={
                        isSelected
                          ? { backgroundColor: '#bae6fd', borderColor: '#0ea5e9' }
                          : {}
                      }
                    >
                      {p.name || `(ID: ${p.id})`}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
          <div className="flex flex-col items-center gap-2 shrink-0 pt-2 part-select-arrows-wrap">
            <button
              type="button"
              onClick={moveToRight}
              disabled={leftSelection.size === 0}
              className="px-3 py-2 border border rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              title="사용 부품으로 추가"
              aria-label="사용 부품으로 추가"
            >
              →
            </button>
            <button
              type="button"
              onClick={moveToLeft}
              disabled={rightSelection.size === 0}
              className="px-3 py-2 border border rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              title="선택 취소(제거)"
              aria-label="선택 취소(제거)"
            >
              ←
            </button>
          </div>
          <div className="flex-1 flex flex-col border border rounded-lg overflow-hidden min-w-0">
            <div className="px-2 py-1.5 bg-gray-100 border-b border-gray-200 text-sm font-medium text-gray-700 shrink-0">
              사용 부품 {selectedParts.length > 0 && <span className="text-green-600">({selectedParts.length}개 선택됨)</span>}
            </div>
            <ul className="flex-1 min-h-0 overflow-y-auto bg-white list-none">
              {selectedParts.length === 0 ? (
                <li className="p-3 text-gray-500 text-sm">선택된 부품 없음</li>
              ) : (
                selectedParts.map((p) => {
                  const isSelected = rightSelection.has(toId(p.id));
                  return (
                    <li
                      key={p.id}
                      onClick={() => toggleRight(p.id)}
                      className="block w-full text-sm cursor-pointer rounded truncate border-2 border-transparent hover:bg-gray-100"
                      style={
                        isSelected
                          ? { backgroundColor: '#bae6fd', borderColor: '#0ea5e9' }
                          : {}
                      }
                    >
                      {p.name || `(ID: ${p.id})`}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          왼쪽에서 부품을 선택한 뒤 → 로 추가, 오른쪽에서 선택한 뒤 ← 로 제거
        </p>
        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-200">
          <button type="button" onClick={onClose} className="btn-outline">
            취소
          </button>
          <button type="button" onClick={handleConfirm} className="btn-primary">
            확인
          </button>
        </div>
      </div>
    </LayerPopup>
  );
}
