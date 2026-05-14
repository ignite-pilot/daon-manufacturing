import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getUpdatedByFromAuth } from '@/lib/auth-server'
import { getUpdatedBy } from '@/lib/api-util'

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

export async function GET() {
  try {
    const rows = await query<SimProjectRow[]>(
      SELECT_SQL + `WHERE sp.deleted_yn = 'N' ORDER BY sp.created_at DESC`
    )
    return NextResponse.json(Array.isArray(rows) ? rows : [])
  } catch (e) {
    console.error('[GET /api/simulation/projects]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, description, plan_id } = body
    if (!name) return NextResponse.json({ error: '이름은 필수입니다.' }, { status: 400 })

    const createdBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(req)

    const result = await query(
      `INSERT INTO simulation_project (name, description, plan_id, created_by)
       VALUES (?, ?, ?, ?)`,
      [name, description ?? null, plan_id ?? null, createdBy]
    )
    const id = (result as unknown as { insertId: number }).insertId

    const rows = await query<SimProjectRow[]>(
      SELECT_SQL + `WHERE sp.id = ?`,
      [id]
    )
    return NextResponse.json(Array.isArray(rows) && rows[0] ? rows[0] : {}, { status: 201 })
  } catch (e) {
    console.error('[POST /api/simulation/projects]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
