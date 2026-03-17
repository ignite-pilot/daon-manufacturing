'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PartFormProps {
  /** null: 등록, number: 수정 */
  partId: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  inModal?: boolean;
}

interface FactoryItem {
  id: number;
  name: string;
}

export default function PartForm({ partId, onSuccess, onCancel, inModal }: PartFormProps) {
  const router = useRouter();
  const isEdit = partId != null;
  const [factories, setFactories] = useState<FactoryItem[]>([]);
  const [form, setForm] = useState({
    factory_id: '' as string | number,
    name: '',
    photo_url: '',
    description: '',
    manufacturer: '',
    as_contact: '',
    as_phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/factories?pageSize=500')
      .then((res) => res.ok ? res.json() : { items: [] })
      .then((data) => {
        if (!cancelled && Array.isArray(data.items)) setFactories(data.items);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isEdit || partId == null) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/parts/${partId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setForm({
          factory_id: Number(d.factory_id),
          name: String(d.name ?? ''),
          photo_url: String(d.photo_url ?? ''),
          description: String(d.description ?? ''),
          manufacturer: String(d.manufacturer ?? ''),
          as_contact: String(d.as_contact ?? ''),
          as_phone: String(d.as_phone ?? ''),
        });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [partId, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const factoryId = form.factory_id === '' ? null : Number(form.factory_id);
    if (factoryId == null || !form.name.trim()) {
      alert('공장과 부품 이름은 필수입니다.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        factory_id: factoryId,
        name: form.name.trim(),
        photo_url: form.photo_url.trim() || null,
        description: form.description.trim() || null,
        manufacturer: form.manufacturer.trim() || null,
        as_contact: form.as_contact.trim() || null,
        as_phone: form.as_phone.trim() || null,
      };
      const url = isEdit ? `/api/parts/${partId}` : '/api/parts';
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
      router.push(`/parts/${saved.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">로딩 중...</div>;

  return (
    <div>
      {!inModal && (
        <Link href={isEdit ? `/parts/${partId}` : '/parts'} className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          ← {isEdit ? '상세' : '목록'}
        </Link>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {!inModal && <h2 className="text-lg font-semibold">{isEdit ? '부품 수정' : '부품 등록'}</h2>}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">부품 이름 *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="부품 이름"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">부품 사진 (URL)</label>
          <input
            type="text"
            value={form.photo_url}
            onChange={(e) => setForm((f) => ({ ...f, photo_url: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="이미지 URL"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">부품 설명</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
            rows={3}
            placeholder="부품 설명"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">제조사</label>
          <input
            type="text"
            value={form.manufacturer}
            onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="제조사"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">AS 담당자</label>
          <input
            type="text"
            value={form.as_contact}
            onChange={(e) => setForm((f) => ({ ...f, as_contact: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="AS 담당자"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">AS 연락처</label>
          <input
            type="text"
            value={form.as_phone}
            onChange={(e) => setForm((f) => ({ ...f, as_phone: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="AS 연락처"
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
            <Link href={isEdit ? `/parts/${partId}` : '/parts'} className="px-4 py-2 border rounded inline-block">
              취소
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
