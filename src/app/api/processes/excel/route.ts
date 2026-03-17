import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { buildExcelBuffer, excelHeaders } from '@/lib/excel';

export async function GET() {
  try {
    const rows = await query<Record<string, unknown>[]>(
      `SELECT f.name AS '공장', p.product_name AS '완제품', p.process_name AS '공정 이름', p.total_duration_sec AS '예상 소요시간(초)',
              (SELECT COUNT(*) FROM process_step ps WHERE ps.process_id = p.id) AS '작업 단계 수',
              p.updated_at AS '수정일자', p.updated_by AS '수정자'
       FROM process p
       JOIN factory f ON f.id = p.factory_id AND f.deleted_yn = 'N'
       WHERE p.deleted_yn = 'N' ORDER BY p.id DESC`
    );
    const data = (rows || []).map((r) => ({
      ...r,
      수정일자: r.수정일자 ? new Date(r.수정일자 as string).toLocaleString('ko-KR') : '',
    }));
    const buffer = buildExcelBuffer('공정목록', data);
    return new NextResponse(buffer, {
      status: 200,
      headers: excelHeaders('공정목록'),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
