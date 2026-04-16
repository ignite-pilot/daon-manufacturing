import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Plan } from '@/types';

// TODO: LLM 연동 구현 시 아래 stub 을 실제 처리 로직으로 교체
// - python script 호출 (analyze_dxf tool)
// - Claude API 호출 (SVG 변환, 메타데이터 생성)
// - 결과 파일 MinIO 업로드
// - plan 레코드 업데이트 (svg_file_path, metadata_file_path, analysis_result_file_path)

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
      "SELECT id, name, analysis_status FROM plan WHERE id = ? AND deleted_yn = 'N'",
      [id]
    );
    if (!Array.isArray(existing) || !existing[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (existing[0].analysis_status === 'ANALYZING') {
      return NextResponse.json({ error: '이미 분석이 진행 중입니다.' }, { status: 409 });
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

    // --- STUB: 실제 LLM 분석 로직이 들어올 자리 ---
    const stubResult = await runAnalysisStub(Number(id), format);
    // ------------------------------------------------

    if (stubResult.success) {
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
          stubResult.svgFilePath,
          stubResult.metadataFilePath,
          stubResult.analysisResultFilePath,
          stubResult.analysisNotesFilePath,
          id,
        ]
      );
    } else {
      await query(
        `UPDATE plan
         SET analysis_status = 'FAILED',
             analysis_error = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [stubResult.error, id]
      );
      return NextResponse.json({ error: stubResult.error }, { status: 500 });
    }

    const rows = await query<Plan[]>(
      `SELECT p.*, f.name AS factory_name
       FROM plan p LEFT JOIN factory f ON f.id = p.factory_id
       WHERE p.id = ?`,
      [id]
    );
    return NextResponse.json(Array.isArray(rows) && rows[0] ? rows[0] : {});
  } catch (e) {
    console.error('[POST /api/plan/[id]/analyze_cad]', e);

    // 예외 발생 시 FAILED 로 롤백
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

// STUB: 실제 LLM 분석 결과 대신 mock 경로를 반환
async function runAnalysisStub(planId: number, _format: string): Promise<
  | { success: true; svgFilePath: string; metadataFilePath: string; analysisResultFilePath: string; analysisNotesFilePath: string | null }
  | { success: false; error: string }
> {
  const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT || 'http://localhost:9000';
  const BUCKET = process.env.STORAGE_BUCKET || 'daon-mfg-local';
  const base = `${STORAGE_ENDPOINT}/${BUCKET}/daon-manufacturing/plans/${planId}`;

  return {
    success: true,
    svgFilePath: `${base}/drawing.svg`,
    metadataFilePath: `${base}/metadata.json`,
    analysisResultFilePath: `${base}/analysis_result.json`,
    analysisNotesFilePath: null,
  };
}
