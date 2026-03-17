import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUpdatedBy } from '@/lib/api-util';
import { getUpdatedByFromAuth } from '@/lib/auth-server';
import { MAX_DELETE_REFERENCES } from '@/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [processRows, steps] = await Promise.all([
      query<unknown[]>(
        `SELECT p.*, f.name AS factory_name FROM process p
         JOIN factory f ON f.id = p.factory_id
         WHERE p.id = ? AND p.deleted_yn = 'N'`,
        [id]
      ),
      query<unknown[]>(
        `SELECT ps.*, w.name AS work_name FROM process_step ps
         LEFT JOIN work w ON w.id = ps.work_id
         WHERE ps.process_id = ? ORDER BY ps.step_order`,
        [id]
      ),
    ]);
    if (!Array.isArray(processRows) || !processRows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const stepsArr = (Array.isArray(steps) ? steps : []) as Record<string, unknown>[];
    // DB 컬럼명 actual_duration_min 이어도 값은 초 단위. 클라이언트에는 actual_duration_sec 로 전달
    const stepsForClient = stepsArr.map((s) => {
      const { actual_duration_min, ...rest } = s;
      return { ...rest, actual_duration_sec: actual_duration_min };
    });
    return NextResponse.json({
      ...(processRows[0] as object),
      steps: stepsForClient,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      `UPDATE process SET factory_id=?, product_name=?, process_name=?, total_duration_sec=?, description=?, updated_by=?
       WHERE id = ? AND deleted_yn = 'N'`,
      [
        Number(factory_id),
        String(product_name).trim(),
        String(process_name).trim(),
        Number(total_duration_sec),
        description != null ? String(description).trim() : null,
        updatedBy,
        id,
      ]
    );
    await query('DELETE FROM process_step WHERE process_id = ?', [id]);
    if (Array.isArray(steps) && steps.length > 0) {
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        const workId = s.work_id != null && s.work_id !== '' ? Number(s.work_id) : null;
        const durationSec = s.actual_duration_sec != null ? Math.max(0, Math.floor(Number(s.actual_duration_sec))) : null;
        await query(
          `INSERT INTO process_step (process_id, work_id, step_order, actual_duration_min, description)
           VALUES (?, ?, ?, ?, ?)`,
          [
            id,
            workId,
            i + 1,
            durationSec,
            s.description != null ? String(s.description).trim() : null,
          ]
        );
      }
    }
    const rows = await query<unknown[]>(
      'SELECT * FROM process WHERE id = ?',
      [id]
    );
    return NextResponse.json(Array.isArray(rows) && rows[0] ? rows[0] : {});
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updatedBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(_req);
    await query(
      'UPDATE process SET deleted_yn = \'Y\', updated_at = NOW(), updated_by = ? WHERE id = ?',
      [updatedBy, id]
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
