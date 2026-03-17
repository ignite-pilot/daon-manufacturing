import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ClientDate from './ClientDate';
import DetailViewLayout from './DetailViewLayout';
import { apiFetch } from '../lib/api';

/**
 * PRD 공정 상세: 필수 - 공장, 대상 완제품, 공정 이름, 전체 소요시간, 수정일자, 수정자
 * 선택 - 공정 설명
 * 세부 공정 - 작업 단계 (작업, 실 소요시간, 설명) 순서대로
 */
export default function ProcessDetailView({ onEdit, onClose, inModal, id: idProp, title: titleProp }) {
  const { id: idFromParams } = useParams();
  const navigate = useNavigate();
  const id = idProp ?? idFromParams;
  const processId = id ? Number(id) : null;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!processId) return;
    let cancelled = false;
    setError(null);
    setLoading(true);
    apiFetch(`/api/processes/${processId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => { if (!cancelled) { setData(d); setError(d ? null : '공정을 찾을 수 없습니다.'); } })
      .catch((e) => { if (!cancelled) { setError(e?.message || '불러오기 실패'); setData(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [processId]);

  if (!processId) return <div className="p-4">잘못된 경로입니다.</div>;
  if (loading) return <div className="p-4 text-gray-500">로딩 중...</div>;
  if (error || !data) return <div className="p-4 text-red-600">{error || '공정을 찾을 수 없습니다.'}</div>;

  const d = data;
  const rows = [
    { label: '공장', value: String(d.factory_name ?? '-') },
    { label: '대상 완제품', value: String(d.product_name ?? '-') },
    { label: '공정 이름', value: String(d.process_name ?? '-') },
    { label: '전체 소요시간(초)', value: d.total_duration_sec != null ? String(d.total_duration_sec) : '-' },
    { label: '공정 설명', value: String(d.description ?? '-') },
    { label: '수정일자', value: d.updated_at ? <ClientDate value={String(d.updated_at)} /> : '-' },
    { label: '수정자', value: String(d.updated_by ?? '-') },
  ];

  const steps = Array.isArray(d.steps) ? d.steps : [];
  const parseStageMeta = (desc) => {
    if (!desc || typeof desc !== 'string' || !desc.startsWith('[세부공정]')) return null;
    const rest = desc.slice('[세부공정]'.length);
    const i = rest.indexOf('|');
    return i < 0 ? { name: rest.trim() } : { name: rest.slice(0, i).trim() };
  };
  const handleEdit = onEdit || (() => navigate(`/processes/${processId}/edit`));
  const handleClose = onClose || (() => navigate('/processes'));

  const title = titleProp ?? (d.process_name ? `공정: ${d.process_name}` : '공정 보기');
  return (
    <DetailViewLayout title={title} rows={rows} onEdit={handleEdit} onClose={inModal ? handleClose : undefined} inModal={inModal}>
      {steps.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">세부 공정 (작업 단계)</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-900">
            {steps.map((s, i) => {
              const stageOnly = s.work_id == null && s.description && parseStageMeta(s.description);
              const label = stageOnly ? `${stageOnly.name} (작업 없음)` : (s.work_name ?? '-');
              return (
                <li key={i} className="pl-1">
                  <span className="font-medium">{label}</span>
                  {s.actual_duration_sec != null && s.work_id != null && (() => { const sec = Number(s.actual_duration_sec); const m = Math.floor(sec / 60); const s_ = sec % 60; return <span className="text-gray-600"> — 실 소요시간: {m > 0 ? `${m}분 ` : ''}{s_}초</span>; })()}
                  {s.description && !stageOnly && <span className="block text-gray-600 mt-0.5">{s.description}</span>}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </DetailViewLayout>
  );
}
