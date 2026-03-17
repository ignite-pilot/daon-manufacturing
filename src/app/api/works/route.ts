import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getPagination, getUpdatedBy } from '@/lib/api-util';
import { getUpdatedByFromAuth } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  try {
    const { page, pageSize, offset } = getPagination(req);
    const limit = Math.max(0, Math.min(100, Math.floor(Number(pageSize))));
    const offsetVal = Math.max(0, Math.floor(Number(offset)));
    const workName = req.nextUrl.searchParams.get('workName')?.trim() || '';
    const processId = req.nextUrl.searchParams.get('processId')?.trim() || '';

    let where = "w.deleted_yn = 'N'";
    const params: (string | number)[] = [];
    if (workName) {
      where += ' AND w.name LIKE ?';
      params.push(`%${workName}%`);
    }
    if (processId) {
      where += ' AND EXISTS (SELECT 1 FROM process_step ps WHERE ps.work_id = w.id AND ps.process_id = ?)';
      params.push(processId);
    }

    const rows = await query<unknown[]>(
      `SELECT w.id, w.name, w.estimated_duration_sec, w.work_type, w.updated_at, w.updated_by
       FROM work w
       WHERE ${where}
       ORDER BY w.id DESC
       LIMIT ${limit} OFFSET ${offsetVal}`,
      params
    );
    const countRows = await query<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM work w WHERE ${where}`,
      params
    );
    const total = (Array.isArray(countRows) && countRows[0]) ? countRows[0].total : 0;
    return NextResponse.json({ items: Array.isArray(rows) ? rows : [], total, page, pageSize });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
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
    console.error(e);
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      estimated_duration_sec,
      work_type,
      description,
      part_ids,
      machine_ids,
      steps,
    } = body;
    if (
      !name ||
      estimated_duration_sec == null ||
      !work_type
    ) {
      return NextResponse.json(
        { error: 'name, estimated_duration_sec, work_type are required' },
        { status: 400 }
      );
    }
    const updatedBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(req);
    await query(
      `INSERT INTO work (name, estimated_duration_sec, work_type, updated_by)
       VALUES (?, ?, ?, ?)`,
      [
        String(name).trim(),
        Number(estimated_duration_sec),
        String(work_type).trim(),
        updatedBy,
      ]
    );
    const inserted = await query<{ id: number }[]>(
      'SELECT LAST_INSERT_ID() AS id'
    );
    const workId = Array.isArray(inserted) && inserted[0] ? inserted[0].id : undefined;
    if (workId != null && Array.isArray(part_ids)) {
      for (const pid of part_ids) {
        await query('INSERT INTO work_part (work_id, part_id) VALUES (?, ?)', [
          workId,
          Number(pid),
        ]);
      }
    }
    if (workId != null && Array.isArray(machine_ids)) {
      for (const mid of machine_ids) {
        await query('INSERT INTO work_machine (work_id, machine_id) VALUES (?, ?)', [
          workId,
          Number(mid),
        ]);
      }
    }
    if (workId != null && Array.isArray(steps) && steps.length > 0) {
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await query(
          `INSERT INTO work_step (work_id, step_order, step_name, duration_min, description)
           VALUES (?, ?, ?, ?, ?)`,
          [
            workId,
            i + 1,
            String(s.step_name || '').trim(),
            s.duration_min != null ? Number(s.duration_min) : 0,
            s.description != null ? String(s.description).trim() : null,
          ]
        );
        const stepRow = await query<{ id: number }[]>(
          'SELECT LAST_INSERT_ID() AS id'
        );
        const stepId = Array.isArray(stepRow) && stepRow[0] ? stepRow[0].id : undefined;
        if (stepId && Array.isArray(s.part_ids)) {
          for (const pid of s.part_ids) {
            await query(
              'INSERT INTO work_step_part (work_step_id, part_id) VALUES (?, ?)',
              [stepId, Number(pid)]
            );
          }
        }
        if (stepId && Array.isArray(s.machine_ids)) {
          for (const mid of s.machine_ids) {
            await query(
              'INSERT INTO work_step_machine (work_step_id, machine_id) VALUES (?, ?)',
              [stepId, Number(mid)]
            );
          }
        }
      }
    }
    if (workId == null) return NextResponse.json({});
    const rows = await query<unknown[]>(
      'SELECT * FROM work WHERE id = ?',
      [workId]
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
