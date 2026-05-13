import { SimComponent } from './SimComponent'
import { SimItem } from './SimItem'
import type { SimFlow } from './SimFlow'

export class SimSource extends SimComponent {
  maxValue: number  // -1 = unlimited
  createdCount = 0
  private lastCreationSimTime: number | null = null
  private isHolding = false

  constructor(
    id: string,
    name: string,
    processingTime: number,
    recoverTime: number,
    maxValue: number,
  ) {
    super(id, name, processingTime ?? 1000, recoverTime ?? 0)
    this.maxValue = maxValue ?? -1
  }

  process(currentTime: number, flow: SimFlow): void {
    if (this.isRecovering) {
      if (currentTime - (this.recoveryStartedAt ?? currentTime) >= this.recoverTime) {
        this.completeRecovery(currentTime)
      }
      return
    }

    if (this.isProcessing && this.currentItem !== null) {
      if (currentTime - (this.processingStartedAt ?? currentTime) >= this.processingTime) {
        this.completeProcessing(currentTime, flow)
        if (this.currentItem === null) this.isHolding = false
      }
      return
    }

    // 처리 완료됐으나 아직 출력 못 한 경우 (blocked)
    if (this.currentItem !== null && !this.isProcessing) {
      if (this.canOutput()) {
        this.outputItem(flow)
        if (this.currentItem === null) this.isHolding = false
      } else {
        this.startProcessing(currentTime)
      }
      return
    }

    // 새 아이템 생성
    if (this.currentItem === null && !this.isHolding && this.canCreateItem(currentTime)) {
      this.createItem(currentTime)
    }
  }

  private canCreateItem(currentTime: number): boolean {
    if (this.maxValue !== -1 && this.createdCount >= this.maxValue) return false
    if (this.lastCreationSimTime !== null) {
      if (currentTime - this.lastCreationSimTime < this.processingTime) return false
    }
    return true
  }

  private createItem(currentTime: number): void {
    if (this.maxValue !== -1 && this.createdCount >= this.maxValue) return
    const item = SimItem.create(currentTime)
    if (this.tryReceiveItem(item)) {
      this.createdCount++
      this.lastCreationSimTime = currentTime
      this.isHolding = true
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
          this.isHolding = false
        }
        // else: 다음 틱에 재시도
      } else {
        this.currentItem = null
        this.isHolding = false
      }
    } else {
      this.currentItem = null
      this.isHolding = false
    }
  }

  stop(): void {
    super.stop()
    this.isHolding = false
  }
}
