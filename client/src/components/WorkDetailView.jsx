import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ClientDate from './ClientDate';
import DetailViewLayout from './DetailViewLayout';
import { apiFetch } from '../lib/api';

/**
 * PRD 작업 상세: 필수 - 작업 이름, 예상 소요시간, 작업 Type, 수정일자, 수정자
 * 사용 부품 N개, 사용 기계 N개
 * 적용된 공정 리스트
 */
function formatPartMachineNames(ids, nameMap) {
  if (!Array.isArray(ids) || ids.length === 0) return '-';
  const names = ids.map((id) => nameMap[id]).filter(Boolean);
  return names.length > 0 ? names.join(', ') : `${ids.length}개`;
}

export default function WorkDetailView({ onEdit, onClose, inModal, id: idProp, title: titleProp }) {
  const { id: idFromParams } = useParams();
  const navigate = useNavigate();
  const id = idProp ?? idFromParams;
  const workId = id ? Number(id) : null;
  const [data, setData] = useState(null);
  const [partsMap, setPartsMap] = useState({});
  const [machinesMap, setMachinesMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workId) return;
    let cancelled = false;
    apiFetch(`/api/works/${workId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => { if (!cancelled) setData(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workId]);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    Promise.all([
      apiFetch('/api/parts?pageSize=500').then((r) => (r.ok ? r.json() : { items: [] })),
      apiFetch('/api/machines?pageSize=500').then((r) => (r.ok ? r.json() : { items: [] })),
    ]).then(([a, b]) => {
      if (cancelled) return;
      const pMap = {};
      (Array.isArray(a.items) ? a.items : []).forEach((p) => { pMap[p.id] = p.name; });
      const mMap = {};
      (Array.isArray(b.items) ? b.items : []).forEach((m) => { mMap[m.id] = m.name; });
      setPartsMap(pMap);
      setMachinesMap(mMap);
    });
    return () => { cancelled = true; };
  }, [data]);

  if (!workId) return <div className="p-4">잘못된 경로입니다.</div>;
  if (loading) return <div className="p-4 text-gray-500">로딩 중...</div>;
  if (!data) return <div className="p-4">작업을 찾을 수 없습니다.</div>;

  const d = data;
  const partIds = Array.isArray(d.part_ids) ? d.part_ids : [];
  const machineIds = Array.isArray(d.machine_ids) ? d.machine_ids : [];
  const rows = [
    { label: '작업 이름', value: String(d.name ?? '-') },
    { label: '예상 소요시간(초)', value: d.estimated_duration_sec != null ? String(d.estimated_duration_sec) : '-' },
    { label: '작업 Type', value: String(d.work_type ?? '-') },
    { label: '사용 부품', value: formatPartMachineNames(partIds, partsMap) },
    { label: '사용 기계', value: formatPartMachineNames(machineIds, machinesMap) },
    { label: '수정일자', value: d.updated_at ? <ClientDate value={d.updated_at} /> : '-' },
    { label: '수정자', value: String(d.updated_by ?? '-') },
  ];

  const appliedProcesses = Array.isArray(d.applied_processes) ? d.applied_processes : [];
  const handleEdit = onEdit || (() => navigate(`/works/${workId}/edit`));
  const handleClose = onClose || (() => navigate('/works'));

  return (
    <DetailViewLayout title={titleProp} rows={rows} onEdit={handleEdit} onClose={inModal ? handleClose : undefined} inModal={inModal}>
      {appliedProcesses.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">적용된 공정 리스트</h3>
            <ul className="space-y-1 text-sm text-gray-900">
              {appliedProcesses.map((p, i) => <li key={p.process_id ?? i}>{p.process_name ?? '-'}</li>)}
            </ul>
          </div>
        </div>
      )}
    </DetailViewLayout>
  );
}
