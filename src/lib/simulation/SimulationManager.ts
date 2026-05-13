import { SimStore } from './SimStore'
import { SimFlow } from './SimFlow'
import { SimSource } from './SimSource'
import { SimDrain } from './SimDrain'
import { SimStation } from './SimStation'
import { SimStorage } from './SimStorage'
import { SimConveyor } from './SimConveyor'
import type { SimComponent } from './SimComponent'
import type { SimComponentRecord } from './SimStore'
import { ComponentType } from './types'
import type { SimStatus, SimReport } from './types'

class SimulationManagerImpl {
  private flow: SimFlow | null = null
  private simId: number | null = null
  private sessionId: number | null = null

  private isRunning = false
  private isPaused = false
  private currentTime = 0      // 시뮬레이션 시각 (ms)
  private speedMultiplier = 1
  private autoStopTime = 0     // ms, 0 = 비활성

  private lastTickRealTime: number | null = null

  constructor() {
    setInterval(() => this.tick(), 100)
  }

  // ── SimStore에서 컴포넌트/플로우 로드 후 SimFlow 구성 ─────────────
  initialize(simId: number): void {
    const components = SimStore.getComponentsBySimId(simId)
    const flows      = SimStore.getFlowsBySimId(simId)

    const simFlow = new SimFlow()
    for (const c of components) {
      const comp = this.buildComponent(c)
      if (comp) simFlow.addComponent(comp)
    }
    for (const f of flows) {
      simFlow.addFlow({
        fromComponentId: f.fromComponentId,
        toComponentId:   f.toComponentId,
        ratio:           f.ratio,
      })
    }

    this.flow        = simFlow
    this.simId       = simId
    this.currentTime = 0
    this.lastTickRealTime = null
  }

  private buildComponent(c: SimComponentRecord): SimComponent | null {
    switch (c.type as ComponentType) {
      case ComponentType.SOURCE:
        return new SimSource(c.id, c.name, c.processing_time, c.recover_time, c.max_value)
      case ComponentType.DRAIN:
        return new SimDrain(c.id, c.name, c.processing_time)
      case ComponentType.STATION:
        return new SimStation(c.id, c.name, c.processing_time, c.recover_time)
      case ComponentType.STORAGE:
        return new SimStorage(
          c.id, c.name, c.processing_time, c.recover_time,
          c.storage_capacity, c.output_method as 'FIFO' | 'QUEUE',
        )
      case ComponentType.CONVEYOR:
        return new SimConveyor(
          c.id, c.name, c.recover_time,
          c.conveyor_length ?? 1.0,
          c.conveyor_speed  ?? 1.0,
        )
      default:
        return null
    }
  }

  // ── 시뮬레이션 제어 ───────────────────────────────────────────────
  start(): number {
    if (this.simId === null || this.flow === null) {
      throw new Error('먼저 initialize()를 호출하세요.')
    }
    if (this.isRunning) throw new Error('이미 실행 중입니다.')

    this.lastTickRealTime = Date.now()
    this.currentTime      = 0

    const session = SimStore.createSession(this.simId, this.speedMultiplier)
    this.sessionId = session.id

    this.isRunning = true
    this.isPaused  = false
    return this.sessionId
  }

  pause(): void {
    if (!this.isRunning || this.isPaused) return
    this.isPaused = true
    if (this.sessionId !== null) {
      SimStore.updateSession(this.sessionId, {
        status: 'PAUSED', pauseTime: new Date().toISOString(),
      })
    }
  }

  resume(): void {
    if (!this.isRunning || !this.isPaused) return
    this.isPaused         = false
    this.lastTickRealTime = Date.now()
    if (this.sessionId !== null) {
      SimStore.updateSession(this.sessionId, {
        status: 'RUNNING', resumeTime: new Date().toISOString(),
      })
    }
  }

  stop(): void {
    if (!this.isRunning) return
    this.isRunning = false
    this.isPaused  = false

    if (this.flow) {
      this.flow.getAllComponents().forEach(c => c.stop())
    }
    if (this.sessionId !== null) {
      SimStore.updateSession(this.sessionId, {
        status: 'STOPPED',
        endTime: new Date().toISOString(),
        simulationTimeMs: this.currentTime,
      })
    }
  }

  setSpeed(multiplier: number): void {
    if (multiplier >= -10 && multiplier <= 10 && multiplier !== 0) {
      this.speedMultiplier = multiplier
      if (this.sessionId !== null) {
        SimStore.updateSession(this.sessionId, { speedMultiplier: multiplier })
      }
    }
  }

  setAutoStopTime(seconds: number): void {
    this.autoStopTime = seconds > 0 ? seconds * 1000 : 0
  }

  getStatus(): SimStatus {
    return {
      isRunning:       this.isRunning,
      isPaused:        this.isPaused,
      currentTime:     this.currentTime,
      speedMultiplier: this.speedMultiplier,
      sessionId:       this.sessionId,
      autoStopTime:    this.autoStopTime,
      simId:           this.simId,
    }
  }

  generateReport(sessionId: number): SimReport {
    const session = SimStore.getSession(sessionId)
    if (!session) throw new Error('세션을 찾을 수 없습니다.')

    const componentStats: SimReport['componentStats'] = {}
    if (this.flow && this.sessionId === sessionId) {
      for (const comp of this.flow.getAllComponents()) {
        componentStats[comp.id] = comp.getStats()
      }
    }

    const report = SimStore.createReport({
      sessionId,
      simId:                session.simId,
      totalSimulationTimeMs: session.simulationTimeMs || this.currentTime,
      startTime:             session.startTime,
      endTime:               session.endTime,
      componentStats,
    })

    return {
      sessionId:             report.sessionId,
      simId:                 report.simId,
      totalSimulationTimeMs: report.totalSimulationTimeMs,
      startTime:             report.startTime,
      endTime:               report.endTime,
      componentStats:        report.componentStats,
    }
  }

  // ── 틱 루프 (100ms 간격) ─────────────────────────────────────────
  private tick(): void {
    if (!this.isRunning || this.isPaused || this.flow === null) return

    const now = Date.now()
    if (this.lastTickRealTime === null) {
      this.lastTickRealTime = now
      return
    }

    const realElapsedMs   = now - this.lastTickRealTime
    this.lastTickRealTime = now

    if (this.speedMultiplier > 0) {
      const simDelta = realElapsedMs * this.speedMultiplier
      this.currentTime += simDelta

      for (const comp of this.flow.getAllComponents()) {
        comp.simCurrentTime = this.currentTime
        comp.process(this.currentTime, this.flow)
        comp.updateIdleStats(simDelta)
      }

      if (this.autoStopTime > 0 && this.currentTime >= this.autoStopTime) {
        this.stop()
      }
    } else {
      // 역방향: 시간만 되감기
      const simDelta = realElapsedMs * Math.abs(this.speedMultiplier)
      this.currentTime = Math.max(0, this.currentTime - simDelta)
    }
  }
}

// ── Next.js global singleton ─────────────────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var _simMgr: SimulationManagerImpl | undefined
}

export const SimManager: SimulationManagerImpl =
  global._simMgr ?? (global._simMgr = new SimulationManagerImpl())
