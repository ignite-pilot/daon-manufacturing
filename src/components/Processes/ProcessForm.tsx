'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ProcessFormProps {
  processId: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  inModal?: boolean;
}

interface FactoryItem {
  id: number;
  name: string;
}

interface WorkItem {
  id: number;
  name: string;
}

interface ProcessStepRow {
  work_id: number | '';
  actual_duration_sec: string;
  description: string;
}

export default function ProcessForm({ processId, onSuccess, onCancel, inModal }: ProcessFormProps) {
  const router = useRouter();
  const isEdit = processId != null;
  const [factories, setFactories] = useState<FactoryItem[]>([]);
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [productCodes, setProductCodes] = useState<string[]>([]);
  const [form, setForm] = useState({
    factory_id: '' as string | number,
    product_name: '',
    process_name: '',
    total_duration_sec: '',
    description: '',
    steps: [] as ProcessStepRow[],
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/factories?pageSize=500').then((r) => (r.ok ? r.json() : { items: [] })),
      fetch('/api/works?pageSize=500').then((r) => (r.ok ? r.json() : { items: [] })),
      fetch('/api/config/product-codes').then((r) => (r.ok ? r.json() : { items: [] })),
    ]).then(([factData, workData, configData]) => {
      if (cancelled) return;
      if (Array.isArray(factData.items)) setFactories(factData.items);
      if (Array.isArray(workData.items)) setWorks(workData.items);
      if (Array.isArray(configData.items)) setProductCodes(configData.items);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isEdit || processId == null) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/processes/${processId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        const steps = Array.isArray(d.steps)
          ? (d.steps as { work_id?: number; work_name?: string; actual_duration_sec?: number | null; description?: string | null }[]).map((s) => ({
              work_id: s.work_id != null ? s.work_id : ('' as const),
              actual_duration_sec: s.actual_duration_sec != null ? String(s.actual_duration_sec) : '',
              description: String(s.description ?? ''),
            }))
          : [];
        setForm({
          factory_id: Number(d.factory_id),
          product_name: String(d.product_name ?? ''),
          process_name: String(d.process_name ?? ''),
          total_duration_sec: d.total_duration_sec != null ? String(d.total_duration_sec) : '',
          description: String(d.description ?? ''),
          steps,
        });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [processId, isEdit]);

  const updateStep = (index: number, field: keyof ProcessStepRow, value: string | number) => {
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      ),
    }));
  };

  const addStep = () => {
    setForm((f) => ({
      ...f,
      steps: [...f.steps, { work_id: '', actual_duration_sec: '', description: '' }],
    }));
  };

  const removeStep = (index: number) => {
    setForm((f) => ({
      ...f,
      steps: f.steps.filter((_, i) => i !== index),
    }));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    setForm((f) => {
      const steps = [...f.steps];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= steps.length) return f;
      [steps[index], steps[target]] = [steps[target], steps[index]];
      return { ...f, steps };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const factoryId = form.factory_id === '' ? null : Number(form.factory_id);
    if (factoryId == null || !form.product_name.trim() || !form.process_name.trim()) {
      alert('공장, 대상 완제품, 공정 이름은 필수입니다.');
      return;
    }
    if (form.total_duration_sec === '' || Number(form.total_duration_sec) < 0) {
      alert('전체 소요시간을 입력하세요.');
      return;
    }
    const stepPayload = form.steps
      .filter((s) => s.work_id !== '')
      .map((s) => ({
        work_id: Number(s.work_id),
        actual_duration_sec: s.actual_duration_sec !== '' ? Math.max(0, Math.floor(Number(s.actual_duration_sec))) : null,
        description: s.description.trim() || null,
      }));
    setSaving(true);
    try {
      const body = {
        factory_id: factoryId,
        product_name: form.product_name.trim(),
        process_name: form.process_name.trim(),
        total_duration_sec: Number(form.total_duration_sec),
        description: form.description.trim() || null,
        steps: stepPayload,
      };
      const url = isEdit ? `/api/processes/${processId}` : '/api/processes';
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
      router.push(`/processes/${saved.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">로딩 중...</div>;

  return (
    <div>
      {!inModal && (
        <Link href={isEdit ? `/processes/${processId}` : '/processes'} className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          ← {isEdit ? '상세' : '목록'}
        </Link>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {!inModal && <h2 className="text-lg font-semibold">{isEdit ? '공정 수정' : '공정 등록'}</h2>}

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
          <label className="block text-sm font-medium text-gray-700 mb-1">대상 완제품 *</label>
          {productCodes.length > 0 ? (
            <select
              required
              value={form.product_name}
              onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 bg-white"
            >
              <option value="">선택</option>
              {productCodes.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              required
              value={form.product_name}
              onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="대상 완제품 (PRODUCT_CODE 미설정 시 직접 입력)"
            />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">공정 이름 *</label>
          <input
            type="text"
            required
            value={form.process_name}
            onChange={(e) => setForm((f) => ({ ...f, process_name: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="공정 이름"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">전체 소요시간(초) *</label>
          <input
            type="number"
            min={0}
            required
            value={form.total_duration_sec}
            onChange={(e) => setForm((f) => ({ ...f, total_duration_sec: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="초"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">공정 설명</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2"
            rows={2}
            placeholder="공정 설명 (선택)"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">세부 공정 (작업 단계) — 순서대로 배치</label>
            <button type="button" onClick={addStep} className="text-sm text-blue-600 hover:underline">
              + 단계 추가
            </button>
          </div>
          {form.steps.length === 0 && (
            <p className="text-sm text-gray-500 mb-2">작업 단계가 없습니다. 단계 추가로 작업을 순서대로 넣으세요.</p>
          )}
          <div className="space-y-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
            {form.steps.map((step, index) => (
              <div key={index} className="flex items-start gap-2 bg-white border border-gray-200 rounded p-3">
                <div className="flex flex-col gap-1 shrink-0">
                  <button type="button" onClick={() => moveStep(index, 'up')} disabled={index === 0} className="p-1 text-gray-500 hover:text-gray-800 disabled:opacity-40" title="위로">↑</button>
                  <button type="button" onClick={() => moveStep(index, 'down')} disabled={index === form.steps.length - 1} className="p-1 text-gray-500 hover:text-gray-800 disabled:opacity-40" title="아래로">↓</button>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 min-w-0">
                  <div>
                    <label className="block text-xs text-gray-600 mb-0.5">작업</label>
                    <select
                      value={step.work_id === '' ? '' : String(step.work_id)}
                      onChange={(e) => updateStep(index, 'work_id', e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                    >
                      <option value="">선택</option>
                      {works.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-0.5">실 소요시간(초)</label>
                    <input
                      type="number"
                      min={0}
                      value={step.actual_duration_sec}
                      onChange={(e) => updateStep(index, 'actual_duration_sec', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      placeholder="초"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs text-gray-600 mb-0.5">설명</label>
                    <input
                      type="text"
                      value={step.description}
                      onChange={(e) => updateStep(index, 'description', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      placeholder="설명"
                    />
                  </div>
                </div>
                <button type="button" onClick={() => removeStep(index)} className="shrink-0 p-1.5 text-red-600 hover:bg-red-50 rounded text-sm" title="삭제">삭제</button>
              </div>
            ))}
          </div>
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
            <Link href={isEdit ? `/processes/${processId}` : '/processes'} className="px-4 py-2 border rounded inline-block">
              취소
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
