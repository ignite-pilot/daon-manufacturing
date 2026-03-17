'use client';

import { useEffect, useState } from 'react';
import ClientDate from '@/components/ClientDate';
import DetailViewLayout from '@/components/DetailViewLayout';

interface ProcessDetailViewProps {
  processId: number;
  onEdit?: () => void;
  onClose?: () => void;
  inModal?: boolean;
}

interface ProcessStep {
  step_order?: number;
  work_name?: string;
  actual_duration_sec?: number | null;
  description?: string | null;
}

export default function ProcessDetailView({ processId, onEdit, onClose, inModal }: ProcessDetailViewProps) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/processes/${processId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => { if (!cancelled) setData(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [processId]);

  if (loading) return <div className="p-4 text-gray-500">로딩 중...</div>;
  if (!data) return <div className="p-4">공정을 찾을 수 없습니다.</div>;

  const d = data as {
    process_name?: string;
    factory_name?: string;
    product_name?: string;
    total_duration_sec?: number;
    description?: string | null;
    updated_at?: string;
    updated_by?: string;
    steps?: ProcessStep[];
  };

  const rows = [
    { label: '공장', value: String(d.factory_name ?? '-') },
    { label: '대상 완제품', value: String(d.product_name ?? '-') },
    { label: '공정 이름', value: String(d.process_name ?? '-') },
    { label: '전체 소요시간(초)', value: d.total_duration_sec != null ? String(d.total_duration_sec) : '-' },
    { label: '공정 설명', value: String(d.description ?? '-') },
    { label: '수정일자', value: d.updated_at ? <ClientDate value={d.updated_at} /> : '-' },
    { label: '수정자', value: String(d.updated_by ?? '-') },
  ];

  const steps = Array.isArray(d.steps) ? d.steps : [];

  return (
    <DetailViewLayout rows={rows} onEdit={onEdit} onClose={onClose} inModal={inModal}>
      {steps.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">작업 단계 (세부 공정)</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-900">
            {steps.map((s, i) => (
              <li key={i} className="pl-1">
                <span className="font-medium">{s.work_name ?? '-'}</span>
                {s.actual_duration_sec != null && (() => { const sec = Number(s.actual_duration_sec); const m = Math.floor(sec / 60); const s_ = sec % 60; return <span className="text-gray-600"> — 실 소요시간: {m > 0 ? `${m}분 ` : ''}{s_}초</span>; })()}
                {s.description && <span className="block text-gray-600 mt-0.5">{s.description}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </DetailViewLayout>
  );
}
