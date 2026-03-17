'use client';

import { useState, useEffect, useMemo } from 'react';

interface MachineItem {
  id: number;
  name: string;
}

interface MachineSelectPopupProps {
  machines?: MachineItem[];
  selectedIds?: number[];
  onConfirm: (ids: number[]) => void;
  onClose: () => void;
}

/**
 * 사용 기계 다중 선택 팝업 (검색 포함)
 */
export default function MachineSelectPopup({
  machines = [],
  selectedIds = [],
  onConfirm,
  onClose,
}: MachineSelectPopupProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelected, setLocalSelected] = useState<Set<number>>(() => new Set(selectedIds));

  useEffect(() => {
    setLocalSelected(new Set(selectedIds));
    setSearchQuery('');
  }, [selectedIds.join(',')]);

  const filteredMachines = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return machines;
    return machines.filter((m) => (m.name || '').toLowerCase().includes(q));
  }, [machines, searchQuery]);

  const toggle = (id: number) => {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setLocalSelected(new Set(filteredMachines.map((m) => m.id)));
  };

  const clearAll = () => {
    setLocalSelected(new Set());
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
        className="bg-white rounded-lg shadow-xl max-w-[480px] w-full p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="machine-select-title"
      >
        <h2 id="machine-select-title" className="text-lg font-semibold text-gray-900 mb-4">
          사용 기계 선택
        </h2>
        <div className="space-y-3">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="기계명 검색..."
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            aria-label="기계명 검색"
          />
          <div className="flex gap-2 text-sm items-center">
            <button type="button" onClick={selectAll} className="text-blue-600 hover:underline">
              전체 선택
            </button>
            <span className="text-gray-400">|</span>
            <button type="button" onClick={clearAll} className="text-gray-600 hover:underline">
              전체 해제
            </button>
            <span className="text-gray-500 ml-auto">{localSelected.size}개 선택</span>
          </div>
          <ul className="border border-gray-200 rounded overflow-y-auto max-h-[280px] bg-white">
            {filteredMachines.length === 0 ? (
              <li className="p-3 text-gray-500 text-sm">
                {searchQuery.trim() ? '검색 결과가 없습니다.' : '등록된 기계가 없습니다.'}
              </li>
            ) : (
              filteredMachines.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <span className="shrink-0 w-5 flex items-center justify-center">
                    <input
                      type="checkbox"
                      id={`machine-${m.id}`}
                      checked={localSelected.has(m.id)}
                      onChange={() => toggle(m.id)}
                      className="rounded border-gray-300 w-4 h-4"
                    />
                  </span>
                  <label
                    htmlFor={`machine-${m.id}`}
                    className="flex-1 min-w-0 text-sm cursor-pointer select-none break-words"
                  >
                    {m.name || `(ID: ${m.id})`}
                  </label>
                </li>
              ))
            )}
          </ul>
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
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
    </div>
  );
}
