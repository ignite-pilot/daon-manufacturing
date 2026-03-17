/**
 * 공정 일괄 등록 (엑셀/CSV)
 * 형식: 공정명, 단계 명, 작업 명, 소요시간 (선택: 공장/완제품)
 * 합쳐진 셀(merge)은 빈 칸을 위 행 값으로 채움
 */
import { query } from '@/lib/db';
import { parseSpreadsheetToRows } from '@/lib/spreadsheet-parse';

const SUB_PREFIX = '[세부공정]';

function encodeSubProcessMeta(name: string, description: string): string {
  return `${SUB_PREFIX}${name || ''}|${description || ''}`;
}

/** 헤더 이름 매칭 (공백/대소문자 무시) */
function matchHeader(key: string, candidates: string[]): boolean {
  const k = key.replace(/\s+/g, ' ').trim().toLowerCase();
  const kNoSpace = k.replace(/\s/g, '');
  for (const c of candidates) {
    const cLower = c.toLowerCase();
    if (k === cLower || kNoSpace === cLower.replace(/\s/g, '')) return true;
  }
  return false;
}

const PROCESS_NAME_KEYS = ['공정명', '공정 이름', 'process name', 'process_name'];
const STEP_NAME_KEYS = ['단계 명', '단계명', '단계 이름', 'step name', 'step_name'];
const TASK_NAME_KEYS = ['작업 명', '작업명', '작업 이름', 'task name', 'work name', 'work_name'];
const DURATION_KEYS = ['소요시간', '소요시간(초)', 'required time', 'duration', '초'];
const FACTORY_KEYS = ['공장', '공장id', '공장명', '공장 이름', 'factory_id', 'factory name'];
const PRODUCT_KEYS = ['완제품', '대상 완제품', 'product', 'product_name', 'product name'];

function getColumnValue(row: Record<string, string>, candidates: string[]): string {
  for (const [k, v] of Object.entries(row)) {
    if (matchHeader(k, candidates) && v !== undefined) return String(v).trim();
  }
  return '';
}

/** merged cell 보정: 공정명·단계 명 빈 칸을 위 행 값으로 채움 */
function fillDownProcessRows(rows: Record<string, string>[]): Record<string, string>[] {
  if (rows.length === 0) return rows;
  const out = rows.map((r) => ({ ...r }));
  const keys = Object.keys(out[0] || {});
  const processKey = keys.find((k) => matchHeader(k, PROCESS_NAME_KEYS));
  const stepKey = keys.find((k) => matchHeader(k, STEP_NAME_KEYS));
  const fillKeys = [processKey, stepKey].filter(Boolean) as string[];
  for (let i = 1; i < out.length; i++) {
    for (const k of fillKeys) {
      const v = (out[i][k] ?? '').trim();
      if (!v && out[i - 1][k] !== undefined) out[i][k] = String(out[i - 1][k] ?? '').trim();
    }
  }
  return out;
}

interface ProcessRow {
  processName: string;
  stepName: string;
  taskName: string;
  durationSec: number;
  factoryId?: number;
  factoryName?: string;
  productName?: string;
}

function rowToProcessRow(row: Record<string, string>, headers: string[]): ProcessRow | null {
  const processName = getColumnValue(row, PROCESS_NAME_KEYS) || (headers.some((h) => matchHeader(h, PROCESS_NAME_KEYS)) ? '' : '');
  const stepName = getColumnValue(row, STEP_NAME_KEYS) || '';
  const taskName = getColumnValue(row, TASK_NAME_KEYS) || '';
  const durationStr = getColumnValue(row, DURATION_KEYS) || '0';
  const durationSec = Math.max(0, Math.round(Number(durationStr))) || 0;
  if (!processName.trim() || !stepName.trim()) return null;
  const factoryIdStr = getColumnValue(row, FACTORY_KEYS);
  let factoryId: number | undefined;
  if (factoryIdStr && /^\d+$/.test(factoryIdStr)) factoryId = Number(factoryIdStr);
  const factoryName = !factoryId ? getColumnValue(row, ['공장명', '공장 이름']) : undefined;
  const productName = getColumnValue(row, PRODUCT_KEYS) || undefined;
  return {
    processName: processName.trim(),
    stepName: stepName.trim(),
    taskName: taskName.trim(),
    durationSec,
    factoryId,
    factoryName: factoryName || undefined,
    productName: productName?.trim() || undefined,
  };
}

/** 작업명으로 work id 조회 */
async function findWorkIdByName(workName: string): Promise<number | null> {
  if (!workName.trim()) return null;
  const rows = await query<{ id: number }[]>(
    'SELECT id FROM work WHERE name = ? AND deleted_yn = ? LIMIT 1',
    [workName.trim(), 'N']
  );
  return Array.isArray(rows) && rows[0] ? rows[0].id : null;
}

/** 공정 일괄 등록: 엑셀/CSV 파일 파싱 → 그룹화 → process + process_step INSERT */
export async function registerProcessesFromFile(
  file: File,
  updatedBy: string | null
): Promise<{ success: number; errorMessage?: string }> {
  const rows = await parseSpreadsheetToRows(file);
  if (rows.length === 0) {
    return { success: 0, errorMessage: '엑셀/CSV에서 공정 데이터를 읽을 수 없습니다. 첫 행은 헤더(공정명, 단계 명, 작업 명, 소요시간)여야 합니다.' };
  }
  const filled = fillDownProcessRows(rows);
  const headers = Object.keys(filled[0] || {});
  const hasProcessCol = headers.some((h) => matchHeader(h, PROCESS_NAME_KEYS));
  const hasStepCol = headers.some((h) => matchHeader(h, STEP_NAME_KEYS));
  const hasTaskCol = headers.some((h) => matchHeader(h, TASK_NAME_KEYS));
  if (!hasProcessCol || !hasStepCol || !hasTaskCol) {
    return { success: 0, errorMessage: '엑셀에 "공정명", "단계 명", "작업 명" 열이 필요합니다.' };
  }

  const parsed: ProcessRow[] = [];
  for (let i = 0; i < filled.length; i++) {
    const r = rowToProcessRow(filled[i], headers);
    if (r && r.processName && r.stepName && r.taskName) parsed.push(r);
  }
  if (parsed.length === 0) {
    return { success: 0, errorMessage: '공정명·단계 명·작업 명이 채워진 데이터 행이 없습니다.' };
  }

  let factories: { id: number; name: string }[] = [];
  try {
    const fRows = await query<{ id: number; name: string }[]>('SELECT id, name FROM factory WHERE deleted_yn = ? ORDER BY id', ['N']);
    factories = Array.isArray(fRows) ? fRows : [];
  } catch {
    // ignore
  }
  const defaultFactoryId = factories[0]?.id ?? null;
  if (defaultFactoryId == null) {
    return { success: 0, errorMessage: '등록된 공장이 없습니다. 먼저 공장을 등록해 주세요.' };
  }

  const processGroups = new Map<string, ProcessRow[]>();
  for (const r of parsed) {
    const key = r.processName;
    if (!processGroups.has(key)) processGroups.set(key, []);
    processGroups.get(key)!.push(r);
  }

  let success = 0;
  const errors: string[] = [];
  const workCache = new Map<string, number | null>();

  for (const [processName, processRows] of processGroups) {
    const firstRow = processRows[0];
    let factoryId = firstRow.factoryId ?? defaultFactoryId;
    if (!firstRow.factoryId && firstRow.factoryName) {
      const f = factories.find((x) => (x.name || '').trim() === firstRow.factoryName?.trim());
      if (f) factoryId = f.id;
    }
    const productName = (firstRow.productName || processName || '일괄등록').trim();

    try {
      const totalSec = processRows.reduce((sum, r) => sum + r.durationSec, 0);
      await query(
        `INSERT INTO process (factory_id, product_name, process_name, total_duration_sec, description, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [factoryId, productName, processName, totalSec, null, updatedBy]
      );
      const [inserted] = await query<{ id: number }[]>('SELECT LAST_INSERT_ID() AS id');
      const processId = inserted?.id;
      if (processId == null) {
        errors.push(`공정 "${processName}" 생성 후 ID를 가져오지 못했습니다.`);
        continue;
      }

      let stepOrder = 0;
      let currentStepName = '';
      for (const r of processRows) {
        let workId: number | null = null;
        if (r.taskName) {
          const cacheKey = r.taskName;
          if (!workCache.has(cacheKey)) {
            workCache.set(cacheKey, await findWorkIdByName(r.taskName));
          }
          workId = workCache.get(cacheKey)!;
        }
        const isFirstInStep = r.stepName !== currentStepName;
        if (isFirstInStep) {
          currentStepName = r.stepName;
          if (workId == null && r.taskName) {
            stepOrder += 1;
            await query(
              `INSERT INTO process_step (process_id, work_id, step_order, actual_duration_min, description)
               VALUES (?, ?, ?, ?, ?)`,
              [processId, null, stepOrder, null, encodeSubProcessMeta(r.stepName, '')]
            );
            errors.push(`작업을 찾을 수 없음: "${r.taskName}" (공정: ${processName}, 단계: ${r.stepName})`);
          }
        }
        const description = isFirstInStep && workId != null ? encodeSubProcessMeta(r.stepName, '') : null;
        const durationSec = r.durationSec > 0 ? Math.max(0, Math.floor(r.durationSec)) : null;
        if (workId != null) {
          stepOrder += 1;
          await query(
            `INSERT INTO process_step (process_id, work_id, step_order, actual_duration_min, description)
             VALUES (?, ?, ?, ?, ?)`,
            [processId, workId, stepOrder, durationSec, description]
          );
        } else if (r.taskName && !isFirstInStep) {
          errors.push(`작업을 찾을 수 없음: "${r.taskName}" (공정: ${processName})`);
        }
      }
      if (stepOrder === 0) {
        await query(
          `INSERT INTO process_step (process_id, work_id, step_order, actual_duration_min, description)
           VALUES (?, ?, ?, ?, ?)`,
          [processId, null, 1, null, encodeSubProcessMeta(currentStepName || '단계', '')]
        );
      }
      success += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`공정 "${processName}": ${msg}`);
    }
  }

  if (success === 0 && errors.length > 0) {
    return { success: 0, errorMessage: errors.slice(0, 5).join(' ') };
  }
  return { success };
}
