import type { SimFlow } from './SimFlow'
import type { SimItem } from './SimItem'
import type { ComponentStats } from './types'

export abstract class SimComponent {
  readonly id: string
  name: string
  processingTime: number  // ms
  recoverTime: number     // ms

  currentItem: SimItem | null = null
  processingStartedAt: number | null = null
  processingDoneAt: number | null = null  // set when done but blocked on output
  itemOutputAt: number | null = null
  recoveryStartedAt: number | null = null

  isProcessing = false
  isRecovering = false
  canReceiveItem = true

  // SimulationManager가 매 틱마다 process() 호출 전 설정 (Conveyor entryTime 용도)
  simCurrentTime = 0

  // Stats
  totalProcessedCount = 0
  statProcessingMs = 0
  statRecoveryMs = 0
  statIdleMs = 0
  statBlockMs = 0

  constructor(id: string, name: string, processingTime: number, recoverTime: number) {
    this.id = id
    this.name = name
    this.processingTime = processingTime
    this.recoverTime = recoverTime
  }

  tryReceiveItem(item: SimItem): boolean {
    if (!this.canReceiveItem || this.currentItem !== null || this.isRecovering) {
      return false
    }
    this.currentItem = item
    this.canReceiveItem = false
    return true
  }

  abstract process(currentTime: number, flow: SimFlow): void

  protected abstract canOutput(): boolean
  protected abstract outputItem(flow: SimFlow): void

  protected startProcessing(currentTime: number): void {
    if (this.currentItem === null || this.isProcessing) return
    this.processingStartedAt = currentTime
    this.isProcessing = true
  }

  protected completeProcessing(currentTime: number, flow: SimFlow): void {
    if (!this.isProcessing || this.currentItem === null) return

    if (this.processingDoneAt === null) {
      // 처음 처리 완료: processing 시간 누적
      const duration = currentTime - (this.processingStartedAt ?? currentTime)
      this.statProcessingMs += duration
      this.itemOutputAt = currentTime
      this.processingDoneAt = currentTime
    } else {
      // blocked 상태: block 시간 누적
      this.statBlockMs += currentTime - this.processingDoneAt
      this.processingDoneAt = currentTime
    }

    this.outputItem(flow)

    if (this.currentItem === null) {
      // 출력 성공
      this.isProcessing = false
      this.processingDoneAt = null
      this.totalProcessedCount++
      if (this.recoverTime > 0) {
        this.startRecovery(currentTime)
      } else {
        this.canReceiveItem = true
      }
    }
    // else: 출력 대기 중 (다음 틱에 재시도)
  }

  protected startRecovery(currentTime: number): void {
    this.recoveryStartedAt = currentTime
    this.isRecovering = true
    this.canReceiveItem = false
  }

  protected completeRecovery(currentTime: number): void {
    if (!this.isRecovering) return
    const duration = currentTime - (this.recoveryStartedAt ?? currentTime)
    this.statRecoveryMs += duration
    this.isRecovering = false
    this.canReceiveItem = true
  }

  // 매 틱 process() 호출 후 idle 시간 누적
  updateIdleStats(simDelta: number): void {
    if (!this.isProcessing && !this.isRecovering && this.currentItem === null) {
      this.statIdleMs += simDelta
    }
  }

  stop(): void {
    this.currentItem = null
    this.isProcessing = false
    this.isRecovering = false
    this.canReceiveItem = true
    this.processingDoneAt = null
  }

  getStats(): ComponentStats {
    return {
      componentId: this.id,
      totalProcessedCount: this.totalProcessedCount,
      processingTimeMs: this.statProcessingMs,
      recoveryTimeMs: this.statRecoveryMs,
      idleTimeMs: this.statIdleMs,
      blockTimeMs: this.statBlockMs,
    }
  }
}
