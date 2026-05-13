import { SimComponent } from './SimComponent'
import type { SimFlow } from './SimFlow'

export class SimStation extends SimComponent {
  constructor(id: string, name: string, processingTime: number, recoverTime: number) {
    super(id, name, processingTime ?? 1000, recoverTime ?? 0)
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

  protected outputItem(flow: SimFlow): void {
    if (this.currentItem === null) return

    if (flow.hasOutputs(this.id)) {
      const target = flow.getOutputComponentByRatio(this.id)
      if (target !== null) {
        if (target.tryReceiveItem(this.currentItem)) {
          this.currentItem = null
        }
        // else: 다음 틱에 재시도 (blocked)
      } else {
        this.currentItem = null
      }
    } else {
      this.currentItem = null
    }
  }
}
