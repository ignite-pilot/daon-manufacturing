'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface MachineFormProps {
  machineId: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  inModal?: boolean;
}

interface FactoryItem {
  id: number;
  name: string;
}

export default function MachineForm({ machineId, onSuccess, onCancel, inModal }: MachineFormProps) {
  const router = useRouter();
  const isEdit = machineId != null;
  const [factories, setFactories] = useState<FactoryItem[]>([]);
  const [form, setForm] = useState({
    factory_id: '' as string | number,
    name: '',
    total_duration_sec: '',
    photo_url: '',
    description: '',
    manufacturer: '',
    as_contact: '',
    as_phone: '',
    introduced_at: '',
    location_in_factory: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/factories?pageSize=500')
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        if (!cancelled && Array.isArray(data.items)) setFactories(data.items);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isEdit || machineId == null) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/machines/${machineId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setForm({
          factory_id: Number(d.factory_id),
          name: String(d.name ?? ''),
          total_duration_sec: d.total_duration_sec != null ? String(d.total_duration_sec) : '',
          photo_url: String(d.photo_url ?? ''),
          description: String(d.description ?? ''),
          manufacturer: String(d.manufacturer ?? ''),
          as_contact: String(d.as_contact ?? ''),
          as_phone: String(d.as_phone ?? ''),
          introduced_at: d.introduced_at ? String(d.introduced_at).slice(0, 10) : '',
          location_in_factory: String(d.location_in_factory ?? ''),
        });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [machineId, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const factoryId = form.factory_id === '' ? null : Number(form.factory_id);
    if (factoryId == null || !form.name.trim()) {
      alert('공장과 기계 이름은 필수입니다.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        factory_id: factoryId,
        name: form.name.trim(),
        total_duration_sec: form.total_duration_sec ? Number(form.total_duration_sec) : null,
        photo_url: form.photo_url.trim() || null,
        description: form.description.trim() || null,
        manufacturer: form.manufacturer.trim() || null,
        as_contact: form.as_contact.trim() || null,
        as_phone: form.as_phone.trim() || null,
        introduced_at: form.introduced_at.trim() || null,
        location_in_factory: form.location_in_factory.trim() || null,
        operation_steps: [],
        required_part_ids: [],
      };
      const url = isEdit ? `/api/machines/${machineId}` : '/api/machines';
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
      router.push(`/machines/${saved.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">로딩 중...</div>;

  return (
    <div>
      {!inModal && (
        <Link href={isEdit ? `/machines/${machineId}` : '/machines'} className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          ← {isEdit ? '상세' : '목록'}
        </Link>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {!inModal && <h2 className="text-lg font-semibold">{isEdit ? '기계 수정' : '기계 등록'}</h2>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">공장 *</label>
          <select
            required
            value={form.factory_id === '' ? '' : String(form.factory_id)}
            onChange={(e) => setForm((f) => ({ ...f, factory_id: e.target.value === '' ? '' : Number(e.target.value) }))}
            className="w-full border border-gray-300 rounded px-3 py-2 bg-white"
          >
            <option value="">선택</option>
            {factories.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">기계 이름 *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="기계 이름"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">기계 소요시간(초)</label>
          <input
            type="number"
            value={form.total_duration_sec}
            onChange={(e) => setForm((f) => ({ ...f, total_duration_sec: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="초"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">사진 URL</label>
          <input
            type="text"
            value={form.photo_url}
            onChange={(e) => setForm((f) => ({ ...f, photo_url: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="이미지 URL"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
            rows={2}
            placeholder="설명"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">제조사</label>
          <input
            type="text"
            value={form.manufacturer}
            onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">AS 담당자</label>
          <input
            type="text"
            value={form.as_contact}
            onChange={(e) => setForm((f) => ({ ...f, as_contact: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">AS 연락처</label>
          <input
            type="text"
            value={form.as_phone}
            onChange={(e) => setForm((f) => ({ ...f, as_phone: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">도입일</label>
          <input
            type="date"
            value={form.introduced_at}
            onChange={(e) => setForm((f) => ({ ...f, introduced_at: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">공장 내 위치</label>
          <input
            type="text"
            value={form.location_in_factory}
            onChange={(e) => setForm((f) => ({ ...f, location_in_factory: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
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
            <Link href={isEdit ? `/machines/${machineId}` : '/machines'} className="px-4 py-2 border rounded inline-block">
              취소
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
