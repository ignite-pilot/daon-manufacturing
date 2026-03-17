import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ClientDate from './ClientDate';
import DetailViewLayout from './DetailViewLayout';
import { apiFetch, getPhotoViewUrl } from '../lib/api';

/**
 * PRD 부품 상세: 필수 - 공장, 부품 이름, 수정일자, 수정자
 * 선택 - 부품 사진, 부품 설명, 제조사, AS 담당자, AS 연락처
 * 부품 사용하는 기계 리스트, 부품 사용하는 작업 리스트, 부품 사용하는 공정 리스트
 */
export default function PartDetailView({ onEdit, onClose, inModal, id: idProp, title: titleProp }) {
  const { id: idFromParams } = useParams();
  const navigate = useNavigate();
  const id = idProp ?? idFromParams;
  const partId = id ? Number(id) : null;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!partId) return;
    let cancelled = false;
    apiFetch(`/api/parts/${partId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => { if (!cancelled) setData(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [partId]);

  if (!partId) return <div className="p-4">잘못된 경로입니다.</div>;
  if (loading) return <div className="p-4 text-gray-500">로딩 중...</div>;
  if (!data) return <div className="p-4">부품을 찾을 수 없습니다.</div>;

  const d = data;
  const rows = [
    { label: '공장', value: String(d.factory_name ?? '-') },
    { label: '부품 이름', value: String(d.name ?? '-') },
    { label: '부품 사진', value: d.photo_url ? (
      <span className="detail-view-photo-wrap">
        <img src={getPhotoViewUrl(d.photo_url)} alt="부품 사진" className="detail-view-photo-preview" />
        <a href={getPhotoViewUrl(d.photo_url)} target="_blank" rel="noopener noreferrer" className="detail-view-photo-link">새 탭에서 보기</a>
      </span>
    ) : '-' },
    { label: '부품 설명', value: String(d.description ?? '-') },
    { label: '제조사', value: String(d.manufacturer ?? '-') },
    { label: 'AS 담당자', value: String(d.as_contact ?? '-') },
    { label: 'AS 연락처', value: String(d.as_phone ?? '-') },
    { label: '수정일자', value: d.updated_at ? <ClientDate value={d.updated_at} /> : '-' },
    { label: '수정자', value: String(d.updated_by ?? '-') },
  ];

  const usedMachines = Array.isArray(d.used_machines) ? d.used_machines : [];
  const usedWorks = Array.isArray(d.used_works) ? d.used_works : [];
  const usedProcesses = Array.isArray(d.used_processes) ? d.used_processes : [];
  const handleEdit = onEdit || (() => navigate(`/parts/${partId}/edit`));
  const handleClose = onClose || (() => navigate('/parts'));

  const hasUsedLists = usedMachines.length > 0 || usedWorks.length > 0 || usedProcesses.length > 0;

  return (
    <DetailViewLayout title={titleProp} rows={rows} onEdit={handleEdit} onClose={inModal ? handleClose : undefined} inModal={inModal}>
      {hasUsedLists && (
        <div className="space-y-4">
          {usedMachines.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">부품 사용하는 기계 리스트</h3>
              <ul className="text-sm text-gray-900 space-y-1">
                {usedMachines.map((m, i) => <li key={m.machine_id ?? i}>{m.machine_name ?? '-'}</li>)}
              </ul>
            </div>
          )}
          {usedWorks.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">부품 사용하는 작업 리스트</h3>
              <ul className="text-sm text-gray-900 space-y-1">
                {usedWorks.map((w, i) => <li key={w.work_id ?? i}>{w.work_name ?? '-'}</li>)}
              </ul>
            </div>
          )}
          {usedProcesses.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">부품 사용하는 공정 리스트</h3>
              <ul className="text-sm text-gray-900 space-y-1">
                {usedProcesses.map((p, i) => <li key={p.process_id ?? i}>{p.process_name ?? '-'}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </DetailViewLayout>
  );
}
