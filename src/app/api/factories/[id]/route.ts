import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUpdatedBy } from '@/lib/api-util';
import { getUpdatedByFromAuth } from '@/lib/auth-server';
import { Factory } from '@/types';
import { MAX_DELETE_REFERENCES } from '@/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await query<Factory[]>(
      'SELECT * FROM factory WHERE id = ? AND deleted_yn = \'N\'',
      [id]
    );
    if (!Array.isArray(rows) || !rows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
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
    const { name, zip_code, address, address_detail, description, area, cad_file_path } = body;
    if (!name || !address) {
      return NextResponse.json(
        { error: 'name, address are required' },
        { status: 400 }
      );
    }
    const updatedBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(req);
    await query(
      `UPDATE factory SET name=?, zip_code=?, address=?, address_detail=?, description=?, area=?, cad_file_path=?, updated_by=?
       WHERE id = ? AND deleted_yn = 'N'`,
      [
        String(name).trim(),
        zip_code != null ? String(zip_code).trim() || null : null,
        String(address).trim(),
        address_detail != null ? String(address_detail).trim() || null : null,
        description != null ? String(description).trim() : null,
        area != null ? Number(area) : null,
        cad_file_path != null ? String(cad_file_path).trim() : null,
        updatedBy,
        id,
      ]
    );
    const rows = await query<Factory[]>(
      'SELECT * FROM factory WHERE id = ?',
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

    const processCountRows = await query<{ cnt: number }[]>(
      'SELECT COUNT(*) AS cnt FROM process WHERE factory_id = ? AND deleted_yn = \'N\'',
      [id]
    );
    if (Array.isArray(processCountRows) && processCountRows[0]?.cnt) refs.push(`공정 ${processCountRows[0].cnt}건`);

    const machineCountRows = await query<{ cnt: number }[]>(
      'SELECT COUNT(*) AS cnt FROM machine WHERE factory_id = ? AND deleted_yn = \'N\'',
      [id]
    );
    if (Array.isArray(machineCountRows) && machineCountRows[0]?.cnt) refs.push(`기계 ${machineCountRows[0].cnt}건`);

    const partCountRows = await query<{ cnt: number }[]>(
      'SELECT COUNT(*) AS cnt FROM part WHERE factory_id = ? AND deleted_yn = \'N\'',
      [id]
    );
    if (Array.isArray(partCountRows) && partCountRows[0]?.cnt) refs.push(`부품 ${partCountRows[0].cnt}건`);

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
      'UPDATE factory SET deleted_yn = \'Y\', updated_at = NOW(), updated_by = ? WHERE id = ?',
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
