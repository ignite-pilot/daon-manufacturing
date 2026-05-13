import { NextRequest, NextResponse } from 'next/server'
import { SimStore } from '@/lib/simulation'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const project = SimStore.getProject(Number(params.id))
  if (!project) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 })
  return NextResponse.json(project)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { name, description } = await req.json()
  if (!name) return NextResponse.json({ error: '이름은 필수입니다.' }, { status: 400 })
  const project = SimStore.updateProject(Number(params.id), { name, description })
  if (!project) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 })
  return NextResponse.json(project)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  SimStore.deleteProject(Number(params.id))
  return NextResponse.json({ success: true })
}
