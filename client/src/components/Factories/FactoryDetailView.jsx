import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ClientDate from '../ClientDate';
import DetailViewLayout from '../DetailViewLayout';
import { apiFetch } from '../../lib/api';

/**
 * PRD 제조 공장 상세 보기
 * 필수: 공장 이름, 주소, 수정일자, 수정자
 * 선택: 공장 설명, 면적, CAD 파일
 * 목록 기능: 수정 버튼(전체 수정 가능), 삭제
 */
function formatAddress(data) {
  const a = data.address || '';
  const b = data.address_detail || '';
  return [a, b].filter(Boolean).join(' ') || '-';
}

export default function FactoryDetailView({ onEdit, onClose, inModal, id: idProp, title: titleProp }) {
  const { id: idFromParams } = useParams();
  const navigate = useNavigate();
  const id = idProp ?? idFromParams;
  const factoryId = id ? Number(id) : null;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!factoryId) return;
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/factories/${factoryId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => { if (!cancelled) setData(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [factoryId]);

  if (!factoryId) return <div className="p-4">잘못된 경로입니다.</div>;
  if (loading) return <div className="p-4 text-gray-500">로딩 중...</div>;
  if (!data) return <div className="p-4">공장을 찾을 수 없습니다.</div>;

  const rows = [
    { label: '공장 이름', value: String(data.name) },
    { label: '주소', value: formatAddress(data) },
    { label: '공장 설명', value: String(data.description ?? '-') },
    { label: '면적', value: data.area != null ? String(data.area) : '-' },
    { label: 'CAD 파일', value: data.cad_file_path ? String(data.cad_file_path) : '-' },
    { label: '수정일자', value: data.updated_at ? <ClientDate value={String(data.updated_at)} /> : '-' },
    { label: '수정자', value: String(data.updated_by ?? '-') },
  ];

  const handleEdit = onEdit || (() => navigate(`/factories/${factoryId}/edit`));
  const handleClose = onClose || (() => navigate('/factories'));

  return (
    <DetailViewLayout
      title={titleProp}
      rows={rows}
      onEdit={handleEdit}
      onClose={inModal ? handleClose : undefined}
      inModal={inModal}
    />
  );
}
