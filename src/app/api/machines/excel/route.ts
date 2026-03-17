import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { buildExcelBuffer, excelHeaders } from '@/lib/excel';

export async function GET() {
  try {
    const rows = await query<Record<string, unknown>[]>(
      `SELECT f.name AS '공장', m.name AS '기계 이름', m.total_duration_sec AS '기계 소요시간(초)', m.photo_url AS '기계 사진',
              m.introduced_at AS '도입일시', m.updated_at AS '수정일자', m.updated_by AS '수정자'
       FROM machine m
       JOIN factory f ON f.id = m.factory_id AND f.deleted_yn = 'N'
       WHERE m.deleted_yn = 'N' ORDER BY m.id DESC`
    );
    const data = (rows || []).map((r) => ({
      ...r,
      도입일시: r.도입일시 ? new Date(r.도입일시 as string).toLocaleString('ko-KR') : '',
      수정일자: r.수정일자 ? new Date(r.수정일자 as string).toLocaleString('ko-KR') : '',
    }));
    const buffer = buildExcelBuffer('기계목록', data);
    return new NextResponse(buffer, {
      status: 200,
      headers: excelHeaders('기계목록'),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
