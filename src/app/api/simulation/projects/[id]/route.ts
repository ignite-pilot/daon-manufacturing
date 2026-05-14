import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getUpdatedByFromAuth } from '@/lib/auth-server'
import { getUpdatedBy } from '@/lib/api-util'

type RouteContext = { params: Promise<{ id: string }> }

interface SimProjectRow {
  id: number
  name: string
  description: string | null
  plan_id: number | null
  plan_name: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

const SELECT_SQL = `
  SELECT sp.id, sp.name, sp.description, sp.plan_id,
         p.name AS plan_name,
         sp.created_by, sp.created_at, sp.updated_at
  FROM simulation_project sp
  LEFT JOIN plan p ON sp.plan_id = p.id AND p.deleted_yn = 'N'
`

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const rows = await query<SimProjectRow[]>(
      SELECT_SQL + `WHERE sp.id = ? AND sp.deleted_yn = 'N'`,
      [id]
    )
    if (!Array.isArray(rows) || !rows[0]) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 })
    }
    return NextResponse.json(rows[0])
  } catch (e) {
    console.error('[GET /api/simulation/projects/[id]]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, description, plan_id } = body
    if (!name) return NextResponse.json({ error: '이름은 필수입니다.' }, { status: 400 })

    const updatedBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(req)

    await query(
      `UPDATE simulation_project
       SET name = ?, description = ?, plan_id = ?, created_by = COALESCE(created_by, ?)
       WHERE id = ? AND deleted_yn = 'N'`,
      [name, description ?? null, plan_id ?? null, updatedBy, id]
    )

    const rows = await query<SimProjectRow[]>(
      SELECT_SQL + `WHERE sp.id = ? AND sp.deleted_yn = 'N'`,
      [id]
    )
    if (!Array.isArray(rows) || !rows[0]) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 })
    }
    return NextResponse.json(rows[0])
  } catch (e) {
    console.error('[PUT /api/simulation/projects/[id]]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    await query(
      `UPDATE simulation_project SET deleted_yn = 'Y' WHERE id = ? AND deleted_yn = 'N'`,
      [id]
    )
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[DELETE /api/simulation/projects/[id]]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
