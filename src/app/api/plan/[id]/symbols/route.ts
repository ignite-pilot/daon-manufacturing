import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { query } from '@/lib/db';
import { getUpdatedBy } from '@/lib/api-util';
import { getUpdatedByFromAuth } from '@/lib/auth-server';

type RouteContext = { params: Promise<{ id: string }> };

interface PlanRow { metadata_file_path: string | null }
interface OverrideRow {
  id: number;
  handle: string;
  category: string;
  description: string | null;
  center_x: number | null;
  center_y: number | null;
  width: number | null;
  height: number | null;
  legend: string | null;
  annotation_id: number | null;
  work_id: number | null;
  updated_at: string;
  updated_by: string | null;
}


// ── S3/MinIO ──────────────────────────────────────────────────────────────────
const REGION           = process.env.AWS_REGION       || 'ap-northeast-2';
const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT;
const BUCKET           = process.env.STORAGE_BUCKET   || 'daon-mfg-local';
const APP_PREFIX       = 'daon-manufacturing';

function getS3Client(): S3Client {
  if (STORAGE_ENDPOINT) {
    return new S3Client({
      region: REGION,
      endpoint: STORAGE_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId:     process.env.STORAGE_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.STORAGE_SECRET_KEY || 'minioadmin',
      },
    });
  }
  return new S3Client({ region: REGION });
}

function keyFromUrl(storedUrl: string): string | null {
  try {
    const u       = new URL(storedUrl);
    let   pathname = u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname;
    if (STORAGE_ENDPOINT) {
      const prefix = BUCKET + '/';
      if (pathname.startsWith(prefix)) pathname = pathname.slice(prefix.length);
    }
    if (!pathname || !pathname.startsWith(APP_PREFIX + '/')) return null;
    return pathname;
  } catch {
    return null;
  }
}

async function fetchFromStorage(storedUrl: string | null | undefined): Promise<string | null> {
  if (!storedUrl) return null;
  const key = keyFromUrl(storedUrl);
  if (!key) return null;
  try {
    const client = getS3Client();
    const resp   = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    if (!resp.Body) return null;
    const chunks: Uint8Array[] = [];
    for await (const chunk of resp.Body as AsyncIterable<Uint8Array>) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf-8');
  } catch {
    return null;
  }
}

// ── GET /api/plan/:id/symbols ─────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    // 1. plan 존재 확인 + metadata_file_path 조회
    const planRows = await query<PlanRow[]>(
      `SELECT metadata_file_path FROM plan WHERE id = ? AND deleted_yn = 'N'`,
      [id]
    );
    if (!Array.isArray(planRows) || !planRows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const { metadata_file_path } = planRows[0];

    // 2. 오버라이드 목록 조회
    const overrides = await query<OverrideRow[]>(
      `SELECT id, handle, category, description,
              center_x, center_y, width, height,
              legend, annotation_id, work_id, updated_at, updated_by
       FROM plan_symbol_overrides
       WHERE plan_id = ?
       ORDER BY id ASC`,
      [id]
    );

    // 3. metadata.json에서 facilityLegend·annotations 추출
    let facilityLegend: unknown[] = [];
    let annotations: unknown[]   = [];

    const metaText = await fetchFromStorage(metadata_file_path);
    if (metaText) {
      try {
        const raw = JSON.parse(metaText);
        // Python 분석 스크립트는 facility_legend(snake_case)로 저장
        if (Array.isArray(raw.facility_legend)) facilityLegend = raw.facility_legend;
        else if (Array.isArray(raw.facilityLegend)) facilityLegend = raw.facilityLegend;
        if (Array.isArray(raw.annotations)) annotations = raw.annotations;
      } catch {
        // metadata.json 파싱 실패 → 빈 배열 유지
      }
    }

    return NextResponse.json({
      symbols: Array.isArray(overrides) ? overrides : [],
      facilityLegend,
      annotations,
    });
  } catch (e) {
    console.error('[GET /api/plan/[id]/symbols]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ── PUT /api/plan/:id/symbols ─────────────────────────────────────────────────
// body: { handle, category, description?, center_x?, center_y?, width?, height?, legend?, annotation_id? }
// handle + plan_id 기준 upsert
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    // plan 존재 확인
    const planRows = await query<{ id: number }[]>(
      `SELECT id FROM plan WHERE id = ? AND deleted_yn = 'N'`,
      [id]
    );
    if (!Array.isArray(planRows) || !planRows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const { handle, category, description, center_x, center_y, width, height, legend, annotation_id, work_id } = body;

    if (!handle || typeof handle !== 'string') {
      return NextResponse.json({ error: 'handle 은 필수입니다.' }, { status: 400 });
    }
    const VALID_CATEGORIES = ['STATION', 'CONVEYOR', 'BUFFER', 'FOOTPATH', 'UNDEFINED'];
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `category 는 ${VALID_CATEGORIES.join('|')} 중 하나여야 합니다.` }, { status: 400 });
    }

    const updatedBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(req);

    await query(
      `INSERT INTO plan_symbol_overrides
         (plan_id, handle, category, description, center_x, center_y, width, height, legend, annotation_id, work_id, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         category      = VALUES(category),
         description   = VALUES(description),
         center_x      = VALUES(center_x),
         center_y      = VALUES(center_y),
         width         = VALUES(width),
         height        = VALUES(height),
         legend        = VALUES(legend),
         annotation_id = VALUES(annotation_id),
         work_id       = VALUES(work_id),
         updated_by    = VALUES(updated_by)`,
      [
        id,
        handle.trim(),
        category,
        description != null ? String(description) : null,
        center_x   != null ? Number(center_x)     : null,
        center_y   != null ? Number(center_y)      : null,
        width      != null ? Number(width)         : null,
        height     != null ? Number(height)        : null,
        legend     != null ? String(legend)        : null,
        annotation_id != null ? Number(annotation_id) : null,
        work_id    != null ? Number(work_id)       : null,
        updatedBy,
      ]
    );

    // upsert 후 저장된 row 반환
    const rows = await query<OverrideRow[]>(
      `SELECT id, handle, category, description,
              center_x, center_y, width, height,
              legend, annotation_id, work_id, updated_at, updated_by
       FROM plan_symbol_overrides
       WHERE plan_id = ? AND handle = ?`,
      [id, handle.trim()]
    );
    return NextResponse.json(Array.isArray(rows) && rows[0] ? rows[0] : {});
  } catch (e) {
    console.error('[PUT /api/plan/[id]/symbols]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ── DELETE /api/plan/:id/symbols?handle=XXX ───────────────────────────────────
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const handle = req.nextUrl.searchParams.get('handle');
    if (!handle) {
      return NextResponse.json({ error: 'handle 쿼리 파라미터가 필요합니다.' }, { status: 400 });
    }

    const result = await query<{ affectedRows: number }>(
      `DELETE FROM plan_symbol_overrides WHERE plan_id = ? AND handle = ?`,
      [id, handle]
    );
    const affected = (result as unknown as { affectedRows: number })?.affectedRows ?? 0;
    if (affected === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[DELETE /api/plan/[id]/symbols]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
