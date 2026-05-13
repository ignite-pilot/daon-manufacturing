import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '../lib/api'

// ── 도면 드롭다운 ──────────────────────────────────────────────────────
function PlanDropdown({ plans, selectedPlan, onSelect }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function fmtDate(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block', minWidth: 260 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '6px 10px', border: '1px solid #d1d5db',
          borderRadius: 6, background: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, textAlign: 'left',
        }}
      >
        {selectedPlan ? (
          <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>{selectedPlan.name}</span>
            <span style={{ fontSize: 11, color: '#6b7280' }}>v{selectedPlan.version} · {fmtDate(selectedPlan.updated_at)}</span>
          </span>
        ) : (
          <span style={{ fontSize: 13, color: '#9ca3af' }}>도면을 선택하세요</span>
        )}
        <span style={{ fontSize: 10, color: '#9ca3af', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 100,
          minWidth: '100%', background: '#fff', border: '1px solid #d1d5db',
          borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          marginTop: 2, maxHeight: 280, overflowY: 'auto',
        }}>
          {plans.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 13, color: '#9ca3af' }}>도면 없음</div>
          )}
          {plans.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onSelect(p); setOpen(false) }}
              style={{
                display: 'block', width: '100%', padding: '8px 12px',
                background: selectedPlan?.id === p.id ? '#eff6ff' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                borderBottom: '1px solid #f3f4f6',
              }}
              onMouseEnter={e => { if (selectedPlan?.id !== p.id) e.currentTarget.style.background = '#f9fafb' }}
              onMouseLeave={e => { e.currentTarget.style.background = selectedPlan?.id === p.id ? '#eff6ff' : 'transparent' }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                v{p.version} · {fmtDate(p.updated_at)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const COMPONENT_TYPES = ['SOURCE', 'DRAIN', 'STORAGE', 'CONVEYOR', 'STATION']

const TYPE_LABEL = {
  SOURCE: '소스 (Source)',
  DRAIN: '드레인 (Drain)',
  STORAGE: '저장소 (Storage)',
  CONVEYOR: '컨베이어 (Conveyor)',
  STATION: '스테이션 (Station)',
}

const TYPE_COLOR = {
  SOURCE:   'bg-blue-100 text-blue-800',
  DRAIN:    'bg-red-100 text-red-800',
  STORAGE:  'bg-yellow-100 text-yellow-800',
  CONVEYOR: 'bg-green-100 text-green-800',
  STATION:  'bg-purple-100 text-purple-800',
}

function formatTime(ms) {
  if (!ms) return '0:00.00'
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  const cs = Math.floor((ms % 1000) / 10)
  return `${min}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

// ── 기본 컴포넌트 폼 초기값 ───────────────────────────────────────────
function defaultConfig(type) {
  switch (type) {
    case 'SOURCE':   return { processingTime: 1000, recoverTime: 0, maxValue: -1 }
    case 'DRAIN':    return { processingTime: 0 }
    case 'STORAGE':  return { processingTime: 0, recoverTime: 0, storageCapacity: 10, outputMethod: 'FIFO' }
    case 'CONVEYOR': return { recoverTime: 0, conveyorLength: 1.0, conveyorSpeed: 1.0 }
    case 'STATION':  return { processingTime: 1000, recoverTime: 0 }
    default:         return {}
  }
}

// ── 컴포넌트 폼 필드 ──────────────────────────────────────────────────
function ComponentFields({ type, values, onChange }) {
  const field = (label, key, props = {}) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600">{label}</span>
      <input
        className="border rounded px-2 py-1 text-sm"
        value={values[key] ?? ''}
        onChange={e => onChange(key, e.target.value)}
        {...props}
      />
    </label>
  )

  return (
    <div className="grid grid-cols-2 gap-3">
      {(type === 'SOURCE' || type === 'STATION' || type === 'STORAGE') && (
        field('처리 시간 (ms)', 'processingTime', { type: 'number', min: 0 })
      )}
      {type === 'DRAIN' && (
        field('처리 시간 (ms)', 'processingTime', { type: 'number', min: 0 })
      )}
      {type !== 'DRAIN' && type !== 'CONVEYOR' && (
        field('복구 시간 (ms)', 'recoverTime', { type: 'number', min: 0 })
      )}
      {type === 'CONVEYOR' && (<>
        {field('복구 시간 (ms)', 'recoverTime', { type: 'number', min: 0 })}
        {field('길이 (m)', 'conveyorLength', { type: 'number', min: 0.1, step: 0.1 })}
        {field('속도 (m/s)', 'conveyorSpeed', { type: 'number', min: 0.1, step: 0.1 })}
        <p className="col-span-2 text-xs text-gray-500">
          처리 시간 = 길이/속도 × 1000 ms
        </p>
      </>)}
      {type === 'SOURCE' && (
        field('최대 생성 수 (-1=무제한)', 'maxValue', { type: 'number', min: -1 })
      )}
      {type === 'STORAGE' && (<>
        {field('최대 용량', 'storageCapacity', { type: 'number', min: 1 })}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">출력 방식</span>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={values.outputMethod ?? 'FIFO'}
            onChange={e => onChange('outputMethod', e.target.value)}
          >
            <option value="FIFO">FIFO</option>
            <option value="QUEUE">QUEUE</option>
          </select>
        </label>
      </>)}
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────
export default function SimulationsPage() {
  // ── 도면/프레임 상태 ──────────────────────────────────────────────
  const [plans, setPlans] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)  // 도면에 연결된 SimProject
  const [frames, setFrames] = useState([])
  const [selectedFrame, setSelectedFrame] = useState(null)
  const [currentSimId, setCurrentSimId] = useState(null)

  // ── 컴포넌트/플로우 상태 ─────────────────────────────────────────
  const [components, setComponents] = useState([])
  const [flows, setFlows] = useState([])

  // ── 모달 상태 ────────────────────────────────────────────────────
  const [addModal, setAddModal] = useState(null)     // { type }
  const [editModal, setEditModal] = useState(null)   // component
  const [flowModal, setFlowModal] = useState(false)
  const [addFlowValues, setAddFlowValues] = useState({ fromId: '', toId: '', ratio: 1.0 })

  // ── 시뮬레이션 제어 상태 ─────────────────────────────────────────
  const [status, setStatus] = useState(null)
  const [autoStopSec, setAutoStopSec] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  const statusTimer = useRef(null)

  // ── 도면 목록 로드 ───────────────────────────────────────────────
  useEffect(() => {
    api('/api/plan?pageSize=100')
      .then(data => setPlans(Array.isArray(data?.items) ? data.items : []))
      .catch(() => {})
  }, [])

  // ── 도면 선택 시 SimProject + 프레임 로드 ─────────────────────────
  useEffect(() => {
    if (!selectedPlan) { setSelectedProject(null); setFrames([]); setSelectedFrame(null); return }
    api(`/api/simulation/by-plan/${selectedPlan.id}`)
      .then(data => {
        setSelectedProject(data?.project ?? null)
        setFrames(Array.isArray(data?.frames) ? data.frames : [])
      })
      .catch(() => {})
  }, [selectedPlan])

  // ── simId 설정 ───────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedFrame) { setCurrentSimId(null); return }
    setCurrentSimId(selectedFrame.simulation_id ?? null)
  }, [selectedFrame])

  // ── 컴포넌트/플로우 로드 ─────────────────────────────────────────
  const loadComponents = useCallback(() => {
    if (!currentSimId) return
    api(`/api/simulation/${currentSimId}/components`).then(setComponents).catch(() => {})
  }, [currentSimId])

  useEffect(() => {
    loadComponents()
    setFlows([])
  }, [loadComponents])

  // ── 상태 폴링 ────────────────────────────────────────────────────
  useEffect(() => {
    const poll = () => {
      api('/api/simulation/control/status').then(setStatus).catch(() => {})
    }
    poll()
    statusTimer.current = setInterval(poll, 500)
    return () => clearInterval(statusTimer.current)
  }, [])

  // ── 자동종료 시간 상태 동기화 ─────────────────────────────────────
  useEffect(() => {
    if (!status) return
    const sec = status.autoStopTime === 0 ? '' : String(Math.floor(status.autoStopTime / 1000))
    setAutoStopSec(prev => (prev !== sec ? sec : prev))
  }, [status?.autoStopTime])

  // ── 프레임 생성 ──────────────────────────────────────────────────
  const handleCreateFrame = async () => {
    if (!selectedProject) return
    const name = prompt('프레임 이름:')
    if (!name) return
    const f = await api(`/api/simulation/projects/${selectedProject.id}/frames`, {
      method: 'POST', body: { name },
    })
    setFrames(prev => [...prev, f])
    setSelectedFrame(f)
  }

  // ── 컴포넌트 추가 ────────────────────────────────────────────────
  const handleAddComponent = async (type, config) => {
    if (!currentSimId) return
    const name = `${TYPE_LABEL[type].split(' ')[0]} ${components.filter(c => c.type === type).length + 1}`
    await api(`/api/simulation/${currentSimId}/components`, {
      method: 'POST',
      body: { name, type, ...config },
    })
    loadComponents()
    setAddModal(null)
  }

  // ── 컴포넌트 수정 ────────────────────────────────────────────────
  const handleUpdateComponent = async (comp, config) => {
    await api(`/api/simulation/${currentSimId}/components/${comp.id}`, {
      method: 'PUT', body: config,
    })
    loadComponents()
    setEditModal(null)
  }

  // ── 컴포넌트 삭제 ────────────────────────────────────────────────
  const handleDeleteComponent = async (compId) => {
    if (!confirm('컴포넌트를 삭제하시겠습니까?')) return
    await api(`/api/simulation/${currentSimId}/components/${compId}`, { method: 'DELETE' })
    loadComponents()
  }

  // ── 플로우 추가 ──────────────────────────────────────────────────
  const handleAddFlow = async () => {
    const { fromId, toId, ratio } = addFlowValues
    if (!fromId || !toId) return
    // 로컬 상태에만 저장 (batch 적용 시 DB에 반영)
    setFlows(prev => [...prev, { fromComponentId: fromId, toComponentId: toId, ratio: Number(ratio) }])
    setFlowModal(false)
    setAddFlowValues({ fromId: '', toId: '', ratio: 1.0 })
  }

  // ── 배치 적용 (컴포넌트 + 플로우 일괄 저장) ─────────────────────
  const handleApplyBatch = async () => {
    if (!currentSimId) return
    setLoading(true)
    try {
      const result = await api(`/api/simulation/${currentSimId}/components/batch`, {
        method: 'POST',
        body: {
          components: components.map(c => ({
            id: c.id, name: c.name, type: c.type,
            processingTime: c.processing_time, recoverTime: c.recover_time,
            maxValue: c.max_value, storageCapacity: c.storage_capacity,
            outputMethod: c.output_method,
            conveyorLength: c.conveyor_length, conveyorSpeed: c.conveyor_speed,
          })),
          flows,
        },
      })
      setComponents(result.components)
      setFlows([])
      alert('설정이 저장되었습니다.')
    } finally {
      setLoading(false)
    }
  }

  // ── 시뮬레이션 제어 ──────────────────────────────────────────────
  const handleStart = async () => {
    if (!currentSimId) return alert('도면과 프레임을 선택해주세요.')
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
    if (!isNaN(sec) && sec >= 0) {
      await api('/api/simulation/control/auto-stop', { method: 'POST', body: { seconds: sec } })
    }
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

  // ── 렌더 ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-800">시뮬레이션 관리</h1>

      {/* ── 도면 / 프레임 선택 ── */}
      <section className="bg-white border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold text-gray-700">도면 / 프레임 선택</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">도면</label>
            <PlanDropdown
              plans={plans}
              selectedPlan={selectedPlan}
              onSelect={p => { setSelectedPlan(p); setSelectedFrame(null) }}
            />
          </div>

          {selectedProject && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">프레임</label>
              <div className="flex gap-2">
                <select
                  className="border rounded px-2 py-1 text-sm min-w-[160px]"
                  value={selectedFrame?.id ?? ''}
                  onChange={e => {
                    const f = frames.find(x => x.id === Number(e.target.value))
                    setSelectedFrame(f ?? null)
                  }}
                >
                  <option value="">선택하세요</option>
                  {frames.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <button
                  onClick={handleCreateFrame}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
                >+ 새 프레임</button>
              </div>
            </div>
          )}
        </div>
        {currentSimId && (
          <p className="text-xs text-gray-400">Simulation ID: {currentSimId}</p>
        )}
      </section>

      {/* ── 컴포넌트 설정 ── */}
      <section className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">컴포넌트 설정</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFlowModal(true)}
              disabled={!currentSimId || components.length < 2}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border disabled:opacity-40"
            >연결 추가</button>
            <button
              onClick={handleApplyBatch}
              disabled={!currentSimId || loading}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-40"
            >설정 저장</button>
          </div>
        </div>

        {/* 컴포넌트 추가 버튼 */}
        <div className="flex flex-wrap gap-2">
          {COMPONENT_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setAddModal({ type })}
              disabled={!currentSimId || isRunning}
              className={`px-3 py-1 text-xs rounded border disabled:opacity-40 ${TYPE_COLOR[type]}`}
            >+ {type}</button>
          ))}
        </div>

        {/* 컴포넌트 목록 */}
        {components.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">컴포넌트가 없습니다. 위 버튼으로 추가하세요.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {components.map(c => (
              <div key={c.id} className="border rounded p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLOR[c.type]}`}>{c.type}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditModal(c)}
                      disabled={isRunning}
                      className="text-xs text-blue-600 hover:underline disabled:opacity-40"
                    >수정</button>
                    <button
                      onClick={() => handleDeleteComponent(c.id)}
                      disabled={isRunning}
                      className="text-xs text-red-500 hover:underline disabled:opacity-40"
                    >삭제</button>
                  </div>
                </div>
                <p className="font-medium text-sm text-gray-800">{c.name}</p>
                <p className="text-xs text-gray-500">처리: {c.processing_time}ms | 복구: {c.recover_time}ms</p>
                {c.type === 'SOURCE'   && <p className="text-xs text-gray-500">최대: {c.max_value === -1 ? '무제한' : c.max_value}</p>}
                {c.type === 'STORAGE'  && <p className="text-xs text-gray-500">용량: {c.storage_capacity} / {c.output_method}</p>}
                {c.type === 'CONVEYOR' && <p className="text-xs text-gray-500">{c.conveyor_length}m @ {c.conveyor_speed}m/s</p>}
              </div>
            ))}
          </div>
        )}

        {/* 플로우 목록 */}
        {flows.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">연결 (미저장)</p>
            <div className="space-y-1">
              {flows.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-gray-50 px-2 py-1 rounded">
                  <span>{f.fromComponentId} → {f.toComponentId} (비율: {f.ratio})</span>
                  <button
                    onClick={() => setFlows(prev => prev.filter((_, j) => j !== i))}
                    className="text-red-500 hover:underline ml-2"
                  >삭제</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── 시뮬레이션 제어 ── */}
      <section className="bg-white border rounded-lg p-4 space-y-4">
        <h2 className="font-semibold text-gray-700">시뮬레이션 제어</h2>

        {/* 자동종료 */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">자동 종료 시간 (초, 0=무제한)</label>
          <input
            type="number"
            min="0"
            value={autoStopSec}
            onChange={e => handleAutoStopChange(e.target.value)}
            disabled={isRunning}
            placeholder="0 = 무제한"
            className="border rounded px-2 py-1 text-sm w-28 disabled:bg-gray-50"
          />
        </div>

        {/* 타이머 */}
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

        {/* 제어 버튼 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleStart}
            disabled={loading || isRunning || !currentSimId}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-40"
          >▶ 시작</button>
          <button
            onClick={handlePause}
            disabled={!isRunning || isPaused}
            className="px-4 py-2 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded disabled:opacity-40"
          >⏸ 일시정지</button>
          <button
            onClick={handleResume}
            disabled={!isRunning || !isPaused}
            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-40"
          >▶▶ 재개</button>
          <button
            onClick={handleStop}
            disabled={!isRunning}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-40"
          >■ 종료</button>
        </div>

        {/* 속도 조절 */}
        <div>
          <p className="text-xs text-gray-500 mb-2">배속 조절</p>
          <div className="flex flex-wrap gap-1">
            {[2, 3, 5, 10].map(n => (
              <button
                key={n}
                onClick={() => handleSetSpeed(n)}
                disabled={!isRunning}
                className={`px-3 py-1 text-xs rounded border disabled:opacity-40 ${status?.speedMultiplier === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'}`}
              >{n}x</button>
            ))}
            <button
              onClick={() => handleSetSpeed(1)}
              disabled={!isRunning}
              className={`px-3 py-1 text-xs rounded border disabled:opacity-40 ${status?.speedMultiplier === 1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'}`}
            >1x</button>
          </div>
        </div>

        {/* 상태 표시 */}
        {status && (
          <div className="text-xs text-gray-500 flex gap-4">
            <span>상태: <b className={isRunning ? 'text-green-600' : 'text-gray-500'}>{isRunning ? (isPaused ? '일시정지' : '실행 중') : '대기'}</b></span>
            <span>속도: {status.speedMultiplier}x</span>
            {status.sessionId && <span>세션: #{status.sessionId}</span>}
          </div>
        )}
      </section>

      {/* ── 리포트 ── */}
      <section className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">리포트</h2>
          <button
            onClick={handleGenerateReport}
            disabled={!status?.sessionId}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded disabled:opacity-40"
          >리포트 생성</button>
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

      {/* ── 컴포넌트 추가 모달 ── */}
      {addModal && (
        <ComponentModal
          title={`${TYPE_LABEL[addModal.type]} 추가`}
          type={addModal.type}
          initialValues={defaultConfig(addModal.type)}
          onConfirm={(config) => handleAddComponent(addModal.type, config)}
          onCancel={() => setAddModal(null)}
        />
      )}

      {/* ── 컴포넌트 수정 모달 ── */}
      {editModal && (
        <ComponentModal
          title={`${editModal.name} 수정`}
          type={editModal.type}
          initialValues={{
            processingTime: editModal.processing_time,
            recoverTime: editModal.recover_time,
            maxValue: editModal.max_value,
            storageCapacity: editModal.storage_capacity,
            outputMethod: editModal.output_method,
            conveyorLength: editModal.conveyor_length,
            conveyorSpeed: editModal.conveyor_speed,
          }}
          onConfirm={(config) => handleUpdateComponent(editModal, config)}
          onCancel={() => setEditModal(null)}
        />
      )}

      {/* ── 플로우 추가 모달 ── */}
      {flowModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-gray-800">컴포넌트 연결 추가</h3>
            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600">출발 컴포넌트</span>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={addFlowValues.fromId}
                  onChange={e => setAddFlowValues(v => ({ ...v, fromId: e.target.value }))}
                >
                  <option value="">선택</option>
                  {components.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600">도착 컴포넌트</span>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={addFlowValues.toId}
                  onChange={e => setAddFlowValues(v => ({ ...v, toId: e.target.value }))}
                >
                  <option value="">선택</option>
                  {components.filter(c => c.id !== addFlowValues.fromId).map(c =>
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  )}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600">비율 (0~1)</span>
                <input
                  type="number" min="0" max="1" step="0.1"
                  className="border rounded px-2 py-1 text-sm"
                  value={addFlowValues.ratio}
                  onChange={e => setAddFlowValues(v => ({ ...v, ratio: e.target.value }))}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setFlowModal(false)} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">취소</button>
              <button onClick={handleAddFlow} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 컴포넌트 추가/수정 모달 ───────────────────────────────────────────
function ComponentModal({ title, type, initialValues, onConfirm, onCancel }) {
  const [values, setValues] = useState(initialValues)

  const handleChange = (key, val) => setValues(prev => ({ ...prev, [key]: val }))

  const handleSubmit = (e) => {
    e.preventDefault()
    // 숫자 필드 변환
    const config = { ...values }
    ;['processingTime', 'recoverTime', 'maxValue', 'storageCapacity',
      'conveyorLength', 'conveyorSpeed'].forEach(k => {
      if (config[k] !== undefined && config[k] !== '') config[k] = Number(config[k])
    })
    onConfirm(config)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm space-y-4">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ComponentFields type={type} values={values} onChange={handleChange} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">취소</button>
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">확인</button>
          </div>
        </form>
      </div>
    </div>
  )
}
