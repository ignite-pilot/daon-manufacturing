import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getPagination, getUpdatedBy } from '@/lib/api-util';
import { getUpdatedByFromAuth } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  try {
    const { page, pageSize, offset } = getPagination(req);
    const limit = Math.max(0, Math.min(100, Math.floor(Number(pageSize))));
    const offsetVal = Math.max(0, Math.floor(Number(offset)));
    const machineName = req.nextUrl.searchParams.get('machineName')?.trim() || '';
    const processId = req.nextUrl.searchParams.get('processId')?.trim() || '';
    const workId = req.nextUrl.searchParams.get('workId')?.trim() || '';

    let where = "m.deleted_yn = 'N'";
    const params: (string | number)[] = [];
    if (machineName) {
      where += ' AND m.name LIKE ?';
      params.push(`%${machineName}%`);
    }
    if (processId) {
      where += ` AND EXISTS (
        SELECT 1 FROM process_step ps
        JOIN work_machine wm ON wm.work_id = ps.work_id AND wm.machine_id = m.id
        WHERE ps.process_id = ?
      )`;
      params.push(processId);
    }
    if (workId) {
      where += ' AND EXISTS (SELECT 1 FROM work_machine wm WHERE wm.machine_id = m.id AND wm.work_id = ?)';
      params.push(workId);
    }

    const rows = await query<unknown[]>(
      `SELECT m.id, m.factory_id, m.name, m.total_duration_sec, m.photo_url, m.introduced_at, m.updated_at, m.updated_by,
              f.name AS factory_name
       FROM machine m
       JOIN factory f ON f.id = m.factory_id AND f.deleted_yn = 'N'
       WHERE ${where}
       ORDER BY m.id DESC
       LIMIT ${limit} OFFSET ${offsetVal}`,
      params
    );
    const countRows = await query<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM machine m JOIN factory f ON f.id = m.factory_id AND f.deleted_yn = 'N' WHERE ${where}`,
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
      factory_id,
      name,
      total_duration_sec,
      photo_url,
      description,
      manufacturer,
      as_contact,
      as_phone,
      introduced_at,
      location_in_factory,
      operation_steps,
      required_part_ids,
    } = body;
    if (factory_id == null || !name) {
      return NextResponse.json(
        { error: 'factory_id, name are required' },
        { status: 400 }
      );
    }
    const updatedBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(req);
    await query(
      `INSERT INTO machine (factory_id, name, total_duration_sec, photo_url, description, manufacturer, as_contact, as_phone, introduced_at, location_in_factory, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(factory_id),
        String(name).trim(),
        total_duration_sec != null ? Number(total_duration_sec) : null,
        photo_url != null ? String(photo_url).trim() : null,
        description != null ? String(description).trim() : null,
        manufacturer != null ? String(manufacturer).trim() : null,
        as_contact != null ? String(as_contact).trim() : null,
        as_phone != null ? String(as_phone).trim() : null,
        introduced_at != null ? (typeof introduced_at === 'string' ? introduced_at : new Date(introduced_at).toISOString().slice(0, 19).replace('T', ' ')) : null,
        location_in_factory != null ? String(location_in_factory).trim() : null,
        updatedBy,
      ]
    );
    const inserted = await query<{ id: number }[]>(
      'SELECT LAST_INSERT_ID() AS id'
    );
    const machineId = Array.isArray(inserted) && inserted[0] ? inserted[0].id : undefined;
    if (machineId != null && Array.isArray(operation_steps) && operation_steps.length > 0) {
      for (let i = 0; i < operation_steps.length; i++) {
        const s = operation_steps[i];
        await query(
          `INSERT INTO machine_operation_step (machine_id, step_order, step_name, duration_min, description)
           VALUES (?, ?, ?, ?, ?)`,
          [
            machineId,
            i + 1,
            String(s.step_name || '').trim(),
            s.duration_min != null ? Number(s.duration_min) : null,
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
              'INSERT INTO machine_operation_step_part (operation_step_id, part_id) VALUES (?, ?)',
              [stepId, Number(pid)]
            );
          }
        }
      }
    }
    if (machineId != null && Array.isArray(required_part_ids)) {
      for (const pid of required_part_ids) {
        await query(
          'INSERT INTO machine_required_part (machine_id, part_id) VALUES (?, ?)',
          [machineId, Number(pid)]
        );
      }
    }
    if (machineId == null) return NextResponse.json({});
    const rows = await query<unknown[]>(
      'SELECT * FROM machine WHERE id = ?',
      [machineId as number]
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
