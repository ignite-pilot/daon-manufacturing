import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { buildExcelBuffer, excelHeaders } from '@/lib/excel';

export async function GET() {
  try {
    const rows = await query<Record<string, unknown>[]>(
      `SELECT f.name AS '공장', p.name AS '부품 이름', p.photo_url AS '부품 사진', p.description AS '부품 설명',
              p.updated_at AS '수정일자', p.updated_by AS '수정자'
       FROM part p
       LEFT JOIN factory f ON f.id = p.factory_id AND f.deleted_yn = 'N'
       WHERE p.deleted_yn = 'N' ORDER BY p.id DESC`
    );
    const data = (rows || []).map((r) => ({
      ...r,
      수정일자: r.수정일자 ? new Date(r.수정일자 as string).toLocaleString('ko-KR') : '',
    }));
    const buffer = buildExcelBuffer('부품목록', data);
    return new NextResponse(buffer, {
      status: 200,
      headers: excelHeaders('부품목록'),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
