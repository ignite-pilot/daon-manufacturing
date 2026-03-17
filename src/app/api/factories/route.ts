import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getPagination, getUpdatedBy } from '@/lib/api-util';
import { getUpdatedByFromAuth } from '@/lib/auth-server';
import { Factory } from '@/types';

const FACTORY_TABLE = process.env.FACTORY_TABLE || 'factory';

export async function GET(req: NextRequest) {
  try {
    const { page, pageSize, offset } = getPagination(req);
    const limit = Math.max(0, Math.min(100, Math.floor(Number(pageSize))));
    const offsetVal = Math.max(0, Math.floor(Number(offset)));
    const rows = await query<unknown[]>(
      `SELECT id, name, zip_code, address, address_detail, description, area, cad_file_path, deleted_yn, created_at, updated_at, updated_by
       FROM \`${FACTORY_TABLE}\` WHERE COALESCE(deleted_yn, 'N') = 'N' ORDER BY id DESC LIMIT ${limit} OFFSET ${offsetVal}`
    );
    const countRows = await query<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM \`${FACTORY_TABLE}\` WHERE COALESCE(deleted_yn, 'N') = 'N'`
    );
    const total = (Array.isArray(countRows) && countRows[0]) ? countRows[0].total : 0;
    return NextResponse.json({
      items: (Array.isArray(rows) ? rows : []) as Factory[],
      total,
      page,
      pageSize,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
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
    const { name, zip_code, address, address_detail, description, area, cad_file_path } = body;
    if (!name || !address) {
      return NextResponse.json(
        { error: 'name, address are required' },
        { status: 400 }
      );
    }
    const updatedBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(req);
    await query(
      `INSERT INTO \`${FACTORY_TABLE}\` (name, zip_code, address, address_detail, description, area, cad_file_path, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(name).trim(),
        zip_code != null ? String(zip_code).trim() || null : null,
        String(address).trim(),
        address_detail != null ? String(address_detail).trim() || null : null,
        description != null ? String(description).trim() : null,
        area != null ? Number(area) : null,
        cad_file_path != null ? String(cad_file_path).trim() : null,
        updatedBy,
      ]
    );
    const inserted = await query<Factory[]>(
      `SELECT * FROM \`${FACTORY_TABLE}\` WHERE id = LAST_INSERT_ID()`
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
