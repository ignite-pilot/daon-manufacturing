import { NextRequest, NextResponse } from 'next/server'
import { SimManager } from '@/lib/simulation'

export async function POST(req: NextRequest) {
  const { seconds } = await req.json()
  SimManager.setAutoStopTime(typeof seconds === 'number' ? seconds : 0)
  return NextResponse.json({ success: true, seconds: seconds ?? 0 })
}
