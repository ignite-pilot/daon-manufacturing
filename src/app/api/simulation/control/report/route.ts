import { NextRequest, NextResponse } from 'next/server'
import { SimManager } from '@/lib/simulation'

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json()
  if (!sessionId) return NextResponse.json({ error: 'sessionId는 필수입니다.' }, { status: 400 })
  try {
    const report = SimManager.generateReport(Number(sessionId))
    return NextResponse.json(report)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
