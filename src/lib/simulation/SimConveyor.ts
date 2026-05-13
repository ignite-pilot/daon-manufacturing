import { SimComponent } from './SimComponent'
import type { SimItem } from './SimItem'
import type { SimFlow } from './SimFlow'

interface BeltItem {
  item: SimItem
  entrySimTime: number  // 컨베이어에 올라간 시뮬레이션 시각 (ms)
}

export class SimConveyor extends SimComponent {
  conveyorLength: number  // meters
  conveyorSpeed: number   // m/s
  private beltItems: BeltItem[] = []
  private isBlocked = false

  constructor(
    id: string,
    name: string,
    recoverTime: number,
    conveyorLength: number,
    conveyorSpeed: number,
  ) {
    const length = conveyorLength ?? 1.0
    const speed = conveyorSpeed ?? 1.0
    const processingTime = speed > 0 ? Math.round((length / speed) * 1000) : 0
    super(id, name, processingTime, recoverTime ?? 0)
    this.conveyorLength = length
    this.conveyorSpeed = speed
  }

  updateConveyorTiming(): void {
    if (this.conveyorSpeed > 0) {
      this.processingTime = Math.round((this.conveyorLength / this.conveyorSpeed) * 1000)
    }
  }

  // simCurrentTime은 SimulationManager가 매 틱 전에 설정
  tryReceiveItem(item: SimItem): boolean {
    if (this.isBlocked || !this.canReceiveItem) return false
    this.beltItems.push({ item, entrySimTime: this.simCurrentTime })
    return true
  }

  process(currentTime: number, flow: SimFlow): void {
    if (this.isRecovering) {
      if (currentTime - (this.recoveryStartedAt ?? currentTime) >= this.recoverTime) {
        this.completeRecovery(currentTime)
      }
      return
    }

    if (this.isBlocked) return

    const readyItems = this.beltItems.filter(
      bi => currentTime - bi.entrySimTime >= this.processingTime,
    )

    for (const beltItem of readyItems) {
      if (!flow.hasOutputs(this.id)) {
        this.beltItems = this.beltItems.filter(bi => bi !== beltItem)
        this.totalProcessedCount++
        continue
      }

      const target = flow.getOutputComponentByRatio(this.id)
      if (target !== null) {
        if (target.tryReceiveItem(beltItem.item)) {
          this.beltItems = this.beltItems.filter(bi => bi !== beltItem)
          this.totalProcessedCount++
          if (this.isBlocked) {
            this.isBlocked = false
            this.canReceiveItem = true
          }
        } else {
          this.isBlocked = true
          this.canReceiveItem = false
          break  // blocked 시 이후 아이템 처리 중단
        }
      } else {
        this.beltItems = this.beltItems.filter(bi => bi !== beltItem)
        this.totalProcessedCount++
      }
    }

    if (!this.isBlocked) {
      this.canReceiveItem = true
    }
  }

  protected canOutput(): boolean {
    return false  // Conveyor는 process() 안에서 직접 출력
  }

  protected outputItem(_flow: SimFlow): void {
    // Conveyor는 process()에서 처리
  }

  stop(): void {
    super.stop()
    this.beltItems = []
    this.isBlocked = false
  }
}
