import { NextRequest, NextResponse } from 'next/server'
import { SimManager } from '@/lib/simulation'

export async function POST(req: NextRequest) {
  const { multiplier } = await req.json()
  if (typeof multiplier !== 'number') {
    return NextResponse.json({ error: 'multiplier(number)는 필수입니다.' }, { status: 400 })
  }
  SimManager.setSpeed(multiplier)
  return NextResponse.json({ success: true, multiplier })
}
