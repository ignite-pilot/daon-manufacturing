import { NextRequest, NextResponse } from 'next/server'
import { SimStore } from '@/lib/simulation'
import { query } from '@/lib/db'

type RouteContext = { params: Promise<{ dbId: string }> }

/**
 * GET /api/simulation/by-project/:dbId
 * DB simulation_project.id 를 기준으로 런타임 SimStore 시뮬레이션을 보장하고 simId 를 반환한다.
 * plan_id 유무, 서버 재시작 등 모든 상황에서 simId 를 항상 반환한다.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { dbId } = await params
    const id = Number(dbId)
    if (!id) return NextResponse.json({ error: '유효하지 않은 id' }, { status: 400 })

    const rows = await query<{ id: number; name: string; plan_id: number | null }[]>(
      `SELECT id, name, plan_id FROM simulation_project WHERE id = ? AND deleted_yn = 'N'`,
      [id]
    )
    if (!Array.isArray(rows) || !rows[0]) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 })
    }
    const { name, plan_id } = rows[0]

    const project = SimStore.getOrCreateByDbProject(id, name, plan_id ?? undefined)
    return NextResponse.json({ simId: project.simulationId })
  } catch (e) {
    console.error('[GET /api/simulation/by-project/[dbId]]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
