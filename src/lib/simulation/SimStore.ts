/**
 * 시뮬레이션 in-memory 데이터 스토어.
 * DB 없이 동작하며, Next.js global singleton 패턴으로 프로세스 재시작 전까지 유지됩니다.
 */
import type { ComponentStats } from './types'

// ── 레코드 타입 ──────────────────────────────────────────────────────
export interface SimProjectRecord {
  id: number
  name: string
  description: string | null
  planId: number | null
  dbProjectId: number | null  // DB simulation_project.id
  simulationId: number        // 프로젝트 생성 시 자동 생성된 시뮬레이션 ID
  createdAt: string
}

export interface SimFrameRecord {
  id: number
  projectId: number
  name: string
  description: string | null
  simulationId: number  // 프레임 생성 시 자동 생성
  createdAt: string
}

export interface SimulationRecord {
  id: number
  frameId: number
  createdAt: string
}

export interface SimComponentRecord {
  id: string
  simId: number
  name: string
  type: string
  processing_time: number
  recover_time: number
  max_value: number
  storage_capacity: number
  output_method: string
  conveyor_length: number | null
  conveyor_speed: number | null
  createdAt: string
}

export interface SimFlowRecord {
  id: number
  simId: number
  fromComponentId: string
  toComponentId: string
  ratio: number
}

export interface SimSessionRecord {
  id: number
  simId: number
  status: 'RUNNING' | 'PAUSED' | 'STOPPED'
  speedMultiplier: number
  startTime: string
  pauseTime: string | null
  resumeTime: string | null
  endTime: string | null
  simulationTimeMs: number
}

export interface SimReportRecord {
  id: number
  sessionId: number
  simId: number
  totalSimulationTimeMs: number
  startTime: string
  endTime: string | null
  componentStats: Record<string, ComponentStats>
  createdAt: string
}

// ── 스토어 구현 ──────────────────────────────────────────────────────
class SimStoreImpl {
  private projects: SimProjectRecord[] = []
  private frames: SimFrameRecord[] = []
  private simulations: SimulationRecord[] = []
  private components: SimComponentRecord[] = []
  private flows: SimFlowRecord[] = []
  sessions: SimSessionRecord[] = []
  private reports: SimReportRecord[] = []

  private seq = { project: 1, frame: 1, sim: 1, flow: 1, session: 1, report: 1 }
  private nextId(key: keyof typeof this.seq) { return this.seq[key]++ }

  private now() { return new Date().toISOString() }

  // ── Projects ─────────────────────────────────────────────────────
  createProject(name: string, description?: string, planId?: number, dbProjectId?: number): SimProjectRecord {
    const simId = this.nextId('sim')
    this.simulations.push({ id: simId, frameId: 0, createdAt: this.now() })
    const rec: SimProjectRecord = {
      id: this.nextId('project'), name, description: description ?? null,
      planId: planId ?? null, dbProjectId: dbProjectId ?? null,
      simulationId: simId, createdAt: this.now(),
    }
    this.projects.push(rec)
    return rec
  }

  /** DB simulation_project.id 기준으로 런타임 SimProject 를 가져오거나 생성 */
  getOrCreateByDbProject(dbProjectId: number, name: string, planId?: number): SimProjectRecord {
    const existing = this.projects.find(p => p.dbProjectId === dbProjectId)
    if (existing) {
      // 구버전 레코드에 simulationId 가 없을 경우 보정
      if (!existing.simulationId) {
        const simId = this.nextId('sim')
        this.simulations.push({ id: simId, frameId: existing.id, createdAt: this.now() })
        existing.simulationId = simId
      }
      return existing
    }
    return this.createProject(name, undefined, planId, dbProjectId)
  }

  getProjectByPlanId(planId: number): SimProjectRecord | undefined {
    return this.projects.find(p => p.planId === planId)
  }

  getOrCreateProjectByPlan(planId: number, planName: string): SimProjectRecord {
    const existing = this.getProjectByPlanId(planId)
    if (existing) return existing
    return this.createProject(planName, undefined, planId)
  }

  getProject(id: number): SimProjectRecord | undefined {
    return this.projects.find(p => p.id === id)
  }

  getAllProjects(): SimProjectRecord[] {
    return [...this.projects].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  updateProject(id: number, data: { name?: string; description?: string }): SimProjectRecord | undefined {
    const rec = this.getProject(id)
    if (!rec) return undefined
    if (data.name !== undefined) rec.name = data.name
    if (data.description !== undefined) rec.description = data.description
    return rec
  }

  deleteProject(id: number): void {
    // cascade: frames → simulations → components/flows/sessions/reports
    this.frames.filter(f => f.projectId === id).forEach(f => this.deleteFrame(f.id))
    this.projects = this.projects.filter(p => p.id !== id)
  }

  // ── Frames ───────────────────────────────────────────────────────
  createFrame(projectId: number, name: string, description?: string): SimFrameRecord {
    // 시뮬레이션 자동 생성
    const sim: SimulationRecord = {
      id: this.nextId('sim'), frameId: 0, createdAt: this.now(),
    }
    const frame: SimFrameRecord = {
      id: this.nextId('frame'), projectId, name,
      description: description ?? null,
      simulationId: sim.id, createdAt: this.now(),
    }
    sim.frameId = frame.id
    this.simulations.push(sim)
    this.frames.push(frame)
    return frame
  }

  getFrame(id: number): SimFrameRecord | undefined {
    return this.frames.find(f => f.id === id)
  }

  getFramesByProject(projectId: number): SimFrameRecord[] {
    return this.frames
      .filter(f => f.projectId === projectId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }

  updateFrame(id: number, data: { name?: string; description?: string }): SimFrameRecord | undefined {
    const rec = this.getFrame(id)
    if (!rec) return undefined
    if (data.name !== undefined) rec.name = data.name
    if (data.description !== undefined) rec.description = data.description
    return rec
  }

  deleteFrame(id: number): void {
    const frame = this.getFrame(id)
    if (!frame) return
    const sim = this.simulations.find(s => s.frameId === id)
    if (sim) {
      this.deleteComponentsBySimId(sim.id)
      this.deleteFlowsBySimId(sim.id)
      this.sessions.filter(s => s.simId === sim.id).forEach(s => {
        this.reports = this.reports.filter(r => r.sessionId !== s.id)
      })
      this.sessions = this.sessions.filter(s => s.simId !== sim.id)
      this.simulations = this.simulations.filter(s => s.id !== sim.id)
    }
    this.frames = this.frames.filter(f => f.id !== id)
  }

  // ── Simulations ──────────────────────────────────────────────────
  getSimulation(id: number): SimulationRecord | undefined {
    return this.simulations.find(s => s.id === id)
  }

  getSimulationByFrame(frameId: number): SimulationRecord | undefined {
    return this.simulations.find(s => s.frameId === frameId)
  }

  // ── Components ───────────────────────────────────────────────────
  createComponent(
    simId: number,
    id: string,
    name: string,
    type: string,
    opts: {
      processingTime?: number; recoverTime?: number; maxValue?: number
      storageCapacity?: number; outputMethod?: string
      conveyorLength?: number | null; conveyorSpeed?: number | null
    } = {},
  ): SimComponentRecord {
    const rec: SimComponentRecord = {
      id, simId, name, type,
      processing_time:  opts.processingTime  ?? 0,
      recover_time:     opts.recoverTime     ?? 0,
      max_value:        opts.maxValue        ?? -1,
      storage_capacity: opts.storageCapacity ?? 10,
      output_method:    opts.outputMethod    ?? 'FIFO',
      conveyor_length:  opts.conveyorLength  ?? null,
      conveyor_speed:   opts.conveyorSpeed   ?? null,
      createdAt: this.now(),
    }
    // 기존 동일 id 제거 후 추가 (upsert)
    this.components = this.components.filter(c => c.id !== id)
    this.components.push(rec)
    return rec
  }

  getComponent(id: string): SimComponentRecord | undefined {
    return this.components.find(c => c.id === id)
  }

  getComponentsBySimId(simId: number): SimComponentRecord[] {
    return this.components.filter(c => c.simId === simId)
  }

  updateComponent(id: string, data: Partial<Omit<SimComponentRecord, 'id' | 'simId' | 'createdAt'>>): SimComponentRecord | undefined {
    const rec = this.getComponent(id)
    if (!rec) return undefined
    Object.assign(rec, data)
    return rec
  }

  deleteComponent(id: string): void {
    this.components = this.components.filter(c => c.id !== id)
  }

  deleteComponentsBySimId(simId: number): void {
    this.components = this.components.filter(c => c.simId !== simId)
  }

  // ── Flows ─────────────────────────────────────────────────────────
  createFlow(simId: number, fromComponentId: string, toComponentId: string, ratio: number): SimFlowRecord {
    const rec: SimFlowRecord = {
      id: this.nextId('flow'), simId, fromComponentId, toComponentId, ratio,
    }
    this.flows.push(rec)
    return rec
  }

  getFlowsBySimId(simId: number): SimFlowRecord[] {
    return this.flows.filter(f => f.simId === simId)
  }

  deleteFlow(id: number): void {
    this.flows = this.flows.filter(f => f.id !== id)
  }

  deleteFlowsBySimId(simId: number): void {
    this.flows = this.flows.filter(f => f.simId !== simId)
  }

  // 컴포넌트+플로우 일괄 교체
  batchSet(
    simId: number,
    components: Array<{
      id?: string; name: string; type: string
      processingTime?: number; recoverTime?: number; maxValue?: number
      storageCapacity?: number; outputMethod?: string
      conveyorLength?: number | null; conveyorSpeed?: number | null
    }>,
    flows: Array<{ fromComponentId: string; toComponentId: string; ratio: number }>,
  ): { components: SimComponentRecord[]; flows: SimFlowRecord[] } {
    this.deleteComponentsBySimId(simId)
    this.deleteFlowsBySimId(simId)

    const { randomUUID } = require('crypto') as typeof import('crypto')

    const createdComponents = components.map(c =>
      this.createComponent(simId, c.id || randomUUID(), c.name, c.type, {
        processingTime: c.processingTime, recoverTime: c.recoverTime,
        maxValue: c.maxValue, storageCapacity: c.storageCapacity,
        outputMethod: c.outputMethod,
        conveyorLength: c.conveyorLength, conveyorSpeed: c.conveyorSpeed,
      })
    )
    const createdFlows = flows.map(f =>
      this.createFlow(simId, f.fromComponentId, f.toComponentId, f.ratio)
    )
    return { components: createdComponents, flows: createdFlows }
  }

  // ── Sessions ─────────────────────────────────────────────────────
  createSession(simId: number, speedMultiplier: number): SimSessionRecord {
    const rec: SimSessionRecord = {
      id: this.nextId('session'), simId, status: 'RUNNING',
      speedMultiplier, startTime: this.now(),
      pauseTime: null, resumeTime: null, endTime: null, simulationTimeMs: 0,
    }
    this.sessions.push(rec)
    return rec
  }

  getSession(id: number): SimSessionRecord | undefined {
    return this.sessions.find(s => s.id === id)
  }

  updateSession(id: number, data: Partial<SimSessionRecord>): void {
    const rec = this.getSession(id)
    if (rec) Object.assign(rec, data)
  }

  // ── Reports ──────────────────────────────────────────────────────
  createReport(data: Omit<SimReportRecord, 'id' | 'createdAt'>): SimReportRecord {
    const rec: SimReportRecord = { ...data, id: this.nextId('report'), createdAt: this.now() }
    this.reports.push(rec)
    return rec
  }

  getReport(id: number): SimReportRecord | undefined {
    return this.reports.find(r => r.id === id)
  }
}

// ── Next.js global singleton ─────────────────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var _simStore: SimStoreImpl | undefined
}

export const SimStore: SimStoreImpl =
  global._simStore ?? (global._simStore = new SimStoreImpl())
