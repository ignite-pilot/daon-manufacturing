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
    const partRows = await query<unknown[]>(
      `SELECT p.*, f.name AS factory_name FROM part p
       JOIN factory f ON f.id = p.factory_id
       WHERE p.id = ? AND p.deleted_yn = 'N'`,
      [id]
    );
    if (!Array.isArray(partRows) || !partRows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const [workList, machineList, processList] = await Promise.all([
      query<{ work_id: number; work_name: string }[]>(
        `SELECT w.id AS work_id, w.name AS work_name FROM work w
         JOIN work_part wp ON wp.work_id = w.id WHERE wp.part_id = ? AND w.deleted_yn = 'N'`,
        [id]
      ),
      query<{ machine_id: number; machine_name: string }[]>(
        `SELECT m.id AS machine_id, m.name AS machine_name FROM machine m
         JOIN machine_required_part mrp ON mrp.machine_id = m.id WHERE mrp.part_id = ? AND m.deleted_yn = 'N'`,
        [id]
      ),
      query<{ process_id: number; process_name: string }[]>(
        `SELECT DISTINCT p.id AS process_id, p.process_name FROM process p
         JOIN process_step ps ON ps.process_id = p.id
         JOIN work_part wp ON wp.work_id = ps.work_id AND wp.part_id = ?
         WHERE p.deleted_yn = 'N'`,
        [id]
      ),
    ]);
    return NextResponse.json({
      ...(partRows[0] as object),
      used_works: Array.isArray(workList) ? workList : [],
      used_machines: Array.isArray(machineList) ? machineList : [],
      used_processes: Array.isArray(processList) ? processList : [],
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
      photo_url,
      description,
      manufacturer,
      as_contact,
      as_phone,
    } = body;
    if (factory_id == null || !name) {
      return NextResponse.json(
        { error: 'factory_id, name are required' },
        { status: 400 }
      );
    }
    const updatedBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(req);
    await query(
      `UPDATE part SET factory_id=?, name=?, photo_url=?, description=?, manufacturer=?, as_contact=?, as_phone=?, updated_by=?
       WHERE id = ? AND deleted_yn = 'N'`,
      [
        Number(factory_id),
        String(name).trim(),
        photo_url != null ? String(photo_url).trim() : null,
        description != null ? String(description).trim() : null,
        manufacturer != null ? String(manufacturer).trim() : null,
        as_contact != null ? String(as_contact).trim() : null,
        as_phone != null ? String(as_phone).trim() : null,
        updatedBy,
        id,
      ]
    );
    const rows = await query<unknown[]>(
      'SELECT * FROM part WHERE id = ?',
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
    const workPartCountRows = await query<{ cnt: number }[]>(
      'SELECT COUNT(*) AS cnt FROM work_part WHERE part_id = ?',
      [id]
    );
    if (Array.isArray(workPartCountRows) && workPartCountRows[0]?.cnt) refs.push(`작업 ${workPartCountRows[0].cnt}건`);
    const stepPartCountRows = await query<{ cnt: number }[]>(
      'SELECT COUNT(*) AS cnt FROM work_step_part WHERE part_id = ?',
      [id]
    );
    if (Array.isArray(stepPartCountRows) && stepPartCountRows[0]?.cnt) refs.push(`작업 단계 ${stepPartCountRows[0].cnt}건`);
    const machineReqCountRows = await query<{ cnt: number }[]>(
      'SELECT COUNT(*) AS cnt FROM machine_required_part WHERE part_id = ?',
      [id]
    );
    if (Array.isArray(machineReqCountRows) && machineReqCountRows[0]?.cnt) refs.push(`기계 필수부품 ${machineReqCountRows[0].cnt}건`);
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
      'UPDATE part SET deleted_yn = \'Y\', updated_at = NOW(), updated_by = ? WHERE id = ?',
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
