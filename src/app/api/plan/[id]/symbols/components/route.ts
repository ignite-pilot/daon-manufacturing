import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { query } from '@/lib/db';
import { extractSymbolBboxes, SymbolBbox } from '@/lib/svg-bbox';

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
  svg_file_path:      string | null;
  metadata_file_path: string | null;
}

interface OverrideRow {
  id:            number;
  handle:        string;
  category:      string;
  legend:        string | null;
  description:   string | null;
  annotation_id: number | null;
  center_x:      number | null;
  center_y:      number | null;
  width:         number | null;
  height:        number | null;
  work_id:       number | null;
  work_name:     string | null;
  machines:      string | null;
}

export interface ComponentItem {
  handle:      string;
  category:    string;
  priority:    number;
  legend:      string | null;
  annotation:  string | null;
  description: string | null;
  center_x:    number | null;
  center_y:    number | null;
  width:       number | null;
  height:      number | null;
  work_name:   string | null;
  machines:    string[];
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

async function fetchStorageText(storedUrl: string | null | undefined): Promise<string | null> {
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
 * SVG 원본(data-plantsim-category) + plan_symbol_overrides 를 병합해
 * STATION/CONVEYOR/BUFFER/SOURCE/DRAIN 심볼 전체 목록을 반환한다.
 *
 * 우선순위: override > SVG 원본
 *
 * SVG-only 심볼(override 없음)은 bbox 계산 후 plan_symbol_overrides 에 INSERT IGNORE 하여
 * 이후 요청에서 재계산을 방지한다.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    // 1. plan 확인 (svg + metadata 경로 모두 조회)
    const planRows = await query<PlanRow[]>(
      `SELECT svg_file_path, metadata_file_path
       FROM plan WHERE id = ? AND deleted_yn = 'N'`,
      [id]
    );
    if (!Array.isArray(planRows) || !planRows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const { svg_file_path, metadata_file_path } = planRows[0];

    // 2. DB overrides + SVG + 메타데이터를 병렬 fetch
    const [overrideRows, svgText, metaText] = await Promise.all([
      query<OverrideRow[]>(
        `SELECT
           pso.id, pso.handle, pso.category, pso.legend,
           pso.description, pso.annotation_id,
           pso.center_x, pso.center_y, pso.width, pso.height,
           pso.work_id,
           w.name  AS work_name,
           GROUP_CONCAT(m.name ORDER BY m.name SEPARATOR '|||') AS machines
         FROM plan_symbol_overrides pso
         LEFT JOIN work w          ON pso.work_id = w.id AND w.deleted_yn = 'N'
         LEFT JOIN work_machine wm ON w.id = wm.work_id
         LEFT JOIN machine m       ON wm.machine_id = m.id AND m.deleted_yn = 'N'
         WHERE pso.plan_id = ?
         GROUP BY pso.id`,
        [id]
      ),
      fetchStorageText(svg_file_path),
      fetchStorageText(metadata_file_path),
    ]);

    const overrides: OverrideRow[] = Array.isArray(overrideRows) ? overrideRows : [];
    const overrideMap = new Map(overrides.map(r => [r.handle, r]));

    // 3. 주석(annotation) 맵 구축 — metadata.json annotations 배열에서 id → text
    const annotationMap = new Map<number, string>();
    if (metaText) {
      try {
        const meta = JSON.parse(metaText) as Record<string, unknown>;
        const anns = Array.isArray(meta.annotations) ? meta.annotations : [];
        for (const ann of anns) {
          if (ann && typeof ann === 'object') {
            const a = ann as Record<string, unknown>;
            const annId   = a.id;
            const annText = a.text ?? a.content ?? a.value;
            if (annId != null && annText != null) {
              annotationMap.set(Number(annId), String(annText));
            }
          }
        }
      } catch { /* metadata 파싱 실패 무시 */ }
    }

    // 4. SVG 파싱 — SIM 카테고리 심볼의 bbox 추출 (원본 카테고리 기준)
    const svgBboxMap = new Map<string, SymbolBbox>();
    if (svgText) {
      const parsed = extractSymbolBboxes(svgText, SIM_CATEGORIES);
      parsed.forEach((bbox, handle) => svgBboxMap.set(handle, bbox));
    }

    // 5. 조합 대상 handle 수집
    //    ① SVG 에서 SIM 카테고리로 분석된 심볼
    //    ② override 에서 SIM 카테고리로 지정된 심볼
    const allHandles = new Set<string>([
      ...svgBboxMap.keys(),
      ...overrides.filter(r => SIM_CATEGORIES.has(r.category)).map(r => r.handle),
    ]);

    // 6. override + SVG 병합
    const components: ComponentItem[] = [];

    for (const handle of allHandles) {
      const override = overrideMap.get(handle);
      const svgBbox  = svgBboxMap.get(handle);

      const category = override?.category ?? svgBbox?.category ?? 'UNDEFINED';
      if (!SIM_CATEGORIES.has(category)) continue; // override 로 SIM 외로 변경된 경우 제외

      // bbox: override 우선, 없으면 SVG 파싱값
      const center_x = override?.center_x != null ? Number(override.center_x) : (svgBbox?.center_x ?? null);
      const center_y = override?.center_y != null ? Number(override.center_y) : (svgBbox?.center_y ?? null);
      const width    = override?.width    != null ? Number(override.width)    : (svgBbox?.width    ?? null);
      const height   = override?.height   != null ? Number(override.height)   : (svgBbox?.height   ?? null);

      const annotationId = override?.annotation_id ?? null;

      components.push({
        handle,
        category,
        priority:    PRIORITY[category] ?? 999,
        legend:      override?.legend      ?? svgBbox?.facility ?? null,
        annotation:  annotationId != null ? (annotationMap.get(annotationId) ?? null) : null,
        description: override?.description ?? null,
        center_x,
        center_y,
        width,
        height,
        work_name: override?.work_name ?? null,
        machines:  override?.machines  ? override.machines.split('|||') : [],
      });
    }

    // 7. SVG-only 심볼 → plan_symbol_overrides 에 INSERT IGNORE (중복 계산 방지)
    //    이미 override 가 존재하는 handle 은 IGNORE 되므로 기존 값 보존
    const svgOnlyHandles = [...svgBboxMap.keys()].filter(h => !overrideMap.has(h));
    if (svgOnlyHandles.length > 0) {
      const BATCH = 100;
      for (let i = 0; i < svgOnlyHandles.length; i += BATCH) {
        const batch = svgOnlyHandles.slice(i, i + BATCH);
        const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
        const vals: (string | number | null)[] = [];
        for (const h of batch) {
          const bbox = svgBboxMap.get(h)!;
          vals.push(id, h, bbox.category, bbox.center_x, bbox.center_y, bbox.width, bbox.height);
        }
        await query(
          `INSERT IGNORE INTO plan_symbol_overrides
             (plan_id, handle, category, center_x, center_y, width, height)
           VALUES ${placeholders}`,
          vals
        );
      }
    }

    // 8. override 가 있지만 bbox 가 NULL → SVG 파싱값으로 DB 업데이트
    const toUpdate = components.filter(c => {
      const ov = overrideMap.get(c.handle);
      return ov && ov.center_x === null && c.center_x !== null;
    });
    if (toUpdate.length > 0) {
      for (let i = 0; i < toUpdate.length; i += 100) {
        const batch = toUpdate.slice(i, i + 100);
        await Promise.all(
          batch.map(c =>
            query(
              `UPDATE plan_symbol_overrides
               SET center_x = ?, center_y = ?, width = ?, height = ?
               WHERE plan_id = ? AND handle = ?`,
              [c.center_x, c.center_y, c.width, c.height, id, c.handle]
            )
          )
        );
      }
    }

    // 9. 정렬: 중요도 → 범례 → 작업명 → 기계
    components.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const lA = a.legend ?? '';
      const lB = b.legend ?? '';
      if (lA !== lB) return lA.localeCompare(lB, 'ko');
      const wA = a.work_name ?? '';
      const wB = b.work_name ?? '';
      if (wA !== wB) return wA.localeCompare(wB, 'ko');
      return a.machines.join(',').localeCompare(b.machines.join(','), 'ko');
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
