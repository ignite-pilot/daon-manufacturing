import { NextRequest, NextResponse } from 'next/server'
import { SimStore } from '@/lib/simulation'
import { randomUUID } from 'crypto'

export async function GET(_req: NextRequest, { params }: { params: { simId: string } }) {
  const components = SimStore.getComponentsBySimId(Number(params.simId))
  return NextResponse.json(components)
}

export async function POST(req: NextRequest, { params }: { params: { simId: string } }) {
  const body = await req.json()
  const { name, type } = body
  if (!name || !type) {
    return NextResponse.json({ error: 'name, type은 필수입니다.' }, { status: 400 })
  }

  const comp = SimStore.createComponent(
    Number(params.simId),
    body.id || randomUUID(),
    name, type,
    {
      symbolHandle:    body.symbolHandle    ?? null,
      processingTime:  body.processingTime,
      recoverTime:     body.recoverTime,
      maxValue:        body.maxValue,
      storageCapacity: body.storageCapacity,
      outputMethod:    body.outputMethod,
      conveyorLength:  body.conveyorLength,
      conveyorSpeed:   body.conveyorSpeed,
    },
  )
  return NextResponse.json(comp, { status: 201 })
}
