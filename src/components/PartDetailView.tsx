'use client';

import { useEffect, useState } from 'react';
import ClientDate from '@/components/ClientDate';
import DetailViewLayout from '@/components/DetailViewLayout';

interface PartDetailViewProps {
  partId: number;
  onEdit?: () => void;
  onClose?: () => void;
  inModal?: boolean;
}

interface UsedItem {
  work_id?: number;
  work_name?: string;
  machine_id?: number;
  machine_name?: string;
  process_id?: number;
  process_name?: string;
}

export default function PartDetailView({ partId, onEdit, onClose, inModal }: PartDetailViewProps) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/parts/${partId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => { if (!cancelled) setData(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [partId]);

  if (loading) return <div className="p-4 text-gray-500">로딩 중...</div>;
  if (!data) return <div className="p-4">부품을 찾을 수 없습니다.</div>;

  const d = data as {
    name?: string;
    factory_name?: string;
    photo_url?: string | null;
    description?: string | null;
    manufacturer?: string | null;
    as_contact?: string | null;
    as_phone?: string | null;
    updated_at?: string;
    updated_by?: string | null;
    used_works?: UsedItem[];
    used_machines?: UsedItem[];
    used_processes?: UsedItem[];
  };

  const rows = [
    { label: '공장', value: String(d.factory_name ?? '-') },
    { label: '부품 이름', value: String(d.name ?? '-') },
    { label: '부품 사진', value: d.photo_url ? <a href={d.photo_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">보기</a> : '-' },
    { label: '부품 설명', value: String(d.description ?? '-') },
    { label: '제조사', value: String(d.manufacturer ?? '-') },
    { label: 'AS 담당자', value: String(d.as_contact ?? '-') },
    { label: 'AS 연락처', value: String(d.as_phone ?? '-') },
    { label: '수정일자', value: d.updated_at ? <ClientDate value={d.updated_at} /> : '-' },
    { label: '수정자', value: String(d.updated_by ?? '-') },
  ];

  const usedWorks = Array.isArray(d.used_works) ? d.used_works : [];
  const usedMachines = Array.isArray(d.used_machines) ? d.used_machines : [];
  const usedProcesses = Array.isArray(d.used_processes) ? d.used_processes : [];

  return (
    <DetailViewLayout rows={rows} onEdit={onEdit} onClose={onClose} inModal={inModal}>
      {(usedWorks.length > 0 || usedMachines.length > 0 || usedProcesses.length > 0) && (
        <div className="space-y-4">
          {usedProcesses.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">부품 사용 공정</h3>
              <ul className="space-y-1 text-sm text-gray-900">
                {usedProcesses.map((p, i) => (
                  <li key={p.process_id ?? i}>{p.process_name ?? '-'}</li>
                ))}
              </ul>
            </div>
          )}
          {usedWorks.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">부품 사용 작업</h3>
              <ul className="space-y-1 text-sm text-gray-900">
                {usedWorks.map((w, i) => (
                  <li key={w.work_id ?? i}>{w.work_name ?? '-'}</li>
                ))}
              </ul>
            </div>
          )}
          {usedMachines.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">부품 사용 기계</h3>
              <ul className="space-y-1 text-sm text-gray-900">
                {usedMachines.map((m, i) => (
                  <li key={m.machine_id ?? i}>{m.machine_name ?? '-'}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </DetailViewLayout>
  );
}
