'use client';

import { useState, useEffect, useMemo } from 'react';

interface PartItem {
  id: number;
  name: string;
}

interface PartSelectPopupProps {
  parts?: PartItem[];
  selectedIds?: number[];
  onConfirm: (ids: number[]) => void;
  onClose: () => void;
}

/**
 * 사용 부품 선택 팝업 (이중 목록: 왼쪽 부품 목록 ↔ 오른쪽 사용 부품)
 * 왼쪽에서 선택 후 이동 → 사용 부품에 추가, 오른쪽에서 선택 후 이동 → 취소(제거)
 */
export default function PartSelectPopup({
  parts = [],
  selectedIds = [],
  onConfirm,
  onClose,
}: PartSelectPopupProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelected, setLocalSelected] = useState<Set<number>>(() => new Set(selectedIds));
  const [leftSelection, setLeftSelection] = useState<Set<number>>(new Set());
  const [rightSelection, setRightSelection] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLocalSelected(new Set(selectedIds));
    setSearchQuery('');
    setLeftSelection(new Set());
    setRightSelection(new Set());
  }, [selectedIds.join(',')]);

  const filteredParts = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return parts;
    return parts.filter((p) => (p.name || '').toLowerCase().includes(q));
  }, [parts, searchQuery]);

  const availableParts = useMemo(
    () => filteredParts.filter((p) => !localSelected.has(p.id)),
    [filteredParts, localSelected]
  );
  const selectedParts = useMemo(
    () => parts.filter((p) => localSelected.has(p.id)).sort((a, b) => a.id - b.id),
    [parts, localSelected]
  );

  const toggleLeft = (id: number) => {
    setLeftSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleRight = (id: number) => {
    setRightSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-[640px] w-full p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="part-select-title"
      >
        <h2 id="part-select-title" className="text-lg font-semibold text-gray-900 mb-3">
          사용 부품 선택
        </h2>
        <div className="mb-3">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="부품명 검색..."
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            aria-label="부품명 검색"
          />
        </div>
        <div className="flex gap-3 items-stretch min-h-[280px]">
          <div className="flex-1 flex flex-col border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-2 py-1.5 bg-gray-100 border-b border-gray-200 text-sm font-medium text-gray-700">
              부품 목록
            </div>
            <ul className="flex-1 overflow-y-auto p-1 bg-white">
              {availableParts.length === 0 ? (
                <li className="p-3 text-gray-500 text-sm">
                  {searchQuery.trim() ? '검색 결과 없음' : '추가할 부품 없음'}
                </li>
              ) : (
                availableParts.map((p) => (
                  <li
                    key={p.id}
                    onClick={() => toggleLeft(p.id)}
                    className={`px-2 py-1.5 text-sm cursor-pointer rounded truncate ${leftSelection.has(p.id) ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'}`}
                  >
                    {p.name || `(ID: ${p.id})`}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="flex flex-col justify-center gap-2 shrink-0">
            <button
              type="button"
              onClick={moveToRight}
              disabled={leftSelection.size === 0}
              className="px-3 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              title="사용 부품으로 추가"
              aria-label="사용 부품으로 추가"
            >
              →
            </button>
            <button
              type="button"
              onClick={moveToLeft}
              disabled={rightSelection.size === 0}
              className="px-3 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              title="선택 취소(제거)"
              aria-label="선택 취소(제거)"
            >
              ←
            </button>
          </div>
          <div className="flex-1 flex flex-col border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-2 py-1.5 bg-gray-100 border-b border-gray-200 text-sm font-medium text-gray-700">
              사용 부품
            </div>
            <ul className="flex-1 overflow-y-auto p-1 bg-white">
              {selectedParts.length === 0 ? (
                <li className="p-3 text-gray-500 text-sm">선택된 부품 없음</li>
              ) : (
                selectedParts.map((p) => (
                  <li
                    key={p.id}
                    onClick={() => toggleRight(p.id)}
                    className={`px-2 py-1.5 text-sm cursor-pointer rounded truncate ${rightSelection.has(p.id) ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'}`}
                  >
                    {p.name || `(ID: ${p.id})`}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          왼쪽에서 부품을 선택한 뒤 → 로 추가, 오른쪽에서 선택한 뒤 ← 로 제거
        </p>
        <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
