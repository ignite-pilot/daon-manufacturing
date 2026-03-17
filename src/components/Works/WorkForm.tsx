'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PartSelectPopup from '@/components/PartSelectPopup';
import MachineSelectPopup from '@/components/MachineSelectPopup';

const WORK_TYPES = ['가조립', '조립'] as const;

interface WorkFormProps {
  workId: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  inModal?: boolean;
}

interface PartItem {
  id: number;
  name: string;
}

interface MachineItem {
  id: number;
  name: string;
}

export default function WorkForm({ workId, onSuccess, onCancel, inModal }: WorkFormProps) {
  const router = useRouter();
  const isEdit = workId != null;
  const [parts, setParts] = useState<PartItem[]>([]);
  const [machines, setMachines] = useState<MachineItem[]>([]);
  const [form, setForm] = useState({
    name: '',
    estimated_duration_sec: '',
    work_type: '' as string,
    part_ids: [] as number[],
    machine_ids: [] as number[],
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [partSelectTarget, setPartSelectTarget] = useState<null | 'work'>(null);
  const [machineSelectOpen, setMachineSelectOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/parts?pageSize=500').then((r) => (r.ok ? r.json() : { items: [] })),
      fetch('/api/machines?pageSize=500').then((r) => (r.ok ? r.json() : { items: [] })),
    ]).then(([partData, machineData]) => {
      if (cancelled) return;
      if (Array.isArray(partData.items)) setParts(partData.items);
      if (Array.isArray(machineData.items)) setMachines(machineData.items);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isEdit || workId == null) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/works/${workId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setForm({
          name: String(d.name ?? ''),
          estimated_duration_sec: d.estimated_duration_sec != null ? String(d.estimated_duration_sec) : '',
          work_type: String(d.work_type ?? ''),
          part_ids: Array.isArray(d.part_ids) ? d.part_ids : [],
          machine_ids: Array.isArray(d.machine_ids) ? d.machine_ids : [],
        });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workId, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('작업 이름은 필수입니다.');
      return;
    }
    if (form.estimated_duration_sec === '' || Number(form.estimated_duration_sec) < 0) {
      alert('예상 소요시간을 입력하세요.');
      return;
    }
    if (!WORK_TYPES.includes(form.work_type as (typeof WORK_TYPES)[number])) {
      alert('작업 Type을 선택하세요 (가조립 또는 조립).');
      return;
    }
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
      const url = isEdit ? `/api/works/${workId}` : '/api/works';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || '저장 실패');
        return;
      }
      if (inModal && onSuccess) {
        onSuccess();
        return;
      }
      const saved = await res.json();
      router.push(`/works/${saved.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">로딩 중...</div>;

  return (
    <div>
      {!inModal && (
        <Link href={isEdit ? `/works/${workId}` : '/works'} className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          ← {isEdit ? '상세' : '목록'}
        </Link>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {!inModal && <h2 className="text-lg font-semibold">{isEdit ? '작업 수정' : '작업 등록'}</h2>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">작업 이름 *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="작업 이름"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">예상 소요시간(초) *</label>
          <input
            type="number"
            min={0}
            required
            value={form.estimated_duration_sec}
            onChange={(e) => setForm((f) => ({ ...f, estimated_duration_sec: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="분"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">작업 Type *</label>
          <select
            required
            value={form.work_type}
            onChange={(e) => setForm((f) => ({ ...f, work_type: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2 bg-white"
          >
            <option value="">선택</option>
            {WORK_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">사용 부품</label>
          <div className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 min-h-[44px] flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm text-gray-700">
              {form.part_ids.length === 0
                ? '선택된 부품 없음'
                : form.part_ids
                    .map((id) => parts.find((p) => p.id === id)?.name ?? `ID ${id}`)
                    .filter(Boolean)
                    .join(', ')}
            </span>
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
          <div className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 min-h-[44px] flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm text-gray-700">
              {form.machine_ids.length === 0
                ? '선택된 기계 없음'
                : form.machine_ids
                    .map((id) => machines.find((m) => m.id === id)?.name ?? `ID ${id}`)
                    .filter(Boolean)
                    .join(', ')}
            </span>
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

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
          {inModal && onCancel ? (
            <button type="button" onClick={onCancel} className="px-4 py-2 border rounded hover:bg-gray-50">
              취소
            </button>
          ) : (
            <Link href={isEdit ? `/works/${workId}` : '/works'} className="px-4 py-2 border rounded inline-block">
              취소
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
