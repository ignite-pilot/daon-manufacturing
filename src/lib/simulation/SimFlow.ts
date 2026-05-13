import type { SimComponent } from './SimComponent'
import type { FlowConfig } from './types'

export class SimFlow {
  private components = new Map<string, SimComponent>()
  private flows: FlowConfig[] = []

  addComponent(component: SimComponent): void {
    this.components.set(component.id, component)
  }

  getComponent(id: string): SimComponent | undefined {
    return this.components.get(id)
  }

  addFlow(flow: FlowConfig): void {
    this.flows.push(flow)
    this.normalizeRatios(flow.fromComponentId)
  }

  hasOutputs(componentId: string): boolean {
    return this.flows.some(f => f.fromComponentId === componentId)
  }

  getOutputs(componentId: string): FlowConfig[] {
    return this.flows.filter(f => f.fromComponentId === componentId)
  }

  getOutputComponentByRatio(fromId: string): SimComponent | null {
    const outputs = this.getOutputs(fromId)
    if (outputs.length === 0) return null

    const rand = Math.random()
    let cumulative = 0
    for (const flow of outputs) {
      cumulative += flow.ratio
      if (rand <= cumulative) {
        return this.components.get(flow.toComponentId) ?? null
      }
    }
    // 부동소수점 오차 대비 fallback
    const last = outputs[outputs.length - 1]
    return this.components.get(last.toComponentId) ?? null
  }

  getAllComponents(): SimComponent[] {
    return Array.from(this.components.values())
  }

  private normalizeRatios(fromId: string): void {
    const outputs = this.getOutputs(fromId)
    if (outputs.length === 0) return

    const total = outputs.reduce((sum, f) => sum + f.ratio, 0)
    if (total === 0) {
      const equal = 1.0 / outputs.length
      outputs.forEach(f => { f.ratio = equal })
    } else if (Math.abs(total - 1.0) > 0.0001) {
      outputs.forEach(f => { f.ratio = f.ratio / total })
    }
  }

  clear(): void {
    this.components.clear()
    this.flows = []
  }
}
