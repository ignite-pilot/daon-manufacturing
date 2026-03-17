'use client';

import { useEffect, useState } from 'react';
import ClientDate from '@/components/ClientDate';
import DetailViewLayout from '@/components/DetailViewLayout';

interface FactoryDetailViewProps {
  factoryId: number;
  onEdit?: () => void;
  onClose?: () => void;
  inModal?: boolean;
}

export default function FactoryDetailView({
  factoryId,
  onEdit,
  onClose,
  inModal,
}: FactoryDetailViewProps) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/factories/${factoryId}`);
        if (res.ok && !cancelled) setData(await res.json());
        else if (res.status === 404 && !cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [factoryId]);

  if (loading) return <div className="p-4 text-gray-500">로딩 중...</div>;
  if (!data) return <div className="p-4">공장을 찾을 수 없습니다.</div>;

  const rows = [
    { label: '공장 이름', value: String(data.name) },
    { label: '우편번호', value: String(data.zip_code ?? '-') },
    { label: '주소', value: String(data.address ?? '-') },
    { label: '상세 주소', value: String(data.address_detail ?? '-') },
    { label: '설명', value: String(data.description ?? '-') },
    { label: '면적', value: data.area != null ? String(data.area) : '-' },
    { label: 'CAD 파일', value: data.cad_file_path ? String(data.cad_file_path) : '-' },
    { label: '수정일자', value: data.updated_at ? <ClientDate value={String(data.updated_at)} /> : '-' },
    { label: '수정자', value: String(data.updated_by ?? '-') },
  ];

  return (
    <DetailViewLayout
      rows={rows}
      onEdit={onEdit}
      onClose={onClose}
      inModal={inModal}
    />
  );
}
