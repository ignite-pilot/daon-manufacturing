import { randomUUID } from 'crypto'

export class SimItem {
  readonly id: string
  createdAt: number   // simulation time ms
  outputAt: number | null = null

  constructor(id: string, createdAt: number) {
    this.id = id
    this.createdAt = createdAt
  }

  static create(simTime: number): SimItem {
    return new SimItem(randomUUID(), simTime)
  }
}
