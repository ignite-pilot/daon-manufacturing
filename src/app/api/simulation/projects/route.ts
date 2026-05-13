import { NextRequest, NextResponse } from 'next/server'
import { SimStore } from '@/lib/simulation'

export async function GET() {
  return NextResponse.json(SimStore.getAllProjects())
}

export async function POST(req: NextRequest) {
  const { name, description } = await req.json()
  if (!name) return NextResponse.json({ error: '이름은 필수입니다.' }, { status: 400 })
  const project = SimStore.createProject(name, description)
  return NextResponse.json(project, { status: 201 })
}
