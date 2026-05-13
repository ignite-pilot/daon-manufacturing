import { NextRequest, NextResponse } from 'next/server'
import { SimManager } from '@/lib/simulation'

export async function POST(req: NextRequest) {
  const { simId } = await req.json()
  if (!simId) return NextResponse.json({ error: 'simId는 필수입니다.' }, { status: 400 })
  try {
    SimManager.initialize(Number(simId))
    return NextResponse.json({ success: true, simId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
