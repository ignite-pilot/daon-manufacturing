import { NextResponse } from 'next/server'
import { SimManager } from '@/lib/simulation'

export async function POST() {
  SimManager.stop()
  return NextResponse.json({ success: true })
}
