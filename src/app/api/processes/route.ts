import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getPagination, getUpdatedBy } from '@/lib/api-util';
import { getUpdatedByFromAuth } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  try {
    const { page, pageSize, offset } = getPagination(req);
    const limit = Math.max(0, Math.min(100, Math.floor(Number(pageSize))));
    const offsetVal = Math.max(0, Math.floor(Number(offset)));
    const factoryId = req.nextUrl.searchParams.get('factoryId')?.trim() || '';
    const productName = req.nextUrl.searchParams.get('productName')?.trim() || '';
    const processName = req.nextUrl.searchParams.get('processName')?.trim() || '';

    let where = "p.deleted_yn = 'N'";
    const params: (string | number)[] = [];
    if (factoryId) {
      where += ' AND p.factory_id = ?';
      params.push(Number(factoryId));
    }
    if (productName) {
      where += ' AND p.product_name LIKE ?';
      params.push(`%${productName}%`);
    }
    if (processName) {
      where += ' AND p.process_name LIKE ?';
      params.push(`%${processName}%`);
    }

    const rows = await query<unknown[]>(
      `SELECT p.id, p.factory_id, p.product_name, p.process_name, p.total_duration_sec, p.description,
              p.updated_at, p.updated_by, f.name AS factory_name,
              (SELECT COUNT(*) FROM process_step ps WHERE ps.process_id = p.id) AS step_count
       FROM process p
       JOIN factory f ON f.id = p.factory_id AND f.deleted_yn = 'N'
       WHERE ${where}
       ORDER BY p.id DESC
       LIMIT ${limit} OFFSET ${offsetVal}`,
      params
    );
    const countRows = await query<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM process p JOIN factory f ON f.id = p.factory_id AND f.deleted_yn = 'N' WHERE ${where}`,
      params
    );
    const total = (Array.isArray(countRows) && countRows[0]) ? countRows[0].total : 0;
    return NextResponse.json({ items: Array.isArray(rows) ? rows : [], total, page, pageSize });
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Unknown error');
    const msg = err.message || 'Unknown error';
    if (
      msg.includes('Database not configured') ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('Access denied') ||
      msg.includes('connect')
    ) {
      const { page, pageSize } = getPagination(req);
      return NextResponse.json({
        items: [],
        total: 0,
        page,
        pageSize,
      });
    }
    console.error('[GET /api/processes]', err);
    const isDbError =
      msg.includes('ECONNREFUSED') ||
      msg.includes('Access denied') ||
      msg.includes('ER_') ||
      msg.includes('connect');
    return NextResponse.json(
      { error: msg, code: isDbError ? 'DATABASE_ERROR' : undefined },
      { status: isDbError ? 503 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      factory_id,
      product_name,
      process_name,
      total_duration_sec,
      description,
      steps,
    } = body;
    if (
      factory_id == null ||
      !product_name ||
      !process_name ||
      total_duration_sec == null
    ) {
      return NextResponse.json(
        { error: 'factory_id, product_name, process_name, total_duration_sec are required' },
        { status: 400 }
      );
    }
    const updatedBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(req);
    await query(
      `INSERT INTO process (factory_id, product_name, process_name, total_duration_sec, description, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Number(factory_id),
        String(product_name).trim(),
        String(process_name).trim(),
        Number(total_duration_sec),
        description != null ? String(description).trim() : null,
        updatedBy,
      ]
    );
    const inserted = await query<{ id: number }[]>(
      'SELECT LAST_INSERT_ID() AS id'
    );
    const processId = Array.isArray(inserted) && inserted[0] ? inserted[0].id : undefined;
    if (processId != null && Array.isArray(steps) && steps.length > 0) {
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        const workId = s.work_id != null && s.work_id !== '' ? Number(s.work_id) : null;
        const durationSec = s.actual_duration_sec != null ? Math.max(0, Math.floor(Number(s.actual_duration_sec))) : null;
        await query(
          `INSERT INTO process_step (process_id, work_id, step_order, actual_duration_min, description)
           VALUES (?, ?, ?, ?, ?)`,
          [
            processId,
            workId,
            i + 1,
            durationSec,
            s.description != null ? String(s.description).trim() : null,
          ]
        );
      }
    }
    if (processId == null) return NextResponse.json({});
    const rows = await query<unknown[]>(
      'SELECT * FROM process WHERE id = ?',
      [processId]
    );
    return NextResponse.json(Array.isArray(rows) && rows[0] ? rows[0] : {});
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Unknown error');
    console.error('[POST /api/processes]', err);
    const msg = err.message || 'Unknown error';
    const isDbError =
      msg.includes('ECONNREFUSED') ||
      msg.includes('Access denied') ||
      msg.includes('ER_') ||
      msg.includes('connect');
    return NextResponse.json(
      { error: msg, code: isDbError ? 'DATABASE_ERROR' : undefined },
      { status: isDbError ? 503 : 500 }
    );
  }
}
