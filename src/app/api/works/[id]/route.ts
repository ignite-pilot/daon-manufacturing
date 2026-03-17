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
    const workRows = await query<unknown[]>(
      'SELECT * FROM work WHERE id = ? AND deleted_yn = \'N\'',
      [id]
    );
    if (!Array.isArray(workRows) || !workRows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const [partIds, machineIds, steps, processList] = await Promise.all([
      query<{ part_id: number }[]>(
        'SELECT part_id FROM work_part WHERE work_id = ?',
        [id]
      ),
      query<{ machine_id: number }[]>(
        'SELECT machine_id FROM work_machine WHERE work_id = ?',
        [id]
      ),
      query<unknown[]>(
        `SELECT ws.*,
          (SELECT GROUP_CONCAT(part_id) FROM work_step_part WHERE work_step_id = ws.id) AS part_ids,
          (SELECT GROUP_CONCAT(machine_id) FROM work_step_machine WHERE work_step_id = ws.id) AS machine_ids
         FROM work_step ws WHERE ws.work_id = ? ORDER BY ws.step_order`,
        [id]
      ),
      query<{ process_id: number; process_name: string }[]>(
        `SELECT DISTINCT p.id AS process_id, p.process_name FROM process p
         JOIN process_step ps ON ps.process_id = p.id WHERE ps.work_id = ? AND p.deleted_yn = 'N'`,
        [id]
      ),
    ]);
    const partIdsArr = Array.isArray(partIds) ? partIds : [];
    const machineIdsArr = Array.isArray(machineIds) ? machineIds : [];
    type StepRow = { part_ids?: string; machine_ids?: string } & Record<string, unknown>;
    const stepsArr: StepRow[] = Array.isArray(steps) ? (steps as StepRow[]) : [];
    const processListArr = Array.isArray(processList) ? processList : [];
    return NextResponse.json({
      ...(workRows[0] as object),
      part_ids: partIdsArr.map((r) => r.part_id),
      machine_ids: machineIdsArr.map((r) => r.machine_id),
      steps: stepsArr.map((s) => ({
        ...s,
        part_ids: s.part_ids ? s.part_ids.split(',').map(Number) : [],
        machine_ids: s.machine_ids ? s.machine_ids.split(',').map(Number) : [],
      })),
      applied_processes: processListArr,
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
      name,
      estimated_duration_sec,
      work_type,
      part_ids,
      machine_ids,
      steps,
    } = body;
    if (!name || estimated_duration_sec == null || !work_type) {
      return NextResponse.json(
        { error: 'name, estimated_duration_sec, work_type are required' },
        { status: 400 }
      );
    }
    const updatedBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(req);
    await query(
      `UPDATE work SET name=?, estimated_duration_sec=?, work_type=?, updated_by=?
       WHERE id = ? AND deleted_yn = 'N'`,
      [
        String(name).trim(),
        Number(estimated_duration_sec),
        String(work_type).trim(),
        updatedBy,
        id,
      ]
    );
    await query('DELETE FROM work_part WHERE work_id = ?', [id]);
    await query('DELETE FROM work_machine WHERE work_id = ?', [id]);
    const existingSteps = await query<{ id: number }[]>(
      'SELECT id FROM work_step WHERE work_id = ?',
      [id]
    );
    const existingStepsArr = Array.isArray(existingSteps) ? existingSteps : [];
    for (const row of existingStepsArr) {
      await query('DELETE FROM work_step_part WHERE work_step_id = ?', [row.id]);
      await query('DELETE FROM work_step_machine WHERE work_step_id = ?', [row.id]);
    }
    await query('DELETE FROM work_step WHERE work_id = ?', [id]);

    if (Array.isArray(part_ids)) {
      for (const pid of part_ids) {
        await query('INSERT INTO work_part (work_id, part_id) VALUES (?, ?)', [
          id,
          Number(pid),
        ]);
      }
    }
    if (Array.isArray(machine_ids)) {
      for (const mid of machine_ids) {
        await query('INSERT INTO work_machine (work_id, machine_id) VALUES (?, ?)', [
          id,
          Number(mid),
        ]);
      }
    }
    if (Array.isArray(steps) && steps.length > 0) {
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await query(
          `INSERT INTO work_step (work_id, step_order, step_name, duration_min, description)
           VALUES (?, ?, ?, ?, ?)`,
          [
            id,
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
    const rows = await query<unknown[]>(
      'SELECT * FROM work WHERE id = ?',
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
    const processStepCountRows = await query<{ cnt: number }[]>(
      'SELECT COUNT(*) AS cnt FROM process_step WHERE work_id = ?',
      [id]
    );
    const processStepCount = Array.isArray(processStepCountRows) && processStepCountRows[0] ? processStepCountRows[0].cnt : 0;
    if (processStepCount) {
      refs.push(`공정 단계 ${processStepCount}건`);
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
      'UPDATE work SET deleted_yn = \'Y\', updated_at = NOW(), updated_by = ? WHERE id = ?',
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
