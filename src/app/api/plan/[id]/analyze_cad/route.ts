import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Plan } from '@/types';
import { runAnalysis } from '@/lib/plan-analyzer';

export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const format = req.nextUrl.searchParams.get('format')?.toLowerCase() || 'dxf';

    const supportedFormats = ['dxf'];
    if (!supportedFormats.includes(format)) {
      return NextResponse.json(
        { error: `현재 지원하는 분석 형식: ${supportedFormats.join(', ')}` },
        { status: 400 }
      );
    }

    const existing = await query<Plan[]>(
      "SELECT id, name, analysis_status, original_file_path FROM plan WHERE id = ? AND deleted_yn = 'N'",
      [id]
    );
    if (!Array.isArray(existing) || !existing[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (existing[0].analysis_status === 'ANALYZING') {
      return NextResponse.json({ error: '이미 분석이 진행 중입니다.' }, { status: 409 });
    }
    if (!existing[0].original_file_path) {
      return NextResponse.json({ error: '원본 파일 경로가 없습니다.' }, { status: 422 });
    }

    const body = await req.json().catch(() => ({}));
    const additionalInstructions = body.additional_instructions != null
      ? String(body.additional_instructions).trim() || null
      : null;

    // 분석 시작: ANALYZING 상태로 변경
    await query(
      `UPDATE plan
       SET analysis_status = 'ANALYZING',
           additional_instructions = ?,
           analysis_error = NULL,
           updated_at = NOW()
       WHERE id = ?`,
      [additionalInstructions, id]
    );

    // 실제 분석 실행
    let result: Awaited<ReturnType<typeof runAnalysis>>;
    try {
      result = await runAnalysis({
        planId: Number(id),
        dxfUrl: existing[0].original_file_path,
        additionalInstructions,
      });
    } catch (analysisErr) {
      const errMsg = analysisErr instanceof Error ? analysisErr.message : '알 수 없는 오류';
      await query(
        "UPDATE plan SET analysis_status = 'FAILED', analysis_error = ?, updated_at = NOW() WHERE id = ?",
        [errMsg, id]
      );
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }

    await query(
      `UPDATE plan
       SET analysis_status = 'COMPLETED',
           svg_file_path = ?,
           metadata_file_path = ?,
           analysis_result_file_path = ?,
           analysis_notes_file_path = ?,
           version = version + 1,
           updated_at = NOW()
       WHERE id = ?`,
      [
        result.svgFilePath,
        result.metadataFilePath,
        result.analysisResultFilePath,
        result.analysisNotesFilePath,
        id,
      ]
    );

    const rows = await query<Plan[]>(
      `SELECT p.*, f.name AS factory_name
       FROM plan p LEFT JOIN factory f ON f.id = p.factory_id
       WHERE p.id = ?`,
      [id]
    );
    return NextResponse.json(Array.isArray(rows) && rows[0] ? rows[0] : {});
  } catch (e) {
    console.error('[POST /api/plan/[id]/analyze_cad]', e);

    const { id } = await params;
    await query(
      "UPDATE plan SET analysis_status = 'FAILED', analysis_error = ?, updated_at = NOW() WHERE id = ?",
      [e instanceof Error ? e.message : 'Unknown error', id]
    ).catch(() => {});

    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
