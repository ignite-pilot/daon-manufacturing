import { useEffect, useState, useRef } from 'react'
import { api } from '../lib/api'
import LayerPopup from '../components/LayerPopup'

// ── 유틸 ─────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function formatTime(ms) {
  if (!ms) return '0:00.00'
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  const cs = Math.floor((ms % 1000) / 10)
  return `${min}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

// ── 상수 ─────────────────────────────────────────────────────────────
const TYPE_LABEL = {
  SOURCE:   '소스 (Source)',
  DRAIN:    '드레인 (Drain)',
  BUFFER:   '버퍼 (Buffer)',
  CONVEYOR: '컨베이어 (Conveyor)',
  STATION:  '스테이션 (Station)',
}

const TYPE_COLOR = {
  SOURCE:   'bg-blue-100 text-blue-800',
  DRAIN:    'bg-red-100 text-red-800',
  BUFFER:   'bg-yellow-100 text-yellow-800',
  CONVEYOR: 'bg-green-100 text-green-800',
  STATION:  'bg-purple-100 text-purple-800',
}

// ── 프로젝트 생성/수정 모달 ───────────────────────────────────────────
function ProjectFormModal({ title, initial, plans, confirmLabel, onConfirm, onCancel }) {
  const [form, setForm] = useState({
    name:        initial?.name        ?? '',
    description: initial?.description ?? '',
    plan_id:     initial?.plan_id     ? String(initial.plan_id) : '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onConfirm({
      name:        form.name.trim(),
      description: form.description.trim() || null,
      plan_id:     form.plan_id ? Number(form.plan_id) : null,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
        <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">프로젝트명 <span className="text-red-500">*</span></span>
            <input
              className="border rounded px-3 py-1.5 text-sm"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="프로젝트 이름"
              autoFocus
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">연결 도면</span>
            <select
              className="border rounded px-3 py-1.5 text-sm"
              value={form.plan_id}
              onChange={e => set('plan_id', e.target.value)}
            >
              <option value="">도면 없음</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.name} (v{p.version})</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">설명</span>
            <textarea
              className="border rounded px-3 py-1.5 text-sm resize-none"
              rows={3}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="프로젝트 설명 (선택)"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCancel}
              className="px-4 py-2 text-sm border rounded hover:bg-gray-50">취소</button>
            <button type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── 프로젝트 목록 화면 ────────────────────────────────────────────────
function ProjectListView({ onEnter }) {
  const [projects, setProjects] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingProject, setEditingProject] = useState(null)

  useEffect(() => {
    Promise.all([
      api('/api/simulation/projects').catch(() => []),
      api('/api/plan?pageSize=100').then(d => d?.items ?? []).catch(() => []),
    ]).then(([projs, plns]) => {
      setProjects(Array.isArray(projs) ? projs : [])
      setPlans(Array.isArray(plns) ? plns : [])
    }).finally(() => setLoading(false))
  }, [])

  const handleCreate = async (data) => {
    const created = await api('/api/simulation/projects', { method: 'POST', body: data })
    setProjects(prev => [created, ...prev])
    setShowCreate(false)
  }

  const handleEdit = async (data) => {
    const updated = await api(`/api/simulation/projects/${editingProject.id}`, { method: 'PUT', body: data })
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    setEditingProject(null)
  }

  const handleDelete = async (id) => {
    if (!confirm('프로젝트를 삭제하시겠습니까?')) return
    await api(`/api/simulation/projects/${id}`, { method: 'DELETE' })
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">시뮬레이션 관리</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
        >+ 새 프로젝트</button>
      </div>

      <section className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : projects.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center', fontSize: 14, color: '#9ca3af' }}>
            등록된 시뮬레이션 프로젝트가 없습니다. 새 프로젝트를 생성하세요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-600">
                  <th className="border-b px-4 py-3 font-medium">프로젝트명</th>
                  <th className="border-b px-4 py-3 font-medium whitespace-nowrap">연결 도면</th>
                  <th className="border-b px-4 py-3 font-medium">설명</th>
                  <th className="border-b px-4 py-3 font-medium whitespace-nowrap">생성자</th>
                  <th className="border-b px-4 py-3 font-medium whitespace-nowrap">생성일</th>
                  <th className="border-b px-4 py-3 font-medium whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onEnter(p)}
                        style={{ fontWeight: 600, color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'none' }}
                        onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
                        onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
                      >
                        {p.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {p.plan_name ?? <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                      {p.description ?? <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {p.created_by ?? <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(p.created_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button className="btn-table-edit" onClick={() => setEditingProject(p)}>수정</button>
                        <button className="btn-table-delete" onClick={() => handleDelete(p.id)}>삭제</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showCreate && (
        <ProjectFormModal
          title="새 시뮬레이션 프로젝트"
          plans={plans}
          confirmLabel="생성"
          onConfirm={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}
      {editingProject && (
        <ProjectFormModal
          title="프로젝트 수정"
          initial={editingProject}
          plans={plans}
          confirmLabel="저장"
          onConfirm={handleEdit}
          onCancel={() => setEditingProject(null)}
        />
      )}
    </div>
  )
}

// ── 심볼 선택 팝업 ───────────────────────────────────────────────────
function SymbolPickerModal({ type, symbols, usedHandles, loading, onSelect, onCancel }) {
  const [keyword, setKeyword] = useState('')
  const [hoveredHandle, setHoveredHandle] = useState(null)
  const q = keyword.trim().toLowerCase()

  const allOfType = symbols.filter(s => s.category === type)
  const filtered = allOfType.filter(s => {
    if (!q) return true
    return (
      (s.legend       ?? '').toLowerCase().includes(q) ||
      (s.handle       ?? '').toLowerCase().includes(q) ||
      (s.annotation   ?? '').toLowerCase().includes(q) ||
      (s.work_name    ?? '').toLowerCase().includes(q) ||
      (s.description  ?? '').toLowerCase().includes(q)
    )
  })

  const fmtPos  = s => (s.center_x != null && s.center_y != null)
    ? `(${Number(s.center_x).toFixed(1)}, ${Number(s.center_y).toFixed(1)})` : '-'
  const fmtSize = s => (s.width != null && s.height != null)
    ? `${Number(s.width).toFixed(1)} × ${Number(s.height).toFixed(1)}` : '-'

  const thStyle = {
    position: 'sticky', top: 0, background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0', padding: '8px 10px',
    fontSize: '0.75rem', fontWeight: 600, color: '#64748b',
    whiteSpace: 'nowrap', textAlign: 'left', zIndex: 1,
  }

  return (
    <LayerPopup
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[type]}`}>{type}</span>
          심볼 선택
        </span>
      }
      onClose={onCancel}
      maxWidth={980}
    >
      {/* 검색 */}
      {!loading && allOfType.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="범례, 핸들, 주석, 작업, 설명 검색…"
            autoFocus
            style={{
              width: '100%', padding: '8px 12px', fontSize: '0.875rem',
              border: '1px solid #e2e8f0', borderRadius: 6, outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.15)' }}
            onBlur={e  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
          />
        </div>
      )}

      {/* 본문 */}
      {loading ? (
        <p style={{ padding: '40px 0', textAlign: 'center', fontSize: 14, color: '#9ca3af' }}>
          심볼 목록을 불러오는 중...
        </p>
      ) : allOfType.length === 0 ? (
        <p style={{ padding: '40px 0', textAlign: 'center', fontSize: 14, color: '#9ca3af' }}>
          연결된 도면에 <b>{type}</b> 분류 심볼이 없습니다.
        </p>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
          <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 110 }}>범례</th>
                <th style={{ ...thStyle, width: 88 }}>핸들</th>
                <th style={{ ...thStyle, width: 110 }}>주석</th>
                <th style={{ ...thStyle, width: 110 }}>작업</th>
                <th style={{ ...thStyle, width: 130 }}>위치 (X, Y)</th>
                <th style={{ ...thStyle, width: 120 }}>크기 (너비×높이)</th>
                <th style={{ ...thStyle }}>설명</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '0.8125rem' }}>
                    검색 결과가 없습니다.
                  </td>
                </tr>
              ) : filtered.map(sym => {
                const used    = usedHandles.has(sym.handle)
                const hovered = !used && hoveredHandle === sym.handle
                const rowStyle = {
                  cursor: used ? 'not-allowed' : 'pointer',
                  opacity: used ? 0.5 : 1,
                  background: used ? '#f8fafc' : hovered ? '#eff6ff' : '#fff',
                  borderBottom: '1px solid #f1f5f9',
                  transition: 'background 0.12s',
                }
                const tdStyle = { padding: '7px 10px', verticalAlign: 'middle' }
                return (
                  <tr
                    key={sym.handle}
                    style={rowStyle}
                    onMouseEnter={() => !used && setHoveredHandle(sym.handle)}
                    onMouseLeave={() => setHoveredHandle(null)}
                    onClick={() => !used && onSelect(sym)}
                  >
                    <td style={{ ...tdStyle, fontWeight: sym.legend ? 500 : 400, color: sym.legend ? '#1e293b' : '#94a3b8' }}>
                      {sym.legend ?? <span style={{ color: '#cbd5e1' }}>-</span>}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.75rem', color: '#475569' }}>
                      {sym.handle}
                    </td>
                    <td style={{ ...tdStyle, color: '#475569' }}>
                      {sym.annotation ?? <span style={{ color: '#cbd5e1' }}>-</span>}
                    </td>
                    <td style={{ ...tdStyle, color: '#475569' }}>
                      {sym.work_name ?? <span style={{ color: '#cbd5e1' }}>-</span>}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.75rem', color: '#475569', whiteSpace: 'nowrap' }}>
                      {fmtPos(sym)}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.75rem', color: '#475569', whiteSpace: 'nowrap' }}>
                      {fmtSize(sym)}
                    </td>
                    <td style={{ ...tdStyle, color: '#64748b', maxWidth: 220, wordBreak: 'break-word' }}>
                      {used
                        ? <span style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#94a3b8', borderRadius: 4, padding: '1px 7px' }}>추가됨</span>
                        : (sym.description ?? <span style={{ color: '#cbd5e1' }}>-</span>)
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 하단 */}
      <div className="flex items-center justify-between gap-2">
        {!loading && (
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {filtered.length} / {allOfType.length}개
          </span>
        )}
        <button type="button" onClick={onCancel} className="btn-outline">취소</button>
      </div>
    </LayerPopup>
  )
}

// ── 컴포넌트 이름 수정 모달 ──────────────────────────────────────────
function NameEditModal({ comp, onSave, onCancel }) {
  const [name, setName] = useState(comp.name)
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-5 shadow-xl" style={{ width: 340 }}>
        <h3 className="font-semibold text-gray-800 mb-3">이름 수정</h3>
        <input
          className="border rounded px-3 py-1.5 text-sm w-full"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSave(name); if (e.key === 'Escape') onCancel() }}
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <button className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50" onClick={onCancel}>취소</button>
          <button
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
            disabled={!name.trim()}
            onClick={() => onSave(name)}
          >저장</button>
        </div>
      </div>
    </div>
  )
}

const COMP_PAGE_SIZE = 15
const SIM_TYPES = ['SOURCE', 'DRAIN', 'STATION', 'BUFFER', 'CONVEYOR']

// ── 컴포넌트 기본 설정값 ──────────────────────────────────────────────
const COMP_DEFAULTS = {
  SOURCE:   { processingTime: 1000, recoverTime: 0, maxValue: -1 },
  DRAIN:    { processingTime: 0 },
  STATION:  { processingTime: 1000, recoverTime: 0 },
  BUFFER:   { processingTime: 0, recoverTime: 0, storageCapacity: 10, outputMethod: 'FIFO' },
  CONVEYOR: { recoverTime: 0, conveyorLength: 1.0, conveyorSpeed: 1.0 },
}

// ── 시뮬레이션 상세 화면 ──────────────────────────────────────────────
function SimulationDetailView({ project, onBack }) {
  const [currentSimId, setCurrentSimId] = useState(null)
  const [components, setComponents] = useState([])
  const [symbolPicker, setSymbolPicker] = useState({ open: false, type: null, symbols: [], loading: false })
  const [symbolDataMap, setSymbolDataMap] = useState(new Map())
  const [selectedCompIds, setSelectedCompIds] = useState(new Set())
  const [activeTypeTab, setActiveTypeTab] = useState(null)
  const [compPage, setCompPage] = useState(0)
  const [editingComp, setEditingComp] = useState(null)

  // ── 시뮬레이션 제어 상태 ─────────────────────────────────────────
  const [status, setStatus] = useState(null)
  const [autoStopSec, setAutoStopSec] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  const statusTimer = useRef(null)

  const loadComponents = (simId) =>
    api(`/api/simulation/${simId}/components`)
      .then(data => setComponents(Array.isArray(data) ? data : []))
      .catch(() => {})

  // ── 진입 시 simId 로드 (plan_id 유무와 무관하게 항상 simId 보장) ──
  useEffect(() => {
    api(`/api/simulation/by-project/${project.id}`)
      .then(data => {
        const sid = data?.simId ?? null
        setCurrentSimId(sid)
        if (sid) loadComponents(sid)
      })
      .catch(() => {})
  }, [project.id])

  // ── 상태 폴링 ────────────────────────────────────────────────────
  useEffect(() => {
    const poll = () => api('/api/simulation/control/status').then(setStatus).catch(() => {})
    poll()
    statusTimer.current = setInterval(poll, 500)
    return () => clearInterval(statusTimer.current)
  }, [])

  // ── 자동종료 시간 동기화 ──────────────────────────────────────────
  useEffect(() => {
    if (!status) return
    const sec = status.autoStopTime === 0 ? '' : String(Math.floor(status.autoStopTime / 1000))
    setAutoStopSec(prev => (prev !== sec ? sec : prev))
  }, [status?.autoStopTime])

  // ── 도면 심볼 정보 로드 (plan_id 변경 시) ────────────────────────
  useEffect(() => {
    if (!project.plan_id) return
    api(`/api/plan/${project.plan_id}/symbols/components`)
      .then(data => {
        const m = new Map()
        ;(data?.components ?? []).forEach(s => m.set(s.handle, s))
        setSymbolDataMap(m)
      })
      .catch(() => {})
  }, [project.plan_id])

  // ── 필터·수 변경 시 페이지 범위 보정 ────────────────────────────
  useEffect(() => {
    const filtered = activeTypeTab ? components.filter(c => c.type === activeTypeTab) : components
    const total = Math.max(1, Math.ceil(filtered.length / COMP_PAGE_SIZE))
    if (compPage >= total) setCompPage(0)
  }, [components.length, activeTypeTab])

  // ── 심볼 핸들 → 이미 사용 중인 목록 ──────────────────────────────
  const usedHandles = new Set(components.map(c => c.symbol_handle).filter(Boolean))

  // ── 컴포넌트 추가 (심볼 선택 모달 열기) ──────────────────────────
  const handleAddComponent = async (type) => {
    if (!currentSimId || !project.plan_id) return
    setSymbolPicker({ open: true, type, symbols: [], loading: true })
    try {
      const data = await api(`/api/plan/${project.plan_id}/symbols/components`)
      const symbols = data?.components ?? []
      // symbolDataMap 최신 데이터로 갱신 (위치·크기 포함)
      setSymbolDataMap(m => {
        const next = new Map(m)
        symbols.forEach(s => next.set(s.handle, s))
        return next
      })
      setSymbolPicker({ open: true, type, symbols, loading: false })
    } catch {
      setSymbolPicker({ open: false, type: null, symbols: [], loading: false })
    }
  }

  // ── 심볼 선택 확정 ───────────────────────────────────────────────
  const handleSelectSymbol = async (symbol) => {
    if (!currentSimId) return
    const name = `${symbol.category}_${symbol.handle}`
    // 선택한 심볼 데이터 즉시 반영
    setSymbolDataMap(m => { const n = new Map(m); n.set(symbol.handle, symbol); return n })
    await api(`/api/simulation/${currentSimId}/components`, {
      method: 'POST',
      body: { name, type: symbol.category, symbolHandle: symbol.handle, ...COMP_DEFAULTS[symbol.category] },
    })
    setSymbolPicker({ open: false, type: null, symbols: [], loading: false })
    loadComponents(currentSimId)
  }

  // ── 컴포넌트 행 선택 토글 ────────────────────────────────────────
  const toggleCompSelect = (id) => {
    setSelectedCompIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id);
      return next
    })
  }

  // ── 선택 컴포넌트 이름 수정 ──────────────────────────────────────
  const handleEditName = async (compId, newName) => {
    if (!newName.trim()) return
    await api(`/api/simulation/${currentSimId}/components/${compId}`, {
      method: 'PUT',
      body: { name: newName.trim() },
    })
    setEditingComp(null)
    loadComponents(currentSimId)
  }

  // ── 선택 컴포넌트 삭제 ───────────────────────────────────────────
  const handleDeleteSelected = async () => {
    if (selectedCompIds.size === 0) return
    if (!confirm(`선택한 ${selectedCompIds.size}개 컴포넌트를 삭제하시겠습니까?`)) return
    await Promise.all([...selectedCompIds].map(id =>
      api(`/api/simulation/${currentSimId}/components/${id}`, { method: 'DELETE' })
    ))
    setSelectedCompIds(new Set())
    loadComponents(currentSimId)
  }

  // ── 시뮬레이션 제어 ──────────────────────────────────────────────
  const handleStart = async () => {
    if (!currentSimId) return alert('연결된 도면이 없습니다.')
    setLoading(true)
    try {
      await api('/api/simulation/control/start', { method: 'POST', body: { simId: currentSimId } })
    } finally { setLoading(false) }
  }

  const handlePause  = () => api('/api/simulation/control/pause',  { method: 'POST', body: {} })
  const handleResume = () => api('/api/simulation/control/resume', { method: 'POST', body: {} })
  const handleStop   = () => api('/api/simulation/control/stop',   { method: 'POST', body: {} })

  const handleSetSpeed = (mult) =>
    api('/api/simulation/control/speed', { method: 'POST', body: { multiplier: mult } })

  const handleAutoStopChange = async (val) => {
    setAutoStopSec(val)
    const sec = val === '' ? 0 : parseInt(val, 10)
    if (!isNaN(sec) && sec >= 0)
      await api('/api/simulation/control/auto-stop', { method: 'POST', body: { seconds: sec } })
  }

  const handleGenerateReport = async () => {
    if (!status?.sessionId) return alert('먼저 시뮬레이션을 실행해주세요.')
    const r = await api('/api/simulation/control/report', {
      method: 'POST', body: { sessionId: status.sessionId },
    })
    setReport(r)
  }

  const isRunning = status?.isRunning
  const isPaused  = status?.isPaused

  const handleTabClick = (type) => {
    setActiveTypeTab(prev => prev === type ? null : type)
    setCompPage(0)
    setSelectedCompIds(new Set())
  }

  const filteredComps  = activeTypeTab ? components.filter(c => c.type === activeTypeTab) : components
  const compTotalPages = Math.max(1, Math.ceil(filteredComps.length / COMP_PAGE_SIZE))
  const pagedComps     = filteredComps.slice(compPage * COMP_PAGE_SIZE, (compPage + 1) * COMP_PAGE_SIZE)

  const compThStyle = {
    background: '#f8fafc', borderBottom: '2px solid #e2e8f0',
    padding: '7px 10px', fontSize: '0.75rem', fontWeight: 600,
    color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap',
  }
  const compTdStyle = {
    padding: '7px 10px', verticalAlign: 'middle',
    borderBottom: '1px solid #f1f5f9', fontSize: '0.8125rem',
  }
  const fmtPos  = s => (s?.center_x != null && s?.center_y != null)
    ? `(${Number(s.center_x).toFixed(1)}, ${Number(s.center_y).toFixed(1)})` : null
  const fmtSize = s => (s?.width != null && s?.height != null)
    ? `${Number(s.width).toFixed(1)} × ${Number(s.height).toFixed(1)}` : null

  return (
    <div className="space-y-6">
      {/* ── 헤더 ── */}
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="mt-0.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border rounded hover:bg-gray-50 whitespace-nowrap"
        >← 목록</button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{project.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {project.plan_name ? `연결 도면: ${project.plan_name}` : '연결 도면 없음'}
            {project.description ? ` · ${project.description}` : ''}
          </p>
        </div>
      </div>

      {!project.plan_id && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">
          연결된 도면이 없습니다. 프로젝트 수정에서 도면을 연결해 주세요.
        </div>
      )}

      {/* ── 컴포넌트 설정 ── */}
      <section className="bg-white border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold text-gray-700">컴포넌트 설정</h2>

        {/* 추가 버튼 */}
        <div className="flex flex-wrap gap-2">
          {['SOURCE', 'DRAIN', 'STATION', 'BUFFER', 'CONVEYOR'].map(type => (
            <button
              key={type}
              onClick={() => handleAddComponent(type)}
              disabled={!currentSimId || !project.plan_id || isRunning}
              className={`px-3 py-1.5 text-xs font-medium rounded border disabled:opacity-40 ${TYPE_COLOR[type]}`}
              style={{ borderColor: 'transparent' }}
            >+ {type}</button>
          ))}
        </div>

        {/* 컴포넌트 목록 */}
        {components.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">추가된 컴포넌트가 없습니다.</p>
        ) : (
          <>
            {/* 테이블 + Excel 탭 묶음 */}
            <div style={{ borderRadius: 6, border: '1px solid #d1d5db', overflow: 'hidden' }}>
              {/* 테이블 */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={compThStyle}>이름</th>
                      <th style={compThStyle}>핸들</th>
                      <th style={compThStyle}>주석</th>
                      <th style={compThStyle}>작업</th>
                      <th style={compThStyle}>위치 (X, Y)</th>
                      <th style={compThStyle}>크기 (너비×높이)</th>
                      <th style={{ ...compThStyle, whiteSpace: 'normal' }}>설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedComps.map(c => {
                      const sym = symbolDataMap.get(c.symbol_handle)
                      const sel = selectedCompIds.has(c.id)
                      return (
                        <tr
                          key={c.id}
                          onClick={() => toggleCompSelect(c.id)}
                          style={{ cursor: 'pointer', background: sel ? '#eff6ff' : undefined }}
                          onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#f8fafc' }}
                          onMouseLeave={e => { if (!sel) e.currentTarget.style.background = sel ? '#eff6ff' : '' }}
                        >
                          {/* 이름 */}
                          <td style={{ ...compTdStyle, fontWeight: 500, color: '#1e293b' }}>{c.name}</td>
                          {/* 핸들 */}
                          <td style={{ ...compTdStyle, fontFamily: 'monospace', fontSize: '0.75rem', color: '#475569' }}>
                            {c.symbol_handle ?? <span style={{ color: '#cbd5e1' }}>-</span>}
                          </td>
                          {/* 주석 */}
                          <td style={{ ...compTdStyle, color: '#475569' }}>
                            {sym?.annotation ?? <span style={{ color: '#cbd5e1' }}>-</span>}
                          </td>
                          {/* 작업 */}
                          <td style={{ ...compTdStyle, color: '#475569' }}>
                            {sym?.work_name ?? <span style={{ color: '#cbd5e1' }}>-</span>}
                          </td>
                          {/* 위치 */}
                          <td style={{ ...compTdStyle, fontFamily: 'monospace', fontSize: '0.75rem', color: '#475569', whiteSpace: 'nowrap' }}>
                            {fmtPos(sym) ?? <span style={{ color: '#cbd5e1' }}>-</span>}
                          </td>
                          {/* 크기 */}
                          <td style={{ ...compTdStyle, fontFamily: 'monospace', fontSize: '0.75rem', color: '#475569', whiteSpace: 'nowrap' }}>
                            {fmtSize(sym) ?? <span style={{ color: '#cbd5e1' }}>-</span>}
                          </td>
                          {/* 설명 */}
                          <td style={{ ...compTdStyle, color: '#64748b', maxWidth: 180, wordBreak: 'break-word' }}>
                            {sym?.description ?? <span style={{ color: '#cbd5e1' }}>-</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Excel 스타일 시트 탭 */}
              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: 2,
                background: '#dce0e5', borderTop: '1px solid #b0b8c1',
                padding: '5px 6px 0', overflowX: 'auto',
              }}>
                {SIM_TYPES.map(type => {
                  const count = components.filter(c => c.type === type).length
                  if (count === 0) return null
                  const active = activeTypeTab === type
                  return (
                    <button
                      key={type}
                      onClick={() => handleTabClick(type)}
                      style={{
                        flexShrink: 0,
                        padding: '4px 13px 5px',
                        fontSize: '0.75rem',
                        fontWeight: active ? 700 : 400,
                        background: active ? '#fff' : '#c8cdd3',
                        border: `1px solid ${active ? '#a0aab4' : '#b0b8c1'}`,
                        borderBottom: active ? '2px solid #fff' : '1px solid #b0b8c1',
                        borderRadius: '3px 3px 0 0',
                        cursor: 'pointer',
                        color: active ? '#1d4ed8' : '#4b5563',
                        boxShadow: active ? 'inset 0 2px 0 #2563eb' : 'none',
                        marginBottom: 0,
                        transition: 'background 0.1s',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#d8dde2' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = '#c8cdd3' }}
                    >
                      {type}
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 600,
                        background: active ? '#dbeafe' : '#b0b8c1',
                        color: active ? '#1d4ed8' : '#fff',
                        borderRadius: 10, padding: '0 5px', lineHeight: '1.4',
                      }}>{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 페이지네이션 + 수정/삭제 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {compTotalPages > 1 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => setCompPage(p => Math.max(0, p - 1))}
                    disabled={compPage === 0}
                    style={{
                      padding: '2px 9px', border: '1px solid #e2e8f0', borderRadius: 4,
                      cursor: compPage === 0 ? 'not-allowed' : 'pointer',
                      opacity: compPage === 0 ? 0.35 : 1, fontSize: '0.8125rem',
                    }}
                  >&lt;</button>
                  <span style={{ fontSize: '0.8125rem', color: '#64748b', minWidth: 52, textAlign: 'center' }}>
                    {compPage + 1} / {compTotalPages}
                  </span>
                  <button
                    onClick={() => setCompPage(p => Math.min(compTotalPages - 1, p + 1))}
                    disabled={compPage === compTotalPages - 1}
                    style={{
                      padding: '2px 9px', border: '1px solid #e2e8f0', borderRadius: 4,
                      cursor: compPage === compTotalPages - 1 ? 'not-allowed' : 'pointer',
                      opacity: compPage === compTotalPages - 1 ? 0.35 : 1, fontSize: '0.8125rem',
                    }}
                  >&gt;</button>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 2 }}>
                    {activeTypeTab ? `${filteredComps.length} / 전체 ${components.length}개` : `총 ${components.length}개`}
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {activeTypeTab ? `${filteredComps.length} / 전체 ${components.length}개` : `총 ${components.length}개`}
                </span>
              )}

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn-table-edit"
                  disabled={selectedCompIds.size !== 1 || isRunning}
                  style={{ opacity: (selectedCompIds.size !== 1 || isRunning) ? 0.35 : 1 }}
                  onClick={() => {
                    const [id] = [...selectedCompIds]
                    const comp = components.find(c => c.id === id)
                    if (comp) setEditingComp({ id: comp.id, name: comp.name })
                  }}
                >수정</button>
                <button
                  className="btn-table-delete"
                  disabled={selectedCompIds.size === 0 || isRunning}
                  style={{ opacity: (selectedCompIds.size === 0 || isRunning) ? 0.35 : 1 }}
                  onClick={handleDeleteSelected}
                >삭제{selectedCompIds.size > 1 ? ` (${selectedCompIds.size})` : ''}</button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── 시뮬레이션 제어 ── */}
      <section className="bg-white border rounded-lg p-4 space-y-4">
        <h2 className="font-semibold text-gray-700">시뮬레이션 제어</h2>

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">자동 종료 시간 (초, 0=무제한)</label>
          <input
            type="number" min="0"
            value={autoStopSec}
            onChange={e => handleAutoStopChange(e.target.value)}
            disabled={isRunning}
            placeholder="0 = 무제한"
            className="border rounded px-2 py-1 text-sm w-28 disabled:bg-gray-50"
          />
        </div>

        {isRunning && (
          <div className="bg-gray-50 rounded p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">시뮬레이션 진행 시간</p>
            <p className="text-3xl font-mono font-bold text-gray-800">{formatTime(status.currentTime)}</p>
            {status.autoStopTime > 0 && (
              <>
                <div className="mt-2 h-2 bg-gray-200 rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${Math.min(100, (status.currentTime / status.autoStopTime) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">목표: {formatTime(status.autoStopTime)}</p>
              </>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button onClick={handleStart} disabled={loading || isRunning || !currentSimId}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-40">▶ 시작</button>
          <button onClick={handlePause} disabled={!isRunning || isPaused}
            className="px-4 py-2 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded disabled:opacity-40">⏸ 일시정지</button>
          <button onClick={handleResume} disabled={!isRunning || !isPaused}
            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-40">▶▶ 재개</button>
          <button onClick={handleStop} disabled={!isRunning}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-40">■ 종료</button>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-2">배속 조절</p>
          <div className="flex flex-wrap gap-1">
            {[1, 2, 3, 5, 10].map(n => (
              <button key={n} onClick={() => handleSetSpeed(n)} disabled={!isRunning}
                className={`px-3 py-1 text-xs rounded border disabled:opacity-40 ${status?.speedMultiplier === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'}`}>
                {n}x
              </button>
            ))}
          </div>
        </div>

        {status && (
          <div className="text-xs text-gray-500 flex gap-4">
            <span>상태: <b className={isRunning ? 'text-green-600' : 'text-gray-500'}>{isRunning ? (isPaused ? '일시정지' : '실행 중') : '대기'}</b></span>
            <span>속도: {status.speedMultiplier}x</span>
            {status.sessionId && <span>세션: #{status.sessionId}</span>}
          </div>
        )}
      </section>

      {/* ── 심볼 선택 모달 ── */}
      {symbolPicker.open && (
        <SymbolPickerModal
          type={symbolPicker.type}
          symbols={symbolPicker.symbols}
          usedHandles={usedHandles}
          loading={symbolPicker.loading}
          onSelect={handleSelectSymbol}
          onCancel={() => setSymbolPicker({ open: false, type: null, symbols: [], loading: false })}
        />
      )}

      {/* ── 이름 수정 모달 ── */}
      {editingComp && (
        <NameEditModal
          comp={editingComp}
          onSave={(name) => handleEditName(editingComp.id, name)}
          onCancel={() => setEditingComp(null)}
        />
      )}

      {/* ── 리포트 ── */}
      <section className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">리포트</h2>
          <button onClick={handleGenerateReport} disabled={!status?.sessionId}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded disabled:opacity-40">
            리포트 생성
          </button>
        </div>

        {report && (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              <span>총 시뮬레이션 시간: <b>{formatTime(report.totalSimulationTimeMs)}</b></span>
              {report.startTime && (
                <span className="ml-4">시작: {new Date(report.startTime).toLocaleString()}</span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border px-3 py-2 text-left">컴포넌트</th>
                    <th className="border px-3 py-2 text-right">처리 수</th>
                    <th className="border px-3 py-2 text-right">처리 시간</th>
                    <th className="border px-3 py-2 text-right">복구 시간</th>
                    <th className="border px-3 py-2 text-right">유휴 시간</th>
                    <th className="border px-3 py-2 text-right">차단 시간</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(report.componentStats ?? {}).map(([id, s]) => (
                    <tr key={id} className="hover:bg-gray-50">
                      <td className="border px-3 py-2 font-mono text-xs">{id}</td>
                      <td className="border px-3 py-2 text-right">{s.totalProcessedCount}</td>
                      <td className="border px-3 py-2 text-right">{formatTime(s.processingTimeMs)}</td>
                      <td className="border px-3 py-2 text-right">{formatTime(s.recoveryTimeMs)}</td>
                      <td className="border px-3 py-2 text-right">{formatTime(s.idleTimeMs)}</td>
                      <td className="border px-3 py-2 text-right">{formatTime(s.blockTimeMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────
export default function SimulationsPage() {
  const [selectedSimProject, setSelectedSimProject] = useState(null)

  if (selectedSimProject) {
    return (
      <SimulationDetailView
        project={selectedSimProject}
        onBack={() => setSelectedSimProject(null)}
      />
    )
  }

  return <ProjectListView onEnter={setSelectedSimProject} />
}
