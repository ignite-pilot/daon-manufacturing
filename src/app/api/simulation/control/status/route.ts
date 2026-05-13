import { NextResponse } from 'next/server'
import { SimManager } from '@/lib/simulation'

export async function GET() {
  return NextResponse.json(SimManager.getStatus())
}
