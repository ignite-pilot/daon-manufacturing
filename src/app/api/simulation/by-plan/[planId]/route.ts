import { NextRequest, NextResponse } from 'next/server'
import { SimStore } from '@/lib/simulation'
import { query } from '@/lib/db'

type RouteContext = { params: Promise<{ planId: string }> }

// GET /api/simulation/by-plan/:planId
// 도면에 연결된 시뮬레이션 프로젝트를 반환하거나, 없으면 자동 생성합니다.
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { planId } = await params
    const id = Number(planId)
    if (!id) return NextResponse.json({ error: '유효하지 않은 planId' }, { status: 400 })

    // DB에서 도면 이름 조회
    const rows = await query<{ id: number; name: string }[]>(
      `SELECT id, name FROM plan WHERE id = ? AND deleted_yn = 'N'`,
      [id]
    )
    if (!Array.isArray(rows) || !rows[0]) {
      return NextResponse.json({ error: '도면을 찾을 수 없습니다.' }, { status: 404 })
    }
    const planName = rows[0].name

    // 도면에 연결된 프로젝트 가져오거나 생성
    const project = SimStore.getOrCreateProjectByPlan(id, planName)

    // 해당 프로젝트의 프레임 목록
    const frames = SimStore.getFramesByProject(project.id)

    return NextResponse.json({ project, frames })
  } catch (e) {
    console.error('[GET /api/simulation/by-plan]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
