'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { openDaumPostcode } from '@/lib/daum-postcode';

interface FactoryFormProps {
  factoryId: number | null;
  /** 모달에서 사용 시 저장 후 호출 (모달 닫기·목록 갱신) */
  onSuccess?: () => void;
  /** 모달에서 사용 시 취소 시 호출 */
  onCancel?: () => void;
  /** true면 링크/라우터 대신 onSuccess/onCancel 사용 (모달용) */
  inModal?: boolean;
}

export default function FactoryForm({ factoryId, onSuccess, onCancel, inModal }: FactoryFormProps) {
  const router = useRouter();
  const isEdit = factoryId != null;
  const [form, setForm] = useState({
    name: '',
    zip_code: '',
    address: '',
    address_detail: '',
    description: '',
    area: '',
    cad_file_path: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/factories/${factoryId}`);
        if (res.ok) {
          const d = await res.json();
          if (!cancelled) {
            setForm({
              name: String(d.name ?? ''),
              zip_code: String(d.zip_code ?? ''),
              address: String(d.address ?? ''),
              address_detail: String(d.address_detail ?? ''),
              description: String(d.description ?? ''),
              area: d.area != null ? String(d.area) : '',
              cad_file_path: String(d.cad_file_path ?? ''),
            });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [factoryId, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        zip_code: form.zip_code.trim() || null,
        address: form.address.trim(),
        address_detail: form.address_detail.trim() || null,
        description: form.description.trim() || null,
        area: form.area.trim() ? Number(form.area) : null,
        cad_file_path: form.cad_file_path.trim() || null,
      };
      const url = isEdit ? `/api/factories/${factoryId}` : '/api/factories';
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
      router.push(`/factories/${saved.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">로딩 중...</div>;

  return (
    <div>
      {!inModal && (
        <Link href={isEdit ? `/factories/${factoryId}` : '/factories'} className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          ← {isEdit ? '상세' : '목록'}
        </Link>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {!inModal && <h2 className="text-lg font-semibold">{isEdit ? '공장 수정' : '공장 등록'}</h2>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">공장 이름 *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">우편번호</label>
          <input
            type="text"
            value={form.zip_code}
            onChange={(e) => setForm((f) => ({ ...f, zip_code: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="주소 검색 시 자동 입력"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">주소 *</label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="flex-1 border border-gray-300 rounded px-3 py-2"
              placeholder="주소 검색 버튼으로 검색"
            />
            <button
              type="button"
              onClick={() => {
                openDaumPostcode()
                  .then(({ address, zonecode }) =>
                    setForm((f) => ({ ...f, address, zip_code: zonecode || '' }))
                  )
                  .catch(() => {});
              }}
              className="shrink-0 px-4 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 text-sm font-medium text-gray-700"
            >
              주소 검색
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">상세 주소</label>
          <input
            type="text"
            value={form.address_detail}
            onChange={(e) => setForm((f) => ({ ...f, address_detail: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="동, 호수, 상세 주소 등"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">면적</label>
          <input
            type="number"
            step="any"
            value={form.area}
            onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CAD 파일</label>
          <input
            type="text"
            value={form.cad_file_path}
            onChange={(e) => setForm((f) => ({ ...f, cad_file_path: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="파일 경로 또는 URL"
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
            <Link href={isEdit ? `/factories/${factoryId}` : '/factories'} className="px-4 py-2 border rounded inline-block">
              취소
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
