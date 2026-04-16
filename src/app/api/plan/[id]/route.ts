import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUpdatedBy } from '@/lib/api-util';
import { getUpdatedByFromAuth } from '@/lib/auth-server';
import { Plan } from '@/types';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const rows = await query<Plan[]>(
      `SELECT p.*, f.name AS factory_name
       FROM plan p
       LEFT JOIN factory f ON f.id = p.factory_id
       WHERE p.id = ? AND p.deleted_yn = 'N'`,
      [id]
    );
    if (!Array.isArray(rows) || !rows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (e) {
    console.error('[GET /api/plan/[id]]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, factory_id } = body;

    if (!name) {
      return NextResponse.json({ error: 'name 은 필수입니다.' }, { status: 400 });
    }

    const existing = await query<Plan[]>(
      "SELECT id FROM plan WHERE id = ? AND deleted_yn = 'N'",
      [id]
    );
    if (!Array.isArray(existing) || !existing[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updatedBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(req);
    await query(
      `UPDATE plan
       SET name = ?, factory_id = ?, version = version + 1, updated_by = ?
       WHERE id = ? AND deleted_yn = 'N'`,
      [
        String(name).trim(),
        factory_id != null ? Number(factory_id) : null,
        updatedBy,
        id,
      ]
    );

    const rows = await query<Plan[]>(
      `SELECT p.*, f.name AS factory_name
       FROM plan p LEFT JOIN factory f ON f.id = p.factory_id
       WHERE p.id = ?`,
      [id]
    );
    return NextResponse.json(Array.isArray(rows) && rows[0] ? rows[0] : {});
  } catch (e) {
    console.error('[PUT /api/plan/[id]]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const existing = await query<Plan[]>(
      "SELECT id, name FROM plan WHERE id = ? AND deleted_yn = 'N'",
      [id]
    );
    if (!Array.isArray(existing) || !existing[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updatedBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(req);
    await query(
      "UPDATE plan SET deleted_yn = 'Y', updated_at = NOW(), updated_by = ? WHERE id = ?",
      [updatedBy, id]
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[DELETE /api/plan/[id]]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
