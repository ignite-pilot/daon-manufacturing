import { NextRequest, NextResponse } from 'next/server'
import { SimStore } from '@/lib/simulation'

export async function POST(req: NextRequest, { params }: { params: { simId: string } }) {
  const { components = [], flows = [] } = await req.json()
  const result = SimStore.batchSet(Number(params.simId), components, flows)
  return NextResponse.json(result, { status: 201 })
}

export async function DELETE(_req: NextRequest, { params }: { params: { simId: string } }) {
  const simId = Number(params.simId)
  SimStore.deleteComponentsBySimId(simId)
  SimStore.deleteFlowsBySimId(simId)
  return NextResponse.json({ success: true })
}
