import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getPagination, getUpdatedBy } from '@/lib/api-util';
import { getUpdatedByFromAuth } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  try {
    const { page, pageSize, offset } = getPagination(req);
    const limit = Math.max(0, Math.min(100, Math.floor(Number(pageSize))));
    const offsetVal = Math.max(0, Math.floor(Number(offset)));
    const partName = req.nextUrl.searchParams.get('partName')?.trim() || '';
    const factoryId = req.nextUrl.searchParams.get('factoryId')?.trim() || '';
    const processId = req.nextUrl.searchParams.get('processId')?.trim() || '';
    const workId = req.nextUrl.searchParams.get('workId')?.trim() || '';

    let where = "p.deleted_yn = 'N'";
    const params: (string | number)[] = [];
    if (partName) {
      where += ' AND p.name LIKE ?';
      params.push(`%${partName}%`);
    }
    if (factoryId) {
      where += ' AND p.factory_id = ?';
      params.push(factoryId);
    }
    if (processId) {
      where += ` AND EXISTS (
        SELECT 1 FROM process_step ps
        JOIN work_part wp ON wp.work_id = ps.work_id AND wp.part_id = p.id
        WHERE ps.process_id = ?
      )`;
      params.push(processId);
    }
    if (workId) {
      where += ' AND EXISTS (SELECT 1 FROM work_part wp WHERE wp.part_id = p.id AND wp.work_id = ?)';
      params.push(workId);
    }

    const rows = await query<unknown[]>(
      `SELECT p.id, p.factory_id, p.name, p.photo_url, p.description, p.updated_at, p.updated_by,
              f.name AS factory_name
       FROM part p
       LEFT JOIN factory f ON f.id = p.factory_id AND f.deleted_yn = 'N'
       WHERE ${where}
       ORDER BY p.id DESC
       LIMIT ${limit} OFFSET ${offsetVal}`,
      params
    );
    const countRows = await query<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM part p
       LEFT JOIN factory f ON f.id = p.factory_id AND f.deleted_yn = 'N'
       WHERE ${where}`,
      params
    );
    const total = (Array.isArray(countRows) && countRows[0]) ? countRows[0].total : 0;
    return NextResponse.json({ items: Array.isArray(rows) ? rows : [], total, page, pageSize });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    if (msg.includes('Database not configured')) {
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
    const { factory_id, name, photo_url, description, manufacturer, as_contact, as_phone } = body;
    if (factory_id == null || !name) {
      return NextResponse.json(
        { error: 'factory_id, name are required' },
        { status: 400 }
      );
    }
    const updatedBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(req);
    await query(
      `INSERT INTO part (factory_id, name, photo_url, description, manufacturer, as_contact, as_phone, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(factory_id),
        String(name).trim(),
        photo_url != null ? String(photo_url).trim() : null,
        description != null ? String(description).trim() : null,
        manufacturer != null ? String(manufacturer).trim() : null,
        as_contact != null ? String(as_contact).trim() : null,
        as_phone != null ? String(as_phone).trim() : null,
        updatedBy,
      ]
    );
    const inserted = await query<unknown[]>(
      'SELECT * FROM part WHERE id = LAST_INSERT_ID()'
    );
    return NextResponse.json(Array.isArray(inserted) && inserted[0] ? inserted[0] : {});
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
