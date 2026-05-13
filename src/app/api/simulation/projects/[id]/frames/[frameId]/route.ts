import { NextRequest, NextResponse } from 'next/server'
import { SimStore } from '@/lib/simulation'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; frameId: string } },
) {
  const frame = SimStore.getFrame(Number(params.frameId))
  if (!frame || frame.projectId !== Number(params.id)) {
    return NextResponse.json({ error: '프레임을 찾을 수 없습니다.' }, { status: 404 })
  }
  return NextResponse.json(frame)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; frameId: string } },
) {
  const { name, description } = await req.json()
  if (!name) return NextResponse.json({ error: '이름은 필수입니다.' }, { status: 400 })
  const frame = SimStore.updateFrame(Number(params.frameId), { name, description })
  if (!frame) return NextResponse.json({ error: '프레임을 찾을 수 없습니다.' }, { status: 404 })
  return NextResponse.json(frame)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; frameId: string } },
) {
  SimStore.deleteFrame(Number(params.frameId))
  return NextResponse.json({ success: true })
}
