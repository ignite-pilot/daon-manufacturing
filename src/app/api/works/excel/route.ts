import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { buildExcelBuffer, excelHeaders } from '@/lib/excel';

export async function GET() {
  try {
    const rows = await query<Record<string, unknown>[]>(
      `SELECT name AS '작업 이름', estimated_duration_sec AS '예상 소요시간(초)', work_type AS '작업 Type',
              updated_at AS '수정일자', updated_by AS '수정자'
       FROM work WHERE deleted_yn = 'N' ORDER BY id DESC`
    );
    const data = (rows || []).map((r) => ({
      ...r,
      수정일자: r.수정일자 ? new Date(r.수정일자 as string).toLocaleString('ko-KR') : '',
    }));
    const buffer = buildExcelBuffer('작업목록', data);
    return new NextResponse(buffer, {
      status: 200,
      headers: excelHeaders('작업목록'),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
