'use client';

interface FilterBarProps {
  children: React.ReactNode;
  onSearch: (e: React.FormEvent) => void;
  onReset: () => void;
}

export default function FilterBar({ children, onSearch, onReset }: FilterBarProps) {
  return (
    <form onSubmit={onSearch} className="flex flex-wrap gap-4 items-end mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      {children}
      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 text-sm rounded-md text-white hover:opacity-90"
          style={{ backgroundColor: 'var(--header-bg)' }}
        >
          검색
        </button>
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-100"
        >
          초기화
        </button>
      </div>
    </form>
  );
}

export function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <label className="text-sm text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
