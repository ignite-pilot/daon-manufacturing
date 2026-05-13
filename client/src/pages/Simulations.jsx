import { useEffect, useState, useRef } from 'react'
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

function formatTime(ms) {
  if (!ms) return '0:00.00'
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  const cs = Math.floor((ms % 1000) / 10)
  return `${min}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

function fmt2(n) {
  return n !== null && n !== undefined ? Number(n).toFixed(2) : null
}

// ── 메인 페이지 ───────────────────────────────────────────────────────
export default function SimulationsPage() {
  // ── 도면/프레임 상태 ──────────────────────────────────────────────
  const [plans, setPlans] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [frames, setFrames] = useState([])
  const [selectedFrame, setSelectedFrame] = useState(null)
  const [currentSimId, setCurrentSimId] = useState(null)

  // ── 공간 심볼 상태 ────────────────────────────────────────────────
  const [planSymbols, setPlanSymbols] = useState([])
  const [planSymbolsLoading, setPlanSymbolsLoading] = useState(false)

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

  // ── 도면 선택 시 SimProject + 프레임 + 공간 심볼 로드 ────────────
  useEffect(() => {
    if (!selectedPlan) {
      setSelectedProject(null)
      setFrames([])
      setSelectedFrame(null)
      setPlanSymbols([])
      return
    }
    api(`/api/simulation/by-plan/${selectedPlan.id}`)
      .then(data => {
        setSelectedProject(data?.project ?? null)
        setFrames(Array.isArray(data?.frames) ? data.frames : [])
      })
      .catch(() => {})

    setPlanSymbolsLoading(true)
    api(`/api/plan/${selectedPlan.id}/symbols/components`)
      .then(data => setPlanSymbols(Array.isArray(data?.components) ? data.components : []))
      .catch(() => setPlanSymbols([]))
      .finally(() => setPlanSymbolsLoading(false))
  }, [selectedPlan])

  // ── simId 설정 ───────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedFrame) { setCurrentSimId(null); return }
    setCurrentSimId(selectedFrame.simulation_id ?? null)
  }, [selectedFrame])

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

      {/* ── 공간 심볼 목록 ── */}
      <section className="bg-white border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold text-gray-700">컴포넌트 설정</h2>

        {!selectedPlan ? (
          <p className="text-sm text-gray-400 py-2">도면을 선택하면 컴포넌트 목록이 표시됩니다.</p>
        ) : planSymbolsLoading ? (
          <div className="py-6 text-center space-y-2">
            <p className="text-sm text-gray-500">불러오는 중...</p>
            <p className="text-xs text-gray-400">도면 복잡도에 따라 오래 걸릴 수 있습니다.</p>
          </div>
        ) : planSymbols.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">
            공간 관리에서 STATION, CONVEYOR, BUFFER, SOURCE, DRAIN 으로 분류된 심볼이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="border px-3 py-2 whitespace-nowrap">컴포넌트 유형</th>
                  <th className="border px-3 py-2 whitespace-nowrap">범례</th>
                  <th className="border px-3 py-2 whitespace-nowrap text-right">좌표 (X, Y)</th>
                  <th className="border px-3 py-2 whitespace-nowrap text-right">크기 (너비 × 높이)</th>
                  <th className="border px-3 py-2 whitespace-nowrap">작업명</th>
                  <th className="border px-3 py-2 whitespace-nowrap">기계</th>
                </tr>
              </thead>
              <tbody>
                {planSymbols.map((s, i) => {
                  const cx = fmt2(s.center_x)
                  const cy = fmt2(s.center_y)
                  const w  = fmt2(s.width)
                  const h  = fmt2(s.height)
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="border px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[s.category] ?? 'bg-gray-100 text-gray-700'}`}>
                          {TYPE_LABEL[s.category] ?? s.category}
                        </span>
                      </td>
                      <td className="border px-3 py-2 text-gray-700">{s.legend ?? <span className="text-gray-300">-</span>}</td>
                      <td className="border px-3 py-2 text-right font-mono text-xs text-gray-600">
                        {cx !== null && cy !== null ? `(${cx}, ${cy})` : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="border px-3 py-2 text-right font-mono text-xs text-gray-600">
                        {w !== null && h !== null ? `${w} × ${h}` : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="border px-3 py-2 text-gray-700">{s.work_name ?? <span className="text-gray-300">-</span>}</td>
                      <td className="border px-3 py-2 text-gray-700">
                        {s.machines && s.machines.length > 0
                          ? s.machines.join(', ')
                          : <span className="text-gray-300">-</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-2">{planSymbols.length}개 심볼</p>
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
    </div>
  )
}
