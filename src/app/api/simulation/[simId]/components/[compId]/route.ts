import { NextRequest, NextResponse } from 'next/server'
import { SimStore } from '@/lib/simulation'

export async function GET(
  _req: NextRequest,
  { params }: { params: { simId: string; compId: string } },
) {
  const comp = SimStore.getComponent(params.compId)
  if (!comp || comp.simId !== Number(params.simId)) {
    return NextResponse.json({ error: '컴포넌트를 찾을 수 없습니다.' }, { status: 404 })
  }
  return NextResponse.json(comp)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { simId: string; compId: string } },
) {
  const body = await req.json()
  const comp = SimStore.updateComponent(params.compId, {
    name:             body.name,
    processing_time:  body.processingTime  ?? body.processing_time,
    recover_time:     body.recoverTime     ?? body.recover_time,
    max_value:        body.maxValue        ?? body.max_value,
    storage_capacity: body.storageCapacity ?? body.storage_capacity,
    output_method:    body.outputMethod    ?? body.output_method,
    conveyor_length:  body.conveyorLength  ?? body.conveyor_length,
    conveyor_speed:   body.conveyorSpeed   ?? body.conveyor_speed,
  })
  if (!comp) return NextResponse.json({ error: '컴포넌트를 찾을 수 없습니다.' }, { status: 404 })
  return NextResponse.json(comp)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { simId: string; compId: string } },
) {
  SimStore.deleteComponent(params.compId)
  return NextResponse.json({ success: true })
}
