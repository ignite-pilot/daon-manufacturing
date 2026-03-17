'use client';

import { useEffect, useState } from 'react';
import ClientDate from '@/components/ClientDate';
import DetailViewLayout from '@/components/DetailViewLayout';

interface WorkDetailViewProps {
  workId: number;
  onEdit?: () => void;
  onClose?: () => void;
  inModal?: boolean;
}

interface AppliedProcess {
  process_id?: number;
  process_name?: string;
}

export default function WorkDetailView({ workId, onEdit, onClose, inModal }: WorkDetailViewProps) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/works/${workId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => { if (!cancelled) setData(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workId]);

  if (loading) return <div className="p-4 text-gray-500">로딩 중...</div>;
  if (!data) return <div className="p-4">작업을 찾을 수 없습니다.</div>;

  const d = data as {
    name?: string;
    estimated_duration_sec?: number;
    work_type?: string;
    updated_at?: string;
    updated_by?: string | null;
    part_ids?: number[];
    machine_ids?: number[];
    applied_processes?: AppliedProcess[];
  };

  const rows = [
    { label: '작업 이름', value: String(d.name ?? '-') },
    { label: '예상 소요시간(초)', value: d.estimated_duration_sec != null ? String(d.estimated_duration_sec) : '-' },
    { label: '작업 Type', value: String(d.work_type ?? '-') },
    { label: '사용 부품', value: Array.isArray(d.part_ids) && d.part_ids.length > 0 ? `부품 ID: ${d.part_ids.join(', ')}` : '-' },
    { label: '사용 기계', value: Array.isArray(d.machine_ids) && d.machine_ids.length > 0 ? `기계 ID: ${d.machine_ids.join(', ')}` : '-' },
    { label: '수정일자', value: d.updated_at ? <ClientDate value={d.updated_at} /> : '-' },
    { label: '수정자', value: String(d.updated_by ?? '-') },
  ];

  const appliedProcesses = Array.isArray(d.applied_processes) ? d.applied_processes : [];

  return (
    <DetailViewLayout rows={rows} onEdit={onEdit} onClose={onClose} inModal={inModal}>
      <div className="space-y-4">
        {appliedProcesses.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">적용된 공정 리스트</h3>
            <ul className="space-y-1 text-sm text-gray-900">
              {appliedProcesses.map((p, i) => (
                <li key={p.process_id ?? i}>{p.process_name ?? '-'}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DetailViewLayout>
  );
}
