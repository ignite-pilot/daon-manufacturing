import { useEffect, useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import ClientDate from '../ClientDate';
import PartSelectPopup from '../PartSelectPopup';
import MachineSelectPopup from '../MachineSelectPopup';

const WORK_TYPES = ['가조립', '조립'];

/**
 * PRD 작업: 필수 - 작업 이름, 예상 소요시간, 작업 Type (가조립, 조립), 수정일자, 수정자
 * 사용 부품 N개, 사용 기계 N개
 * 적용된 공정 리스트 (공정에 연결 시 표시, 읽기 전용)
 */
export default function WorkForm(props) {
  const { workId: workIdProp, onSuccess, onCancel, inModal } = props;
  const { id } = useParams();
  const navigate = useNavigate();
  const workId = workIdProp != null ? workIdProp : (id ? Number(id) : null);
  const isEdit = workId != null;
  const [parts, setParts] = useState([]);
  const [machines, setMachines] = useState([]);
  const [form, setForm] = useState({
    name: '',
    estimated_duration_sec: '',
    work_type: '',
    part_ids: [],
    machine_ids: [],
  });
  const [readOnlyMeta, setReadOnlyMeta] = useState({ updated_at: null, updated_by: null });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [partSelectTarget, setPartSelectTarget] = useState(null);
  const [machineSelectOpen, setMachineSelectOpen] = useState(false);

  useEffect(() => {
    let c = false;
    Promise.all([
      apiFetch('/api/parts?pageSize=500').then((r) => (r.ok ? r.json() : { items: [] })),
      apiFetch('/api/machines?pageSize=500').then((r) => (r.ok ? r.json() : { items: [] })),
    ]).then(([a, b]) => {
      if (c) return;
      if (Array.isArray(a.items)) setParts(a.items);
      if (Array.isArray(b.items)) setMachines(b.items);
    });
    return () => { c = true; };
  }, []);

  useEffect(() => {
    if (!isEdit || workId == null) return;
    let c = false;
    setLoading(true);
    apiFetch(`/api/works/${workId}`).then((res) => (res.ok ? res.json() : null)).then((d) => {
      if (c || !d) return;
      setForm({
        name: String(d.name ?? ''),
        estimated_duration_sec: d.estimated_duration_sec != null ? String(d.estimated_duration_sec) : '',
        work_type: String(d.work_type ?? ''),
        part_ids: Array.isArray(d.part_ids) ? d.part_ids : [],
        machine_ids: Array.isArray(d.machine_ids) ? d.machine_ids : [],
      });
      setReadOnlyMeta({
        updated_at: d.updated_at || null,
        updated_by: d.updated_by_name ?? d.updated_by ?? null,
      });
    }).finally(() => { if (!c) setLoading(false); });
    return () => { c = true; };
  }, [workId, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { alert('작업 이름은 필수입니다.'); return; }
    if (form.estimated_duration_sec === '' || Number(form.estimated_duration_sec) < 0) { alert('예상 소요시간을 입력하세요.'); return; }
    if (!WORK_TYPES.includes(form.work_type)) { alert('작업 Type을 선택하세요 (가조립 또는 조립).'); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        estimated_duration_sec: Number(form.estimated_duration_sec),
        work_type: form.work_type,
        part_ids: form.part_ids,
        machine_ids: form.machine_ids,
        steps: [],
      };
      const res = await apiFetch(isEdit ? `/api/works/${workId}` : '/api/works', { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(body) });
      const errData = res.ok ? null : await res.json();
      if (!res.ok) { alert(errData?.error || '저장 실패'); return; }
      if (inModal && onSuccess) { onSuccess(); return; }
      const saved = await res.json();
      navigate(`/works/${saved.id}`);
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-4 text-gray-500">로딩 중...</div>;

  return (
    <div>
      {!inModal && <Link to={isEdit ? `/works/${workId}` : '/works'} className="text-blue-600 hover:underline text-sm mb-4 inline-block">← {isEdit ? '상세' : '목록'}</Link>}
      <form onSubmit={handleSubmit} className="space-y-4">
        {!inModal && <h2 className="text-2xl font-bold text-gray-900">{isEdit ? '작업 수정' : '작업 등록'}</h2>}

        {/* 필수 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">작업 이름 <span className="text-red-600">*</span></label>
          <input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">예상 소요시간(초) <span className="text-red-600">*</span></label>
          <input type="number" min={0} required value={form.estimated_duration_sec} onChange={(e) => setForm((f) => ({ ...f, estimated_duration_sec: e.target.value }))} className="w-full border border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">작업 Type <span className="text-red-600">*</span></label>
          <select required value={form.work_type} onChange={(e) => setForm((f) => ({ ...f, work_type: e.target.value }))} className="w-full border border rounded px-3 py-2 bg-white">
            <option value="">선택</option>
            {WORK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* 사용 부품 N개, 사용 기계 N개 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">사용 부품</label>
          <div className="w-full border border rounded px-3 py-2 bg-gray-50 min-h-[44px] flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm text-gray-700">
              {form.part_ids.length === 0
                ? '선택된 부품 없음'
                : form.part_ids
                    .map((id) => parts.find((p) => Number(p.id) === Number(id))?.name || `ID ${id}`)
                    .filter(Boolean)
                    .join(', ')}
            </span>
            {form.part_ids.length > 0 && (
              <span className="text-xs text-green-600 font-medium shrink-0">({form.part_ids.length}개 선택됨)</span>
            )}
            <button
              type="button"
              onClick={() => setPartSelectTarget('work')}
              className="text-sm text-blue-600 hover:underline shrink-0"
            >
              부품 선택
            </button>
          </div>
          {partSelectTarget === 'work' && (
            <PartSelectPopup
              parts={parts}
              selectedIds={form.part_ids}
              onConfirm={(ids) => setForm((f) => ({ ...f, part_ids: ids }))}
              onClose={() => setPartSelectTarget(null)}
            />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">사용 기계</label>
          <div className="w-full border border rounded px-3 py-2 bg-gray-50 min-h-[44px] flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm text-gray-700">
              {form.machine_ids.length === 0
                ? '선택된 기계 없음'
                : form.machine_ids
                    .map((id) => machines.find((m) => Number(m.id) === Number(id))?.name || `ID ${id}`)
                    .filter(Boolean)
                    .join(', ')}
            </span>
            {form.machine_ids.length > 0 && (
              <span className="text-xs text-green-600 font-medium shrink-0">({form.machine_ids.length}개 선택됨)</span>
            )}
            <button
              type="button"
              onClick={() => setMachineSelectOpen(true)}
              className="text-sm text-blue-600 hover:underline shrink-0"
            >
              기계 선택
            </button>
          </div>
          {machineSelectOpen && (
            <MachineSelectPopup
              machines={machines}
              selectedIds={form.machine_ids}
              onConfirm={(ids) => setForm((f) => ({ ...f, machine_ids: ids }))}
              onClose={() => setMachineSelectOpen(false)}
            />
          )}
        </div>

        {/* 수정 시: 수정일자, 수정자 (맨 밑, 보기 화면과 동일 2열 테이블) */}
        {isEdit && (
          <div className="detail-view-bnk-card">
            <table className="detail-view-bnk-table w-full border-collapse">
              <tbody>
                <tr className="detail-view-bnk-row">
                  <td className="detail-view-bnk-label">수정일자</td>
                  <td className="detail-view-bnk-value">{readOnlyMeta.updated_at ? <ClientDate value={String(readOnlyMeta.updated_at)} /> : '-'}</td>
                </tr>
                <tr className="detail-view-bnk-row">
                  <td className="detail-view-bnk-label">수정자</td>
                  <td className="detail-view-bnk-value">{readOnlyMeta.updated_by || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? '저장 중...' : '저장'}</button>
          {inModal && onCancel ? <button type="button" onClick={onCancel} className="btn-outline">취소</button> : <Link to={isEdit ? `/works/${workId}` : '/works'} className="btn-outline inline-block">취소</Link>}
        </div>
      </form>
    </div>
  );
}
