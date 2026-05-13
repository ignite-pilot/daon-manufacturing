import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { query } from '@/lib/db';
import { extractSymbolBboxes } from '@/lib/svg-bbox';

type RouteContext = { params: Promise<{ id: string }> };

const REGION           = process.env.AWS_REGION       || 'ap-northeast-2';
const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT;
const BUCKET           = process.env.STORAGE_BUCKET   || 'daon-mfg-local';
const APP_PREFIX       = 'daon-manufacturing';

const SIM_CATEGORIES = new Set(['STATION', 'CONVEYOR', 'BUFFER', 'SOURCE', 'DRAIN']);

const PRIORITY: Record<string, number> = {
  SOURCE:   0,
  DRAIN:    0,
  STATION:  100,
  CONVEYOR: 150,
  BUFFER:   500,
};

interface PlanRow {
  svg_file_path: string | null;
}

interface SymbolRow {
  id: number;
  handle: string;
  category: string;
  legend: string | null;
  center_x: number | null;
  center_y: number | null;
  width: number | null;
  height: number | null;
  work_id: number | null;
  work_name: string | null;
  machines: string | null;
}

export interface ComponentItem {
  handle: string;
  category: string;
  priority: number;
  legend: string | null;
  center_x: number | null;
  center_y: number | null;
  width: number | null;
  height: number | null;
  work_name: string | null;
  machines: string[];
}

// ── S3/MinIO ──────────────────────────────────────────────────────────────────
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
    const u = new URL(storedUrl);
    let pathname = u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname;
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

async function fetchSvgText(storedUrl: string | null | undefined): Promise<string | null> {
  if (!storedUrl) return null;
  const key = keyFromUrl(storedUrl);
  if (!key) return null;
  try {
    const client = getS3Client();
    const resp = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    if (!resp.Body) return null;
    const chunks: Uint8Array[] = [];
    for await (const chunk of resp.Body as AsyncIterable<Uint8Array>) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf-8');
  } catch {
    return null;
  }
}

// ── GET /api/plan/:id/symbols/components ─────────────────────────────────────
/**
 * 해당 plan 의 STATION/CONVEYOR/BUFFER/SOURCE/DRAIN 심볼 목록을 반환한다.
 * center_x 가 NULL 인 심볼은 SVG 를 파싱해 bbox 를 계산 후 DB 에 저장한다.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    // 1. plan 존재 확인
    const planRows = await query<PlanRow[]>(
      `SELECT svg_file_path FROM plan WHERE id = ? AND deleted_yn = 'N'`,
      [id]
    );
    if (!Array.isArray(planRows) || !planRows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const { svg_file_path } = planRows[0];

    // 2. 시뮬레이션 카테고리 심볼 + 작업/기계 조회
    const rows = await query<SymbolRow[]>(
      `SELECT
         pso.id,
         pso.handle,
         pso.category,
         pso.legend,
         pso.center_x,
         pso.center_y,
         pso.width,
         pso.height,
         pso.work_id,
         w.name  AS work_name,
         GROUP_CONCAT(m.name ORDER BY m.name SEPARATOR '|||') AS machines
       FROM plan_symbol_overrides pso
       LEFT JOIN work w        ON pso.work_id = w.id AND w.deleted_yn = 'N'
       LEFT JOIN work_machine wm ON w.id = wm.work_id
       LEFT JOIN machine m     ON wm.machine_id = m.id AND m.deleted_yn = 'N'
       WHERE pso.plan_id = ?
         AND pso.category IN ('STATION','CONVEYOR','BUFFER','SOURCE','DRAIN')
       GROUP BY pso.id
       ORDER BY pso.id ASC`,
      [id]
    );

    const symbols: SymbolRow[] = Array.isArray(rows) ? rows : [];

    // 3. bbox 가 없는 심볼 식별
    const missingBbox = symbols.filter(s => s.center_x === null);

    if (missingBbox.length > 0 && svg_file_path) {
      const svgText = await fetchSvgText(svg_file_path);
      if (svgText) {
        const bboxMap = extractSymbolBboxes(svgText, SIM_CATEGORIES);

        // 배치 UPDATE (100개씩)
        const toUpdate = missingBbox
          .map(s => ({ row: s, bbox: bboxMap.get(s.handle) }))
          .filter((x): x is { row: SymbolRow; bbox: NonNullable<ReturnType<typeof bboxMap.get>> } =>
            x.bbox !== undefined
          );

        for (let i = 0; i < toUpdate.length; i += 100) {
          const batch = toUpdate.slice(i, i + 100);
          await Promise.all(
            batch.map(({ row, bbox }) =>
              query(
                `UPDATE plan_symbol_overrides
                 SET center_x = ?, center_y = ?, width = ?, height = ?
                 WHERE id = ?`,
                [bbox.center_x, bbox.center_y, bbox.width, bbox.height, row.id]
              )
            )
          );
          // 메모리 내 row 도 갱신
          batch.forEach(({ row, bbox }) => {
            row.center_x = bbox.center_x;
            row.center_y = bbox.center_y;
            row.width    = bbox.width;
            row.height   = bbox.height;
          });
        }
      }
    }

    // 4. 정렬: 중요도 → 범례 → 작업명 → 기계
    const components: ComponentItem[] = symbols.map(s => ({
      handle:    s.handle,
      category:  s.category,
      priority:  PRIORITY[s.category] ?? 999,
      legend:    s.legend,
      center_x:  s.center_x !== null ? Number(s.center_x) : null,
      center_y:  s.center_y !== null ? Number(s.center_y) : null,
      width:     s.width    !== null ? Number(s.width)    : null,
      height:    s.height   !== null ? Number(s.height)   : null,
      work_name: s.work_name ?? null,
      machines:  s.machines ? s.machines.split('|||') : [],
    }));

    components.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const lA = a.legend ?? '';
      const lB = b.legend ?? '';
      if (lA !== lB) return lA.localeCompare(lB, 'ko');
      const wA = a.work_name ?? '';
      const wB = b.work_name ?? '';
      if (wA !== wB) return wA.localeCompare(wB, 'ko');
      const mA = a.machines.join(',');
      const mB = b.machines.join(',');
      return mA.localeCompare(mB, 'ko');
    });

    return NextResponse.json({ components });
  } catch (e) {
    console.error('[GET /api/plan/[id]/symbols/components]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
