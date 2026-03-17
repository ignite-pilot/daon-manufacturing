import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ClientDate from './ClientDate';
import DetailViewLayout from './DetailViewLayout';
import { apiFetch, getPhotoViewUrl } from '../lib/api';

/**
 * PRD 기계 상세: 필수 - 공장, 기계 이름, 수정일자, 수정자 / 선택 - 기계 소요시간
 * 선택 - 기계 사진, 기계 설명, 제조사, AS 담당자, AS 연락처, 도입일시, 공장내 위치
 * 기계 사용하는 작업 리스트, 기계 사용하는 공정 리스트
 */
export default function MachineDetailView({ onEdit, onClose, inModal, id: idProp, title: titleProp }) {
  const { id: idFromParams } = useParams();
  const navigate = useNavigate();
  const id = idProp ?? idFromParams;
  const machineId = id ? Number(id) : null;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!machineId) return;
    let cancelled = false;
    apiFetch(`/api/machines/${machineId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => { if (!cancelled) setData(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [machineId]);

  if (!machineId) return <div className="p-4">잘못된 경로입니다.</div>;
  if (loading) return <div className="p-4 text-gray-500">로딩 중...</div>;
  if (!data) return <div className="p-4">기계를 찾을 수 없습니다.</div>;

  const d = data;
  const rows = [
    { label: '공장', value: String(d.factory_name ?? '-') },
    { label: '기계 이름', value: String(d.name ?? '-') },
    { label: '기계 소요시간(초)', value: d.total_duration_sec != null ? String(d.total_duration_sec) : '-' },
    { label: '기계 사진', value: d.photo_url ? (
      <span className="detail-view-photo-wrap">
        <img src={getPhotoViewUrl(d.photo_url)} alt="기계 사진" className="detail-view-photo-preview" />
        <a href={getPhotoViewUrl(d.photo_url)} target="_blank" rel="noopener noreferrer" className="detail-view-photo-link">새 탭에서 보기</a>
      </span>
    ) : '-' },
    { label: '기계 설명', value: String(d.description ?? '-') },
    { label: '제조사', value: String(d.manufacturer ?? '-') },
    { label: 'AS 담당자', value: String(d.as_contact ?? '-') },
    { label: 'AS 연락처', value: String(d.as_phone ?? '-') },
    { label: '도입일시', value: d.introduced_at ? String(d.introduced_at).slice(0, 10) : '-' },
    { label: '공장내 위치', value: String(d.location_in_factory ?? '-') },
    { label: '수정일자', value: d.updated_at ? <ClientDate value={d.updated_at} /> : '-' },
    { label: '수정자', value: String(d.updated_by ?? '-') },
  ];

  const usedWorks = Array.isArray(d.used_works) ? d.used_works : [];
  const usedProcesses = Array.isArray(d.used_processes) ? d.used_processes : [];
  const hasUsedLists = usedWorks.length > 0 || usedProcesses.length > 0;
  const handleEdit = onEdit || (() => navigate(`/machines/${machineId}/edit`));
  const handleClose = onClose || (() => navigate('/machines'));

  return (
    <DetailViewLayout title={titleProp} rows={rows} onEdit={handleEdit} onClose={inModal ? handleClose : undefined} inModal={inModal}>
      {hasUsedLists && (
        <div className="space-y-4">
          {usedWorks.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">기계 사용하는 작업 리스트</h3>
              <ul className="text-sm text-gray-900 space-y-1">
                {usedWorks.map((w, i) => <li key={w.work_id ?? i}>{w.work_name ?? '-'}</li>)}
              </ul>
            </div>
          )}
          {usedProcesses.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">기계 사용하는 공정 리스트</h3>
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
