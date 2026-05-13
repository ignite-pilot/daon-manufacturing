import { SimComponent } from './SimComponent'
import type { SimFlow } from './SimFlow'

export class SimDrain extends SimComponent {
  constructor(id: string, name: string, processingTime: number) {
    super(id, name, processingTime ?? 0, 0)  // recoverTime 항상 0
  }

  process(currentTime: number, flow: SimFlow): void {
    if (this.isRecovering) {
      if (currentTime - (this.recoveryStartedAt ?? currentTime) >= this.recoverTime) {
        this.completeRecovery(currentTime)
      }
      return
    }

    if (this.isProcessing && this.currentItem !== null) {
      if (
        this.processingTime === 0 ||
        currentTime - (this.processingStartedAt ?? currentTime) >= this.processingTime
      ) {
        this.completeProcessing(currentTime, flow)
      }
      return
    }

    if (this.currentItem !== null && !this.isProcessing) {
      this.startProcessing(currentTime)
      if (this.processingTime === 0) {
        this.completeProcessing(currentTime, flow)
      }
    }
  }

  protected canOutput(): boolean {
    return this.currentItem !== null && this.isProcessing
  }

  protected outputItem(_flow: SimFlow): void {
    // Drain은 최종 목적지 — 아이템 제거
    this.currentItem = null
  }
}
