export enum ComponentType {
  SOURCE = 'SOURCE',
  DRAIN = 'DRAIN',
  STORAGE = 'STORAGE',
  CONVEYOR = 'CONVEYOR',
  STATION = 'STATION',
}

export type OutputMethod = 'FIFO' | 'QUEUE'

export interface ComponentConfig {
  id: string
  name: string
  type: ComponentType
  processingTime?: number
  recoverTime?: number
  maxValue?: number        // SOURCE: -1 = unlimited
  storageCapacity?: number // STORAGE
  outputMethod?: OutputMethod // STORAGE
  conveyorLength?: number  // CONVEYOR (meters)
  conveyorSpeed?: number   // CONVEYOR (m/s)
}

export interface FlowConfig {
  fromComponentId: string
  toComponentId: string
  ratio: number
}

export interface SimStatus {
  isRunning: boolean
  isPaused: boolean
  currentTime: number      // simulation ms
  speedMultiplier: number
  sessionId: number | null
  autoStopTime: number     // ms, 0 = disabled
  simId: number | null
}

export interface ComponentStats {
  componentId: string
  totalProcessedCount: number
  processingTimeMs: number
  recoveryTimeMs: number
  idleTimeMs: number
  blockTimeMs: number
}

export interface SimReport {
  sessionId: number
  simId: number
  totalSimulationTimeMs: number
  startTime: string
  endTime: string | null
  componentStats: Record<string, ComponentStats>
}
