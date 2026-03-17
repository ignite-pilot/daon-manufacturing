import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { apiFetch, getPhotoViewUrl } from '../../lib/api';
import { openDaumPostcode } from '../../lib/daum-postcode';
import ClientDate from '../ClientDate';

/**
 * PRD 제조 공장: 공장 정보
 * 필수 - 공장 이름, 주소, 수정일자, 수정자 (수정일자/수정자는 서버 자동 설정, 수정 시에만 표시)
 * 선택 - 공장 설명, 면적, CAD 파일
 */
export default function FactoryForm({ factoryId: factoryIdProp, onSuccess, onCancel, inModal }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const factoryId = factoryIdProp != null ? factoryIdProp : (id ? Number(id) : null);
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
  const [readOnlyMeta, setReadOnlyMeta] = useState({ updated_at: null, updated_by: null });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cadUploading, setCadUploading] = useState(false);
  const [cadFileName, setCadFileName] = useState('');
  const cadFileInputRef = useRef(null);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/factories/${factoryId}`)
      .then((res) => res.ok ? res.json() : null)
      .then((d) => {
        if (cancelled || !d) return;
        setForm({
          name: String(d.name ?? ''),
          zip_code: String(d.zip_code ?? ''),
          address: String(d.address ?? ''),
          address_detail: String(d.address_detail ?? ''),
          description: String(d.description ?? ''),
          area: d.area != null ? String(d.area) : '',
          cad_file_path: String(d.cad_file_path ?? ''),
        });
        setReadOnlyMeta({
          updated_at: d.updated_at || null,
          updated_by: d.updated_by_name ?? d.updated_by ?? null,
        });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [factoryId, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = {
      name: form.name.trim(),
      zip_code: form.zip_code.trim() || null,
      address: form.address.trim(),
      address_detail: form.address_detail.trim() || null,
      description: form.description.trim() || null,
      area: form.area.trim() ? Number(form.area) : null,
      cad_file_path: form.cad_file_path.trim() || null,
    };
    setSaving(true);
    try {
      const url = isEdit ? `/api/factories/${factoryId}` : '/api/factories';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await apiFetch(url, { method, body: JSON.stringify(body) });
      const errData = res.ok ? null : await res.json();
      if (!res.ok) {
        alert(errData?.error || '저장 실패');
        return;
      }
      if (inModal && onSuccess) { onSuccess(); return; }
      const saved = await res.json();
      navigate(`/factories/${saved.id}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">로딩 중...</div>;

  return (
    <div>
      {!inModal && (
        <Link to={isEdit ? `/factories/${factoryId}` : '/factories'} className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          ← {isEdit ? '상세' : '목록'}
        </Link>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {!inModal && <h2 className="text-2xl font-bold text-gray-900">{isEdit ? '공장 수정' : '공장 등록'}</h2>}

        {/* 필수: 공장 이름 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">공장 이름 <span className="text-red-600">*</span></label>
          <input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border rounded px-3 py-2" placeholder="공장 이름" />
        </div>

        {/* 필수: 주소 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">우편번호</label>
          <input type="text" value={form.zip_code} onChange={(e) => setForm((f) => ({ ...f, zip_code: e.target.value }))} className="w-full border border rounded px-3 py-2" placeholder="주소 검색 시 자동 입력" readOnly aria-label="우편번호" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">주소 <span className="text-red-600">*</span></label>
          <div className="flex gap-2 flex-wrap">
            <input type="text" required value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="flex-1 min-w-0 border border rounded px-3 py-2" placeholder="주소 검색 버튼으로 검색" />
            <button
              type="button"
              onClick={() => openDaumPostcode().then(({ address, zonecode }) => setForm((f) => ({ ...f, address, zip_code: zonecode || '' }))).catch(() => {})}
              className="shrink-0 px-4 py-2 border border rounded bg-white hover:bg-gray-50 text-sm font-medium text-gray-700"
            >
              주소 검색
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">상세 주소</label>
          <input type="text" value={form.address_detail} onChange={(e) => setForm((f) => ({ ...f, address_detail: e.target.value }))} className="w-full border border rounded px-3 py-2" placeholder="동, 호수 등" />
        </div>

        {/* 선택: 공장 설명, 면적, CAD 파일 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">공장 설명 <span className="text-gray-400 text-xs">(선택)</span></label>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full border border rounded px-3 py-2" rows={2} placeholder="공장 설명" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">면적 <span className="text-gray-400 text-xs">(선택)</span></label>
          <input type="number" step="any" min="0" value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} className="w-full border border rounded px-3 py-2" placeholder="면적" />
        </div>
        {/* 선택: CAD 파일 업로드 (부품 사진과 동일한 방식) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CAD 파일 <span className="text-gray-400 text-xs">(선택)</span></label>
          <input
            ref={cadFileInputRef}
            type="file"
            accept=".dwg,.dxf,.pdf,image/*"
            className="photo-file-input-hidden"
            aria-hidden="true"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setCadUploading(true);
              try {
                const fd = new FormData();
                fd.append('file', f);
                fd.append('prefix', 'factories');
                const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: fd });
                const data = await res.json();
                if (res.ok && data.url) {
                  setForm((prev) => ({ ...prev, cad_file_path: data.url }));
                  setCadFileName(f.name || '');
                } else alert(data?.error || '업로드 실패');
              } catch (err) {
                alert(err?.message || '업로드 실패');
              } finally {
                setCadUploading(false);
                if (cadFileInputRef.current) cadFileInputRef.current.value = '';
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => cadFileInputRef.current?.click()} disabled={cadUploading} className="photo-upload-btn">
              {cadUploading ? '업로드 중...' : '파일 선택'}
            </button>
            {form.cad_file_path && (
              <div className="photo-preview-wrap">
                <a href={getPhotoViewUrl(form.cad_file_path)} target="_blank" rel="noopener noreferrer" className="photo-preview-link">
                  <img
                    src={getPhotoViewUrl(form.cad_file_path)}
                    alt="미리보기"
                    className="photo-preview-img"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = e.target.nextElementSibling;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <span className="cad-preview-placeholder" style={{ display: 'none' }} aria-hidden>CAD</span>
                </a>
                <p className="photo-preview-name" title={cadFileName || form.cad_file_path}>{cadFileName || '이미지'}</p>
                <a href={getPhotoViewUrl(form.cad_file_path)} target="_blank" rel="noopener noreferrer" className="photo-upload-link">보기</a>
                <button type="button" onClick={() => { setForm((f) => ({ ...f, cad_file_path: '' })); setCadFileName(''); }} className="photo-upload-remove">삭제</button>
              </div>
            )}
          </div>
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
          {inModal && onCancel ? <button type="button" onClick={onCancel} className="btn-outline">취소</button> : <Link to={isEdit ? `/factories/${factoryId}` : '/factories'} className="btn-outline inline-block">취소</Link>}
        </div>
      </form>
    </div>
  );
}
