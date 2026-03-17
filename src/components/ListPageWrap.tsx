'use client';

interface ListPageWrapProps {
  title: string;
  children: React.ReactNode;
}

export default function ListPageWrap({ title, children }: ListPageWrapProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
      </div>
      <div className="px-6 pb-6">
        {children}
      </div>
    </div>
  );
}
