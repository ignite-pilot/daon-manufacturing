import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import path from 'path';
import { query } from '@/lib/db';
import { Plan } from '@/types';

type RouteContext = { params: Promise<{ id: string }> };

const REGION           = process.env.AWS_REGION       || 'ap-northeast-2';
const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT;
const BUCKET           = process.env.STORAGE_BUCKET   || 'daon-mfg-local';
const APP_PREFIX       = 'daon-manufacturing';

// ── S3/MinIO 클라이언트 ──────────────────────────────────────────────
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

/** MinIO/S3 에 저장된 공개 URL → 오브젝트 키 추출 */
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

/** MinIO/S3 에서 텍스트 파일 읽기 (실패 시 null 반환) */
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
    return null; // MinIO 미가동·파일 없음 등 → 폴백
  }
}

// ── HTML 주입 헬퍼 ───────────────────────────────────────────────────

/**
 * viewer.html 의 인라인 SVG 블록을 fetched SVG 로 교체.
 * 마커:  <svg id="svg-document" ... > ... </svg>
 */
function injectSvg(html: string, svgText: string): string {
  const OPEN  = '<svg id="svg-document"';
  const CLOSE = '</svg>';
  const oi = html.indexOf(OPEN);
  if (oi === -1) return html;
  const ci = html.indexOf(CLOSE, oi);
  if (ci === -1) return html;
  return html.slice(0, oi) + svgText.trim() + html.slice(ci + CLOSE.length);
}

/**
 * viewer.html 의 인라인 svgMetadata 를 plan 전용 데이터로 교체.
 * 마커:  // Embedded JSON metadata\n        const svgMetadata = { ... };
 */
function injectMetadata(html: string, meta: object): string {
  const OPEN  = '// Embedded JSON metadata\n        const svgMetadata = ';
  const CLOSE = ';\n\n        // ---- State ----';
  const oi = html.indexOf(OPEN);
  if (oi === -1) return html;
  const ci = html.indexOf(CLOSE, oi);
  if (ci === -1) return html;
  return html.slice(0, oi)
    + `// Embedded JSON metadata\n        const svgMetadata = ${JSON.stringify(meta)}`
    + html.slice(ci);
}

// ── 라우트 핸들러 ────────────────────────────────────────────────────

/**
 * GET /api/plan/:id/viewer
 *
 * 도면 뷰어 HTML을 서버 사이드에서 조합하여 반환합니다.
 *
 * - DB에서 plan의 svg_file_path / metadata_file_path 조회
 * - MinIO에서 파일 fetch 후 viewer.html 템플릿에 주입
 * - MinIO 미가동 / 분석 전(stub) 등으로 파일이 없으면 내장 샘플 데이터 그대로 사용
 *
 * iframe src 에 URL 파라미터 불필요:
 *   <iframe src="/api/plan/:id/viewer" />
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    // 1. DB 조회
    const rows = await query<Plan[]>(
      `SELECT svg_file_path, metadata_file_path, analysis_status, name
       FROM plan
       WHERE id = ? AND deleted_yn = 'N'`,
      [id]
    );
    if (!Array.isArray(rows) || !rows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const plan = rows[0];

    // 2. viewer.html 템플릿 읽기 (CRLF → LF 정규화: Windows 환경에서 마커 탐색 실패 방지)
    // 개발: client/public/plan_viewer/viewer.html (Vite publicDir 원본)
    // 프로덕션: public/plan_viewer/viewer.html (Dockerfile에서 client/dist → public 복사)
    const templatePath = process.env.NODE_ENV === 'production'
      ? path.join(process.cwd(), 'public/plan_viewer/viewer.html')
      : path.join(process.cwd(), 'client/public/plan_viewer/viewer.html');
    let html = readFileSync(templatePath, 'utf-8').replace(/\r\n/g, '\n');

    // 3. MinIO에서 SVG / 메타데이터 병렬 fetch
    //    (COMPLETED 상태가 아니거나 파일이 없으면 null → 내장 샘플 데이터 폴백)
    const [svgText, metaText] = await Promise.all([
      fetchFromStorage(plan.svg_file_path),
      fetchFromStorage(plan.metadata_file_path),
    ]);

    // 4. SVG 주입
    if (svgText) {
      html = injectSvg(html, svgText);
    }

    // 5. 메타데이터 주입
    if (metaText) {
      try {
        const raw = JSON.parse(metaText);
        const svgMeta = {
          annotations:    Array.isArray(raw.annotations) ? raw.annotations : [],
          categoryColors: raw.plantsim_legend ?? {
            STATION: '#FF9800', CONVEYOR: '#2196F3', BUFFER: '#4CAF50',
            FOOTPATH: '#9C27B0', UNDEFINED: '#9E9E9E',
          },
          // statsHtml: init() 에서 svgMetadata.statsHtml 이 있으면 우선 사용
          statsHtml: raw.stats
            ? Object.entries(raw.stats as Record<string, unknown>)
                .map(([k, v]) =>
                  `<div class="stat-item"><div class="stat-label">${k}</div><div class="stat-value">${v}</div></div>`
                )
                .join('')
            : undefined,
          title: raw.title ?? undefined,
        };
        html = injectMetadata(html, svgMeta);
      } catch {
        // JSON 파싱 실패 → 내장 메타데이터 그대로 사용
      }
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    console.error('[GET /api/plan/[id]/viewer]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
