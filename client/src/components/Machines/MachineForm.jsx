import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { apiFetch, getPhotoViewUrl } from '../../lib/api';
import ClientDate from '../ClientDate';

/**
 * PRD 기계: 필수 - 공장, 기계 이름, 기계 소요시간, 수정일자, 수정자
 * 선택 - 기계 사진, 기계 설명, 제조사, AS 담당자, AS 연락처, 도입일시, 공장내 위치
 */
export default function MachineForm({ machineId: machineIdProp, onSuccess, onCancel, inModal }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const machineId = machineIdProp != null ? machineIdProp : (id ? Number(id) : null);
  const isEdit = machineId != null;
  const [factories, setFactories] = useState([]);
  const [form, setForm] = useState({
    factory_id: '',
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
  const [readOnlyMeta, setReadOnlyMeta] = useState({ updated_at: null, updated_by: null });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoFileName, setPhotoFileName] = useState('');
  const photoInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/factories?pageSize=500').then((res) => (res.ok ? res.json() : { items: [] })).then((data) => {
      if (!cancelled && Array.isArray(data.items)) setFactories(data.items);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isEdit || machineId == null) return;
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/machines/${machineId}`)
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
        setReadOnlyMeta({
          updated_at: d.updated_at || null,
          updated_by: d.updated_by_name ?? d.updated_by ?? null,
        });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [machineId, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const factoryId = form.factory_id === '' ? null : Number(form.factory_id);
    if (factoryId == null || !form.name.trim()) { alert('공장과 기계 이름은 필수입니다.'); return; }
    if (form.total_duration_sec !== '' && Number(form.total_duration_sec) < 0) { alert('기계 소요시간은 0 이상으로 입력하세요.'); return; }
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
      const res = await apiFetch(url, { method, body: JSON.stringify(body) });
      const errData = res.ok ? null : await res.json();
      if (!res.ok) { alert(errData?.error || '저장 실패'); return; }
      if (inModal && onSuccess) { onSuccess(); return; }
      const saved = await res.json();
      navigate(`/machines/${saved.id}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">로딩 중...</div>;

  return (
    <div>
      {!inModal && <Link to={isEdit ? `/machines/${machineId}` : '/machines'} className="text-blue-600 hover:underline text-sm mb-4 inline-block">← {isEdit ? '상세' : '목록'}</Link>}
      <form onSubmit={handleSubmit} className="space-y-4">
        {!inModal && <h2 className="text-2xl font-bold text-gray-900">{isEdit ? '기계 수정' : '기계 등록'}</h2>}

        {/* 필수 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">공장 <span className="text-red-600">*</span></label>
          <select required value={form.factory_id === '' ? '' : String(form.factory_id)} onChange={(e) => setForm((f) => ({ ...f, factory_id: e.target.value === '' ? '' : Number(e.target.value) }))} className="w-full border border rounded px-3 py-2 bg-white">
            <option value="">선택</option>
            {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">기계 이름 <span className="text-red-600">*</span></label>
          <input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">기계 소요시간(초)</label>
          <input type="number" min={0} value={form.total_duration_sec} onChange={(e) => setForm((f) => ({ ...f, total_duration_sec: e.target.value }))} className="w-full border border rounded px-3 py-2" placeholder="초 (선택)" />
        </div>

        {/* 선택: 기계 사진 파일 첨부 → S3 업로드 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">기계 사진 <span className="text-gray-400 text-xs">(선택)</span></label>
          <input ref={photoInputRef} type="file" accept="image/*" className="photo-file-input-hidden" aria-hidden="true" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setPhotoUploading(true);
            try {
              const fd = new FormData();
              fd.append('file', f);
              fd.append('prefix', 'machines');
              const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: fd });
              const data = await res.json();
              if (res.ok && data.url) {
                setForm((prev) => ({ ...prev, photo_url: data.url }));
                setPhotoFileName(f.name || '');
              } else alert(data?.error || '업로드 실패');
            } catch (err) {
              alert(err?.message || '업로드 실패');
            } finally {
              setPhotoUploading(false);
              if (photoInputRef.current) photoInputRef.current.value = '';
            }
          }} />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => photoInputRef.current?.click()} disabled={photoUploading} className="photo-upload-btn">
              {photoUploading ? '업로드 중...' : '파일 선택'}
            </button>
            {form.photo_url && (
              <div className="photo-preview-wrap">
                <a href={getPhotoViewUrl(form.photo_url)} target="_blank" rel="noopener noreferrer" className="photo-preview-link">
                  <img src={getPhotoViewUrl(form.photo_url)} alt="미리보기" className="photo-preview-img" />
                </a>
                <p className="photo-preview-name" title={photoFileName || form.photo_url}>{photoFileName || '이미지'}</p>
                <a href={getPhotoViewUrl(form.photo_url)} target="_blank" rel="noopener noreferrer" className="photo-upload-link">보기</a>
                <button type="button" onClick={() => { setForm((f) => ({ ...f, photo_url: '' })); setPhotoFileName(''); }} className="photo-upload-remove">삭제</button>
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">기계 설명 <span className="text-gray-400 text-xs">(선택)</span></label>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full border border rounded px-3 py-2" rows={2} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">제조사 <span className="text-gray-400 text-xs">(선택)</span></label>
          <input type="text" value={form.manufacturer} onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))} className="w-full border border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">AS 담당자 <span className="text-gray-400 text-xs">(선택)</span></label>
          <input type="text" value={form.as_contact} onChange={(e) => setForm((f) => ({ ...f, as_contact: e.target.value }))} className="w-full border border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">AS 연락처 <span className="text-gray-400 text-xs">(선택)</span></label>
          <input type="text" value={form.as_phone} onChange={(e) => setForm((f) => ({ ...f, as_phone: e.target.value }))} className="w-full border border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">도입일시 <span className="text-gray-400 text-xs">(선택)</span></label>
          <input type="date" value={form.introduced_at} onChange={(e) => setForm((f) => ({ ...f, introduced_at: e.target.value }))} className="w-full border border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">공장내 위치 <span className="text-gray-400 text-xs">(선택)</span></label>
          <input type="text" value={form.location_in_factory} onChange={(e) => setForm((f) => ({ ...f, location_in_factory: e.target.value }))} className="w-full border border rounded px-3 py-2" placeholder="공장 공간과 연동" />
        </div>

        {/* 수정 시: 수정일자, 수정자 (보기 화면과 동일한 2열 테이블 스타일, 맨 밑) */}
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
          {inModal && onCancel ? <button type="button" onClick={onCancel} className="btn-outline">취소</button> : <Link to={isEdit ? `/machines/${machineId}` : '/machines'} className="btn-outline inline-block">취소</Link>}
        </div>
      </form>
    </div>
  );
}
