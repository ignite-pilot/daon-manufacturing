import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { buildExcelBuffer, excelHeaders } from '@/lib/excel';

export async function GET() {
  try {
    const rows = await query<Record<string, unknown>[]>(
      `SELECT name AS '공장 이름', zip_code AS '우편번호', address AS '주소', address_detail AS '상세 주소', area AS '면적', cad_file_path AS 'CAD 파일', updated_at AS '수정일자', updated_by AS '수정자'
       FROM factory WHERE deleted_yn = 'N' ORDER BY id DESC`
    );
    const data = (rows || []).map((r) => ({
      ...r,
      수정일자: r.수정일자 ? new Date(r.수정일자 as string).toLocaleString('ko-KR') : '',
    }));
    const buffer = buildExcelBuffer('제조공장목록', data);
    return new NextResponse(buffer, {
      status: 200,
      headers: excelHeaders('제조공장목록'),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
