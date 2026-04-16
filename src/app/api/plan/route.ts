import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getPagination, getUpdatedBy } from '@/lib/api-util';
import { getUpdatedByFromAuth } from '@/lib/auth-server';
import { Plan } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { page, pageSize, offset } = getPagination(req);
    const limit = Math.max(0, Math.min(100, pageSize));

    const name = req.nextUrl.searchParams.get('name')?.trim() || '';
    const factoryId = req.nextUrl.searchParams.get('factoryId')?.trim() || '';
    const status = req.nextUrl.searchParams.get('status')?.trim() || '';

    const conditions: string[] = ["p.deleted_yn = 'N'"];
    const params: unknown[] = [];

    if (name) {
      conditions.push('p.name LIKE ?');
      params.push(`%${name}%`);
    }
    if (factoryId) {
      conditions.push('p.factory_id = ?');
      params.push(Number(factoryId));
    }
    if (status) {
      conditions.push('p.analysis_status = ?');
      params.push(status.toUpperCase());
    }

    const where = conditions.join(' AND ');

    const rows = await query<Plan[]>(
      `SELECT p.id, p.name, p.version, p.factory_id, f.name AS factory_name,
              p.original_file_name, p.original_file_format, p.original_file_path,
              p.svg_file_path, p.metadata_file_path,
              p.analysis_result_file_path, p.analysis_notes_file_path,
              p.additional_instructions, p.analysis_status, p.analysis_error,
              p.deleted_yn, p.created_at, p.updated_at, p.updated_by
       FROM plan p
       LEFT JOIN factory f ON f.id = p.factory_id
       WHERE ${where}
       ORDER BY p.id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    const countRows = await query<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM plan p WHERE ${where}`,
      params
    );
    const total = Array.isArray(countRows) && countRows[0] ? countRows[0].total : 0;

    return NextResponse.json({
      items: Array.isArray(rows) ? rows : [],
      total,
      page,
      pageSize,
    });
  } catch (e) {
    console.error('[GET /api/plan]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, factory_id, original_file_name, original_file_format, original_file_path } = body;

    if (!name || !original_file_name || !original_file_format || !original_file_path) {
      return NextResponse.json(
        { error: 'name, original_file_name, original_file_format, original_file_path 는 필수입니다.' },
        { status: 400 }
      );
    }

    const updatedBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(req);

    await query(
      `INSERT INTO plan
         (name, factory_id, original_file_name, original_file_format, original_file_path, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        String(name).trim(),
        factory_id != null ? Number(factory_id) : null,
        String(original_file_name).trim(),
        String(original_file_format).trim().toLowerCase(),
        String(original_file_path).trim(),
        updatedBy,
      ]
    );

    const inserted = await query<Plan[]>(
      `SELECT p.*, f.name AS factory_name
       FROM plan p LEFT JOIN factory f ON f.id = p.factory_id
       WHERE p.id = LAST_INSERT_ID()`
    );
    const plan = Array.isArray(inserted) && inserted[0] ? inserted[0] : null;

    // 업로드 감사 로그 기록 (정상 업로드)
    if (plan) {
      const fileSize = body.file_size != null ? Number(body.file_size) : null;
      const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null;
      await query(
        `INSERT INTO plan_upload_audit
           (plan_id, uploaded_by, ip_address, original_file_name, original_file_format, file_size)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          plan.id,
          updatedBy ?? 'unknown',
          ipAddress,
          String(original_file_name).trim(),
          String(original_file_format).trim().toLowerCase(),
          fileSize,
        ]
      ).catch((err) => console.error('[audit insert failed]', err));
    }

    return NextResponse.json(plan ?? {}, { status: 201 });
  } catch (e) {
    console.error('[POST /api/plan]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
