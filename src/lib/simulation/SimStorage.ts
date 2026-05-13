import { SimComponent } from './SimComponent'
import type { SimItem } from './SimItem'
import type { SimFlow } from './SimFlow'
import type { OutputMethod } from './types'

export class SimStorage extends SimComponent {
  storageCapacity: number
  outputMethod: OutputMethod
  private storageQueue: SimItem[] = []

  constructor(
    id: string,
    name: string,
    processingTime: number,
    recoverTime: number,
    storageCapacity: number,
    outputMethod: OutputMethod,
  ) {
    super(id, name, processingTime ?? 0, recoverTime ?? 0)
    this.storageCapacity = storageCapacity ?? 10
    this.outputMethod = outputMethod ?? 'FIFO'
  }

  // Storage는 큐에 직접 추가 (canReceiveItem 체크 대신 capacity 체크)
  tryReceiveItem(item: SimItem): boolean {
    if (this.storageQueue.length >= this.storageCapacity) return false
    this.storageQueue.push(item)
    return true
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

    // 큐에서 아이템 꺼내 처리
    if (this.currentItem === null && this.storageQueue.length > 0 && !this.isProcessing) {
      this.currentItem = this.storageQueue.shift()!
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
        // else: blocked
      } else {
        this.currentItem = null
      }
    } else {
      this.currentItem = null
    }
  }

  stop(): void {
    super.stop()
    this.storageQueue = []
  }

  get currentStorageSize(): number {
    return this.storageQueue.length
  }
}
