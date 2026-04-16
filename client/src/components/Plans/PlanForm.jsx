import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

/**
 * 도면 수정 폼 (이름 · 연관 공장만 수정 가능)
 * 파일 재업로드/재분석은 업로드 wizard 에서 별도로 처리
 */
export default function PlanForm({ planId, onSuccess, onCancel }) {
  const isEdit = planId != null;

  const [factories, setFactories] = useState([]);
  const [form, setForm] = useState({ name: '', factory_id: '' });
  const [meta, setMeta] = useState({ updated_at: null, updated_by: null, version: null });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // 공장 목록 로드
  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/factories?pageSize=500')
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        if (!cancelled && Array.isArray(data.items)) setFactories(data.items);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // 수정 모드: 기존 값 로드
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/plan/${planId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setForm({
          name: String(d.name ?? ''),
          factory_id: d.factory_id != null ? String(d.factory_id) : '',
        });
        setMeta({
          updated_at: d.updated_at || null,
          updated_by: d.updated_by || null,
          version: d.version ?? null,
        });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isEdit, planId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const name = form.name.trim();
    if (!name) { setError('도면 이름은 필수입니다.'); return; }

    setSaving(true);
    try {
      const body = {
        name,
        factory_id: form.factory_id ? Number(form.factory_id) : null,
      };
      const res = await apiFetch(`/api/plan/${planId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error || '저장 실패'); return; }
      onSuccess?.();
    } catch (e) {
      setError(e.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-400 text-sm">로딩 중...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-1">
      {/* 메타 정보 */}
      {isEdit && meta.version != null && (
        <div className="text-xs text-gray-400 flex gap-4">
          <span>버전 {meta.version}</span>
          {meta.updated_at && <span>수정일 {String(meta.updated_at).slice(0, 10)}</span>}
          {meta.updated_by && <span>수정자 {meta.updated_by}</span>}
        </div>
      )}

      {/* 도면 이름 */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          도면 이름 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          placeholder="도면 이름을 입력하세요"
          required
        />
      </div>

      {/* 연관 공장 */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">연관 공장</label>
        <select
          name="factory_id"
          value={form.factory_id}
          onChange={handleChange}
          className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
        >
          <option value="">선택 안 함</option>
          {factories.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {/* 에러 */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* 버튼 */}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-outline" onClick={onCancel} disabled={saving}>
          취소
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}
