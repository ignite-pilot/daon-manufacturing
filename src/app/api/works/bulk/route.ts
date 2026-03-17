import { NextRequest, NextResponse } from 'next/server';
import { getUpdatedBy } from '@/lib/api-util';
import { getUpdatedByFromAuth } from '@/lib/auth-server';
import { registerWorksFromFile } from '@/lib/bulk-register-works';

/** 작업 일괄 등록: multipart/form-data file (엑셀/CSV) */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: '엑셀 또는 CSV 파일을 첨부해 주세요.' },
        { status: 400 }
      );
    }
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { error: '파일 데이터를 읽을 수 없습니다.' },
        { status: 400 }
      );
    }
    const file = formData.get('file') ?? formData.get('files');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'file 필드에 엑셀/CSV 파일을 첨부해 주세요.' },
        { status: 400 }
      );
    }
    const name = (file.name || '').toLowerCase();
    const isCsv = name.endsWith('.csv') || file.type === 'text/csv';
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');
    if (!isCsv && !isExcel) {
      return NextResponse.json(
        { error: 'CSV 또는 엑셀(.xlsx, .xls) 파일만 등록할 수 있습니다.' },
        { status: 400 }
      );
    }
    const updatedBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(req);
    const result = await registerWorksFromFile(file, updatedBy);
    if (result.errorMessage) {
      return NextResponse.json(
        { success: result.success, error: result.errorMessage },
        { status: 200 }
      );
    }
    return NextResponse.json({ success: result.success });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '일괄 등록 중 오류가 발생했습니다.';
    console.error('[works/bulk]', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
