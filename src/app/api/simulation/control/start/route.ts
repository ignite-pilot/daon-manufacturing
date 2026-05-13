import { NextRequest, NextResponse } from 'next/server'
import { SimManager } from '@/lib/simulation'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  try {
    if (body.simId) SimManager.initialize(Number(body.simId))
    const sessionId = SimManager.start()
    return NextResponse.json({ success: true, sessionId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
