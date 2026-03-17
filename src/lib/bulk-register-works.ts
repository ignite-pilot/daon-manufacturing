import { query } from '@/lib/db';
import { parseSpreadsheetToRows } from '@/lib/spreadsheet-parse';

const WORK_HEADER_MAP: Record<string, string> = {
  '작업명': 'name',
  '작업 이름': 'name',
  'name': 'name',
  'work name': 'name',
  '예상 소요시간': 'estimated_duration_sec',
  '예상시간': 'estimated_duration_sec',
  '예상 소요시간(초)': 'estimated_duration_sec',
  'estimated_duration_sec': 'estimated_duration_sec',
  '작업 Type': 'work_type',
  '작업타입': 'work_type',
  'work_type': 'work_type',
  'work type': 'work_type',
};

const WORK_TYPES = new Set(['가조립', '조립']);

function normalizeWorkHeader(key: string): string | null {
  const k = key.replace(/\s+/g, ' ').trim().toLowerCase().replace(/\s/g, ' ');
  for (const [h, field] of Object.entries(WORK_HEADER_MAP)) {
    if (h.toLowerCase() === k) return field;
  }
  const noSpace = k.replace(/\s/g, '');
  for (const [h, field] of Object.entries(WORK_HEADER_MAP)) {
    if (h.replace(/\s/g, '').toLowerCase() === noSpace) return field;
  }
  return null;
}

function rowToWork(raw: Record<string, string>): { name: string; estimated_duration_sec: number; work_type: string } | null {
  const obj: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const field = normalizeWorkHeader(k);
    if (field && v !== undefined) obj[field] = String(v).trim();
  }
  const name = (obj.name || '').trim();
  if (!name) return null;
  let work_type = (obj.work_type || '조립').trim();
  if (!WORK_TYPES.has(work_type)) work_type = '조립';
  let estimated_duration_sec = 0;
  if (obj.estimated_duration_sec !== undefined && obj.estimated_duration_sec !== '') {
    const n = Number(obj.estimated_duration_sec);
    if (Number.isInteger(n) && n >= 0) estimated_duration_sec = n;
  }
  return { name, estimated_duration_sec, work_type };
}

/** 스프레드시트 파일로 작업 일괄 등록 */
export async function registerWorksFromFile(
  file: File,
  updatedBy: string | null
): Promise<{ success: number; errorMessage?: string }> {
  const rows = await parseSpreadsheetToRows(file);
  if (rows.length === 0) {
    return { success: 0, errorMessage: '엑셀/CSV에서 작업 데이터를 읽을 수 없습니다. 첫 행은 헤더(작업명, 예상 소요시간, 작업 Type 등)여야 합니다.' };
  }
  let success = 0;
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const work = rowToWork(rows[i]);
    if (!work) {
      errors.push(`${i + 2}행: 작업명이 필요합니다.`);
      continue;
    }
    try {
      await query(
        `INSERT INTO work (name, estimated_duration_sec, work_type, updated_by)
         VALUES (?, ?, ?, ?)`,
        [work.name, work.estimated_duration_sec, work.work_type, updatedBy]
      );
      success += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${i + 2}행: ${msg}`);
    }
  }
  if (success === 0 && errors.length > 0) {
    return { success: 0, errorMessage: errors.slice(0, 5).join(' ') };
  }
  return { success };
}
