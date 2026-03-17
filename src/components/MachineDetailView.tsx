'use client';

import { useEffect, useState } from 'react';
import ClientDate from '@/components/ClientDate';
import DetailViewLayout from '@/components/DetailViewLayout';

interface MachineDetailViewProps {
  machineId: number;
  onEdit?: () => void;
  onClose?: () => void;
  inModal?: boolean;
}

export default function MachineDetailView({ machineId, onEdit, onClose, inModal }: MachineDetailViewProps) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/machines/${machineId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => { if (!cancelled) setData(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [machineId]);

  if (loading) return <div className="p-4 text-gray-500">로딩 중...</div>;
  if (!data) return <div className="p-4">기계를 찾을 수 없습니다.</div>;

  const d = data as {
    name?: string;
    factory_name?: string;
    total_duration_sec?: number | null;
    photo_url?: string | null;
    description?: string | null;
    manufacturer?: string | null;
    as_contact?: string | null;
    as_phone?: string | null;
    introduced_at?: string | null;
    location_in_factory?: string | null;
    updated_at?: string;
    updated_by?: string | null;
    used_works?: { work_id?: number; work_name?: string }[];
    used_processes?: { process_id?: number; process_name?: string }[];
  };

  const rows = [
    { label: '공장', value: String(d.factory_name ?? '-') },
    { label: '기계 이름', value: String(d.name ?? '-') },
    { label: '기계 소요시간(초)', value: d.total_duration_sec != null ? String(d.total_duration_sec) : '-' },
    { label: '사진', value: d.photo_url ? <a href={d.photo_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">보기</a> : '-' },
    { label: '설명', value: String(d.description ?? '-') },
    { label: '제조사', value: String(d.manufacturer ?? '-') },
    { label: 'AS 담당자', value: String(d.as_contact ?? '-') },
    { label: 'AS 연락처', value: String(d.as_phone ?? '-') },
    { label: '도입일', value: d.introduced_at ? String(d.introduced_at).slice(0, 10) : '-' },
    { label: '공장 내 위치', value: String(d.location_in_factory ?? '-') },
    { label: '수정일자', value: d.updated_at ? <ClientDate value={d.updated_at} /> : '-' },
    { label: '수정자', value: String(d.updated_by ?? '-') },
  ];

  return (
    <DetailViewLayout rows={rows} onEdit={onEdit} onClose={onClose} inModal={inModal}>
      {(Array.isArray(d.used_works) && d.used_works.length > 0) || (Array.isArray(d.used_processes) && d.used_processes.length > 0) ? (
        <div className="space-y-4 mt-4">
          {Array.isArray(d.used_works) && d.used_works.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">사용 작업</h3>
              <ul className="text-sm text-gray-900 space-y-1">
                {d.used_works.map((w, i) => <li key={w.work_id ?? i}>{w.work_name ?? '-'}</li>)}
              </ul>
            </div>
          )}
          {Array.isArray(d.used_processes) && d.used_processes.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">사용 공정</h3>
              <ul className="text-sm text-gray-900 space-y-1">
                {d.used_processes.map((p, i) => <li key={p.process_id ?? i}>{p.process_name ?? '-'}</li>)}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </DetailViewLayout>
  );
}
