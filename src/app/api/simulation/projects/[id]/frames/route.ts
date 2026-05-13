import { NextRequest, NextResponse } from 'next/server'
import { SimStore } from '@/lib/simulation'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const frames = SimStore.getFramesByProject(Number(params.id))
  return NextResponse.json(frames)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { name, description } = await req.json()
  if (!name) return NextResponse.json({ error: '이름은 필수입니다.' }, { status: 400 })
  const frame = SimStore.createFrame(Number(params.id), name, description)
  return NextResponse.json(frame, { status: 201 })
}
