/**
 * DXF 도면 분석 파이프라인.
 *
 * 흐름:
 *   Phase 1 — DXF 실행 (Claude가 파라미터 결정)
 *     1. MinIO에서 원본 DXF 다운로드 → /tmp/plan-{id}-{ts}/input.dxf
 *     2. Claude API: run_dxf_analysis 도구 → Claude가 파라미터 선택 후 호출
 *     3. Python dxf_to_svg.py 실행 → SVG + metadata.json 생성
 *     4. 도구 결과로 compact 요약 반환 (78KB 전문 대신 ~100 토큰)
 *
 *   Phase 2 — 품질 검토 (structured output 강제)
 *     5. metadata 요약(~500 토큰)만 담은 신규 대화 시작
 *     6. tool_choice: { type:'tool', name:'submit_result' } 로 출력 고정
 *     7. submit_result 입력값(quality_ok, notes, warnings)을 구조화 결과로 사용
 *
 *   Phase 3 — 업로드
 *     8. SVG·metadata·analysis_result·notes → MinIO 업로드
 */
import Anthropic from '@anthropic-ai/sdk';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { getAnthropicApiKey } from '@/lib/anthropic';

// ── 환경 변수 ─────────────────────────────────────────────────────────────────

const REGION           = process.env.AWS_REGION      ?? 'ap-northeast-2';
const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT;
const BUCKET           = process.env.STORAGE_BUCKET  ?? 'daon-mfg-local';
const APP_PREFIX       = 'daon-manufacturing';
const MODEL            = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
const DXF_SCRIPT       = process.env.DXF_TO_SVG_SCRIPT
  ?? path.join(process.cwd(), 'scripts/analysis/dxf_to_svg.py');
const PYTHON           = process.env.PYTHON_EXECUTABLE ?? 'python';

// ── S3/MinIO 클라이언트 ───────────────────────────────────────────────────────

function getS3Client(): S3Client {
  if (STORAGE_ENDPOINT) {
    return new S3Client({
      region: REGION,
      endpoint: STORAGE_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId:     process.env.STORAGE_ACCESS_KEY ?? 'minioadmin',
        secretAccessKey: process.env.STORAGE_SECRET_KEY ?? 'minioadmin',
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

async function downloadFromStorage(url: string, destPath: string): Promise<void> {
  const key = keyFromUrl(url);
  if (!key) throw new Error(`유효하지 않은 스토리지 URL: ${url}`);
  const s3 = getS3Client();
  const resp = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!resp.Body) throw new Error(`스토리지에서 빈 응답: ${key}`);
  const chunks: Uint8Array[] = [];
  for await (const chunk of resp.Body as AsyncIterable<Uint8Array>) chunks.push(chunk);
  await fs.writeFile(destPath, Buffer.concat(chunks));
}

async function uploadToStorage(key: string, filePath: string, contentType: string): Promise<string> {
  const body = await fs.readFile(filePath);
  const s3 = getS3Client();
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  if (STORAGE_ENDPOINT) {
    return `${STORAGE_ENDPOINT}/${BUCKET}/${key}`;
  }
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

// ── Python subprocess ─────────────────────────────────────────────────────────

interface PythonResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function runPython(args: string[], timeoutMs = 120_000): Promise<PythonResult> {
  return new Promise((resolve) => {
    const proc = spawn(PYTHON, args, { timeout: timeoutMs });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    proc.stdout.on('data', (d: Buffer) => stdout.push(d));
    proc.stderr.on('data', (d: Buffer) => stderr.push(d));
    proc.on('close', (code) => {
      resolve({
        stdout: Buffer.concat(stdout).toString('utf-8'),
        stderr: Buffer.concat(stderr).toString('utf-8'),
        exitCode: code ?? 1,
      });
    });
    proc.on('error', (err) => {
      resolve({ stdout: '', stderr: err.message, exitCode: 1 });
    });
  });
}

// ── 프롬프트 ──────────────────────────────────────────────────────────────────

function buildPhase1SystemPrompt(): string {
  return `당신은 공장 레이아웃 DXF 도면 분석 전문가입니다.
run_dxf_analysis 도구를 호출하여 DXF 파일을 SVG로 변환하세요.
파라미터가 불확실하면 기본값을 사용하세요 (속도 우선).`;
}

function buildPhase1UserPrompt(additionalInstructions: string | null): string {
  const lines = [
    'DXF 도면 파일을 분석해주세요. run_dxf_analysis 도구를 호출하여 SVG 변환 및 메타데이터 추출을 수행하세요.',
    '파라미터가 불확실하면 기본값을 사용하세요 (속도 우선).',
  ];

  if (additionalInstructions) {
    lines.push('', '## 추가 지시사항', additionalInstructions);
  }

  lines.push(
    '',
    '## 뷰어 편집 기능 (추후 구현 예정)',
    '뷰어에서는 Entity 추가/수정/삭제, 레이어 표시/숨김 전환, 주석 추가 기능이 추가될 예정입니다.',
    '메타데이터는 이러한 편집 작업을 지원할 수 있도록 entity ID와 레이어 정보를 보존하세요.',
  );

  return lines.join('\n');
}

function buildPhase2SystemPrompt(): string {
  return `당신은 공장 레이아웃 DXF → SVG 변환 품질 검토 전문가입니다.
제공된 변환 결과 통계를 바탕으로 변환 품질을 판단하고, submit_result 도구로 검토 결과를 제출하세요.`;
}

function buildPhase2UserPrompt(summary: string): string {
  return `아래는 DXF → SVG 변환 결과 요약입니다. 품질을 검토하고 submit_result 도구로 결과를 제출하세요.\n\n${summary}`;
}

// ── 도구 정의: run_dxf_analysis ───────────────────────────────────────────────

interface DxfToolInput {
  input_dxf: string;
  output_dir: string;
  title?: string;
  svg_width?: number;
  svg_height?: number;
  margin?: number;
  station_patterns?: string;
  conveyor_patterns?: string;
  conveyor_layer?: string;
  conveyor_min_aspect?: number;
  footpath_patterns?: string;
  footpath_layers?: string;
  facility_colors?: string;
}

const RUN_DXF_ANALYSIS_TOOL: Anthropic.Tool = {
  name: 'run_dxf_analysis',
  description:
    'DXF 도면 파일을 SVG로 변환하고 공장 레이아웃 메타데이터(시설 분류, 색상, 통계)를 추출합니다.',
  input_schema: {
    type: 'object' as const,
    properties: {
      input_dxf:            { type: 'string',  description: '분석할 DXF 파일 경로 (절대경로)' },
      output_dir:           { type: 'string',  description: 'SVG 및 metadata.json을 저장할 디렉토리 경로' },
      title:                { type: 'string',  description: '도면 제목 (기본값: DXF 파일명)' },
      svg_width:            { type: 'number',  description: 'SVG 출력 너비 px (기본값: 7680)' },
      svg_height:           { type: 'number',  description: 'SVG 출력 높이 px (기본값: 4320)' },
      margin:               { type: 'number',  description: 'SVG 여백 px (기본값: 80)' },
      station_patterns:     { type: 'string',  description: '스테이션 해치 패턴, 쉼표 구분 (기본값: ANSI37)' },
      conveyor_patterns:    { type: 'string',  description: '컨베이어 해치 패턴, 쉼표 구분' },
      conveyor_layer:       { type: 'string',  description: '컨베이어 레이어 이름 (기본값: 0)' },
      conveyor_min_aspect:  { type: 'number',  description: '컨베이어 최소 종횡비 (기본값: 4.0)' },
      footpath_patterns:    { type: 'string',  description: '통로 해치 패턴, 쉼표 구분' },
      footpath_layers:      { type: 'string',  description: '통로 레이어 이름, 쉼표 구분' },
      facility_colors:      { type: 'string',  description: '시설 색상 JSON, 미제공 시 레이어명에서 자동 추출' },
    },
    required: ['input_dxf', 'output_dir'],
  },
};

// ── 도구 정의: submit_result (structured output 강제용) ───────────────────────

interface SubmitResultInput {
  quality_ok: boolean;
  notes: string;
  warnings: string[];
}

const SUBMIT_RESULT_TOOL: Anthropic.Tool = {
  name: 'submit_result',
  description: 'DXF → SVG 변환 품질 검토 결과를 제출합니다.',
  input_schema: {
    type: 'object' as const,
    properties: {
      quality_ok: {
        type: 'boolean',
        description:
          '변환 결과가 정상적으로 보이면 true. ' +
          '심각한 이상(총 엔티티 0개, 스킵률 50% 초과, STATION·CONVEYOR 모두 0개 등)이면 false.',
      },
      notes: {
        type: 'string',
        description: '검수 메모. 이상 징후나 주의사항을 간략히 기록. 정상이면 빈 문자열.',
      },
      warnings: {
        type: 'array',
        items: { type: 'string' },
        description: '경고 항목 목록. 없으면 빈 배열.',
      },
    },
    required: ['quality_ok', 'notes', 'warnings'],
  },
};

// ── 도구 실행 ─────────────────────────────────────────────────────────────────

interface DxfToolResult {
  meta: Record<string, unknown>;
  isError: false;
}
interface DxfToolError {
  errorMsg: string;
  isError: true;
}

async function executeDxfTool(
  input: DxfToolInput
): Promise<DxfToolResult | DxfToolError> {
  const args = [DXF_SCRIPT, input.input_dxf, '-o', input.output_dir, '--no-viewer'];

  if (input.title)                     args.push('--title', input.title);
  if (input.svg_width != null)         args.push('--svg-width',  String(input.svg_width));
  if (input.svg_height != null)        args.push('--svg-height', String(input.svg_height));
  if (input.margin != null)            args.push('--margin',     String(input.margin));
  if (input.station_patterns)          args.push('--station-patterns',    input.station_patterns);
  if (input.conveyor_patterns)         args.push('--conveyor-patterns',   input.conveyor_patterns);
  if (input.conveyor_layer)            args.push('--conveyor-layer',      input.conveyor_layer);
  if (input.conveyor_min_aspect != null) args.push('--conveyor-min-aspect', String(input.conveyor_min_aspect));
  if (input.footpath_patterns)         args.push('--footpath-patterns',   input.footpath_patterns);
  if (input.footpath_layers)           args.push('--footpath-layers',     input.footpath_layers);
  if (input.facility_colors)           args.push('--facility-colors',     input.facility_colors);

  const result = await runPython(args);

  if (result.exitCode !== 0) {
    return { isError: true, errorMsg: result.stderr.trim() || `exit code ${result.exitCode}` };
  }

  const metaPath = path.join(input.output_dir, 'metadata.json');
  try {
    const raw = await fs.readFile(metaPath, 'utf-8');
    return { isError: false, meta: JSON.parse(raw) as Record<string, unknown> };
  } catch {
    return { isError: true, errorMsg: 'metadata.json을 읽을 수 없습니다.' };
  }
}

/** 검토용 compact 요약 (~500 토큰). SVG 전문 대신 이것만 Claude에 전달. */
function buildMetadataSummary(meta: Record<string, unknown>): string {
  const stats   = (meta.stats   as Record<string, unknown>) ?? {};
  const bbox    = (meta.dxf_bbox as Record<string, unknown>) ?? {};
  const skipped = (meta.skipped_details as Array<{ type?: string; reason?: string }>) ?? [];
  const annCount = (meta.annotations as unknown[])?.length ?? 0;
  const facilities = (meta.facility_legend as Array<{ name: string; count: number }> ?? [])
    .slice(0, 8).map((f) => `${f.name}(${f.count})`);

  const total = Number(stats['Total Entities'] ?? 0);
  const skippedN = Number(stats['Skipped'] ?? 0);

  return JSON.stringify({
    title:         meta.title,
    total_entities: total,
    skipped:       skippedN,
    skip_rate:     total > 0 ? `${((skippedN / total) * 100).toFixed(1)}%` : 'N/A',
    annotations:   annCount,
    categories: {
      STATION:   stats['STATION'],
      CONVEYOR:  stats['CONVEYOR'],
      BUFFER:    stats['BUFFER'],
      FOOTPATH:  stats['FOOTPATH'],
      UNDEFINED: stats['UNDEFINED'],
    },
    drawing_size: `${Math.round(Number(bbox['width'] ?? 0))} × ${Math.round(Number(bbox['height'] ?? 0))} (DXF units)`,
    facilities,
    first_errors: skipped.slice(0, 5).map((s) => ({ type: s.type, reason: s.reason })),
  }, null, 2);
}

/** 도구 결과로 Claude에 반환할 compact 확인 메시지 (~50 토큰). 전체 metadata 대신 사용. */
function buildCompactToolAck(meta: Record<string, unknown>): string {
  const stats = (meta.stats as Record<string, unknown>) ?? {};
  return (
    `변환 완료. 엔티티 ${stats['Total Entities'] ?? '?'}개 / ` +
    `STATION ${stats['STATION'] ?? 0} / CONVEYOR ${stats['CONVEYOR'] ?? 0} / ` +
    `BUFFER ${stats['BUFFER'] ?? 0} / FOOTPATH ${stats['FOOTPATH'] ?? 0} / ` +
    `스킵 ${stats['Skipped'] ?? 0}개. 파일 저장 완료.`
  );
}

// ── Phase 2: structured output 강제 ──────────────────────────────────────────

async function reviewWithStructuredOutput(
  client: Anthropic,
  meta: Record<string, unknown>
): Promise<SubmitResultInput> {
  const summary = buildMetadataSummary(meta);

  const response = await client.messages.create({
    model:      MODEL,
    max_tokens: 1024,
    system:     buildPhase2SystemPrompt(),
    tools:      [SUBMIT_RESULT_TOOL],
    tool_choice: { type: 'tool', name: 'submit_result' } as Anthropic.ToolChoiceTool,
    messages: [
      { role: 'user', content: buildPhase2UserPrompt(summary) },
    ],
  });

  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'submit_result'
  );
  if (!toolBlock) {
    // tool_choice 강제 시 이 경로는 이론상 도달 불가
    return { quality_ok: true, notes: '', warnings: [] };
  }
  return toolBlock.input as SubmitResultInput;
}

// ── 공개 API ──────────────────────────────────────────────────────────────────

export interface AnalysisParams {
  planId: number;
  dxfUrl: string;
  additionalInstructions?: string | null;
}

export interface AnalysisResult {
  svgFilePath: string;
  metadataFilePath: string;
  analysisResultFilePath: string;
  analysisNotesFilePath: string | null;
}

export async function runAnalysis(params: AnalysisParams): Promise<AnalysisResult> {
  const { planId, dxfUrl, additionalInstructions } = params;
  const ts     = Date.now();
  const tmpDir = path.join(os.tmpdir(), `plan-${planId}-${ts}`);
  const outDir = path.join(tmpDir, 'output');

  try {
    await fs.mkdir(outDir, { recursive: true });

    // ── 1. DXF 다운로드 ────────────────────────────────────────────────────
    const dxfPath = path.join(tmpDir, 'input.dxf');
    await downloadFromStorage(dxfUrl, dxfPath);

    // ── 2. Claude 클라이언트 초기화 ────────────────────────────────────────
    const apiKey = await getAnthropicApiKey();
    const client = new Anthropic({ apiKey });

    // ── Phase 1: Claude가 run_dxf_analysis 파라미터 결정 후 실행 ───────────
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: buildPhase1UserPrompt(additionalInstructions ?? null) },
    ];

    let meta: Record<string, unknown> | null = null;
    let toolCallCount = 0;

    while (true) {
      const response = await client.messages.create({
        model:   MODEL,
        max_tokens: 1024,  // Phase 1은 tool_use 블록만 필요하므로 토큰 최소화
        system:  buildPhase1SystemPrompt(),
        tools:   [RUN_DXF_ANALYSIS_TOOL],
        messages,
      });

      messages.push({ role: 'assistant', content: response.content });

      if (response.stop_reason === 'end_turn' || response.stop_reason !== 'tool_use') break;

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        if (block.name !== 'run_dxf_analysis') {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: '알 수 없는 도구', is_error: true });
          continue;
        }

        toolCallCount++;
        if (toolCallCount > 3) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: '도구 호출 횟수 초과', is_error: true });
          continue;
        }

        const toolInput = { ...(block.input as DxfToolInput), input_dxf: dxfPath, output_dir: outDir };
        const result = await executeDxfTool(toolInput);

        if (result.isError) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `오류: ${result.errorMsg}`, is_error: true });
        } else {
          meta = result.meta;
          // compact ack만 반환 — 78KB metadata 전문 대신 ~50 토큰
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: buildCompactToolAck(meta) });
        }
      }

      messages.push({ role: 'user', content: toolResults });
    }

    // Claude가 tool을 호출하지 않은 경우 직접 실행
    if (toolCallCount === 0 || meta === null) {
      const result = await executeDxfTool({ input_dxf: dxfPath, output_dir: outDir });
      if (result.isError) throw new Error(result.errorMsg);
      meta = result.meta;
    }

    // ── Phase 2: 품질 검토 (structured output 강제) ────────────────────────
    const review = await reviewWithStructuredOutput(client, meta);
    console.log(
      `[plan-analyzer] planId=${planId} quality_ok=${review.quality_ok} ` +
      `warnings=${review.warnings.length} notes="${review.notes.slice(0, 80)}"`
    );

    // ── 3. MinIO 업로드 ────────────────────────────────────────────────────
    const baseKey  = `${APP_PREFIX}/plans/${planId}`;
    const svgSrc   = path.join(outDir, 'layout.svg');
    const metaSrc  = path.join(outDir, 'metadata.json');

    // analysis_result.json = Python metadata + Claude 검토 결과 병합
    const analysisResult = { ...meta, review };
    const analysisResultPath = path.join(outDir, 'analysis_result.json');
    await fs.writeFile(analysisResultPath, JSON.stringify(analysisResult, null, 2), 'utf-8');

    const [svgFilePath, metadataFilePath, analysisResultFilePath] = await Promise.all([
      uploadToStorage(`${baseKey}/drawing.svg`,         svgSrc,             'image/svg+xml'),
      uploadToStorage(`${baseKey}/metadata.json`,       metaSrc,            'application/json'),
      uploadToStorage(`${baseKey}/analysis_result.json`, analysisResultPath, 'application/json'),
    ]);

    let analysisNotesFilePath: string | null = null;
    const notesText = [
      review.notes,
      ...review.warnings.map((w) => `⚠ ${w}`),
    ].filter(Boolean).join('\n');

    if (notesText) {
      const notesSrc = path.join(outDir, 'analysis_notes.txt');
      await fs.writeFile(notesSrc, notesText, 'utf-8');
      analysisNotesFilePath = await uploadToStorage(
        `${baseKey}/analysis_notes.txt`, notesSrc, 'text/plain'
      );
    }

    return { svgFilePath, metadataFilePath, analysisResultFilePath, analysisNotesFilePath };

  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
