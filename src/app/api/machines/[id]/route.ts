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
    const machineRows = await query<unknown[]>(
      `SELECT m.*, f.name AS factory_name FROM machine m
       JOIN factory f ON f.id = m.factory_id
       WHERE m.id = ? AND m.deleted_yn = 'N'`,
      [id]
    );
    if (!Array.isArray(machineRows) || !machineRows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const [opSteps, requiredPartIds, workList, processList] = await Promise.all([
      query<unknown[]>(
        `SELECT mos.*, (SELECT GROUP_CONCAT(part_id) FROM machine_operation_step_part WHERE operation_step_id = mos.id) AS part_ids
         FROM machine_operation_step mos WHERE mos.machine_id = ? ORDER BY mos.step_order`,
        [id]
      ),
      query<{ part_id: number }[]>(
        'SELECT part_id FROM machine_required_part WHERE machine_id = ?',
        [id]
      ),
      query<{ work_id: number; work_name: string }[]>(
        `SELECT w.id AS work_id, w.name AS work_name FROM work w
         JOIN work_machine wm ON wm.work_id = w.id WHERE wm.machine_id = ? AND w.deleted_yn = 'N'`,
        [id]
      ),
      query<{ process_id: number; process_name: string }[]>(
        `SELECT DISTINCT p.id AS process_id, p.process_name FROM process p
         JOIN process_step ps ON ps.process_id = p.id
         JOIN work_machine wm ON wm.work_id = ps.work_id AND wm.machine_id = ?
         WHERE p.deleted_yn = 'N'`,
        [id]
      ),
    ]);
    type StepRow = { part_ids?: string } & Record<string, unknown>;
    const opStepsArr: StepRow[] = Array.isArray(opSteps) ? (opSteps as StepRow[]) : [];
    const requiredPartIdsArr = Array.isArray(requiredPartIds) ? requiredPartIds : [];
    const workListArr = Array.isArray(workList) ? workList : [];
    const processListArr = Array.isArray(processList) ? processList : [];
    return NextResponse.json({
      ...(machineRows[0] as object),
      operation_steps: opStepsArr.map((s) => ({
        ...s,
        part_ids: s.part_ids ? s.part_ids.split(',').map(Number) : [],
      })),
      required_part_ids: requiredPartIdsArr.map((r) => r.part_id),
      used_works: workListArr,
      used_processes: processListArr,
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
      `UPDATE machine SET factory_id=?, name=?, total_duration_sec=?, photo_url=?, description=?, manufacturer=?, as_contact=?, as_phone=?, introduced_at=?, location_in_factory=?, updated_by=?
       WHERE id = ? AND deleted_yn = 'N'`,
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
        id,
      ]
    );
    await query(
      'DELETE FROM machine_operation_step_part WHERE operation_step_id IN (SELECT id FROM machine_operation_step WHERE machine_id = ?)',
      [id]
    );
    await query('DELETE FROM machine_operation_step WHERE machine_id = ?', [id]);
    await query('DELETE FROM machine_required_part WHERE machine_id = ?', [id]);

    if (Array.isArray(operation_steps) && operation_steps.length > 0) {
      for (let i = 0; i < operation_steps.length; i++) {
        const s = operation_steps[i];
        await query(
          `INSERT INTO machine_operation_step (machine_id, step_order, step_name, duration_min, description)
           VALUES (?, ?, ?, ?, ?)`,
          [
            id,
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
    if (Array.isArray(required_part_ids)) {
      for (const pid of required_part_ids) {
        await query(
          'INSERT INTO machine_required_part (machine_id, part_id) VALUES (?, ?)',
          [id, Number(pid)]
        );
      }
    }
    const rows = await query<unknown[]>(
      'SELECT * FROM machine WHERE id = ?',
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
    const refs: string[] = [];
    const workMachineCountRows = await query<{ cnt: number }[]>(
      'SELECT COUNT(*) AS cnt FROM work_machine WHERE machine_id = ?',
      [id]
    );
    if (Array.isArray(workMachineCountRows) && workMachineCountRows[0]?.cnt) {
      refs.push(`작업 ${workMachineCountRows[0].cnt}건`);
    }
    const stepMachineCountRows = await query<{ cnt: number }[]>(
      `SELECT COUNT(*) AS cnt FROM work_step_machine WHERE machine_id = ?`,
      [id]
    );
    if (Array.isArray(stepMachineCountRows) && stepMachineCountRows[0]?.cnt) {
      refs.push(`작업 단계 ${stepMachineCountRows[0].cnt}건`);
    }
    const used = refs.slice(0, MAX_DELETE_REFERENCES);
    if (used.length > 0) {
      return NextResponse.json(
        {
          error: '삭제할 수 없습니다. 사용 중인 항목이 있습니다.',
          used,
        },
        { status: 400 }
      );
    }
    const updatedBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(_req);
    await query(
      'UPDATE machine SET deleted_yn = \'Y\', updated_at = NOW(), updated_by = ? WHERE id = ?',
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
