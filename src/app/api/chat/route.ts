import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { query } from '@/lib/db';
import { getUpdatedBy } from '@/lib/api-util';
import { getUpdatedByFromAuth } from '@/lib/auth-server';
import { registerWorksFromFile } from '@/lib/bulk-register-works';
import { registerProcessesFromFile } from '@/lib/bulk-register-processes';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `당신은 "다온 제조 공정 관리" 시스템의 채팅 도우미입니다.
메뉴 도메인: 공장(factories), 공정(processes), 작업(works), 기계(machines), 부품(parts).

사용자가 다음을 요청할 때, 반드시 한 줄 JSON으로 액션을 포함한 뒤 짧은 한국어 안내를 이어서 작성하세요.
- 조회/목록 보기 → {"action":"navigate","path":"/factories"} 또는 /processes, /works, /machines, /parts
- 등록/추가/신규 → {"action":"navigate","path":"/factories/new"} (또는 해당 도메인의 /new)
- 수정 → 목록 페이지로 이동: {"action":"navigate","path":"/factories"} 등 (목록에서 항목 선택 후 수정)
- 삭제 → 목록 페이지로 이동: {"action":"navigate","path":"/factories"} 등 (목록에서 삭제 가능)

JSON은 반드시 한 줄로, 마크다운 코드 블록 없이 바로 출력하세요. 예: {"action":"navigate","path":"/factories"} 해당 화면으로 이동했습니다.
일반 질문에는 JSON 없이 친절히 한국어로만 답하세요.
중요: "파일 첨부 기능은 지원되지 않습니다", "파일 첨부 기능이 지원되지 않습니다" 같은 문장을 절대 사용하지 마세요. 부품·기계·작업·공정 일괄 등록은 엑셀/CSV 첨부로 지원됩니다. 사용자가 부품·기계·작업·공정 일괄 등록을 요청했는데 메시지에 "(첨부: 파일명)"이 이미 포함되어 있거나 파일이 함께 전달된 경우에는 "파일을 첨부해 주세요"라고 하지 말고 "첨부해 주신 파일로 등록 처리됩니다" 또는 등록 결과를 안내하세요. 파일이 전혀 첨부되지 않은 경우에만 "엑셀 또는 CSV 파일을 첨부해 주시면 등록해 드립니다"라고 안내하세요.`;

function extractAction(text: string): { action?: { type: string; path: string }; cleanContent: string } {
  let cleanContent = text;
  const jsonMatch = text.match(/\{\s*"action"\s*:\s*"navigate"\s*,\s*"path"\s*:\s*"([^"]+)"\s*\}/);
  if (jsonMatch) {
    const path = jsonMatch[1];
    cleanContent = text.replace(jsonMatch[0], '').replace(/\n\n+/, '\n').trim();
    return { action: { type: 'navigate', path }, cleanContent: cleanContent || '이동합니다.' };
  }
  return { cleanContent: text };
}

/** 부품 등록/추가 요청인지 판별 (부품명 일괄 등록 등 포함) */
function isPartRegistrationIntent(text: string): boolean {
  const t = (text || '').trim();
  if (!t) return false;
  const hasPart = /부품|part/i.test(t);
  const hasRegister = /등록|추가|등록해|추가해|올려|넣어|일괄\s*등록/i.test(t);
  return !!(hasPart && hasRegister);
}

/** 기계 등록/추가 요청인지 판별 (기계 목록 일괄 등록 등 포함) */
function isMachineRegistrationIntent(text: string): boolean {
  const t = (text || '').trim();
  if (!t) return false;
  const hasMachine = /기계|machine/i.test(t);
  const hasRegister = /등록|추가|등록해|추가해|올려|넣어|일괄\s*등록/i.test(t);
  return !!(hasMachine && hasRegister);
}

/** 작업 등록/추가 요청인지 판별 (작업 목록 일괄 등록 등 포함) */
function isWorkRegistrationIntent(text: string): boolean {
  const t = (text || '').trim();
  if (!t) return false;
  const hasWork = /작업|work/i.test(t);
  const hasRegister = /등록|추가|등록해|추가해|올려|넣어|일괄\s*등록/i.test(t);
  return !!(hasWork && hasRegister);
}

/** 공정 등록/추가 요청인지 판별 (공정 일괄 등록 등 포함) */
function isProcessRegistrationIntent(text: string): boolean {
  const t = (text || '').trim();
  if (!t) return false;
  const hasProcess = /공정|process/i.test(t);
  const hasRegister = /등록|추가|등록해|추가해|올려|넣어|일괄\s*등록/i.test(t);
  return !!(hasProcess && hasRegister);
}

/** 일괄 등록 요청(부품·기계·작업·공정)인데 파일이 필요한지 판별 */
function isBulkRegistrationIntent(text: string): boolean {
  return isPartRegistrationIntent(text) || isMachineRegistrationIntent(text) || isWorkRegistrationIntent(text) || isProcessRegistrationIntent(text);
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const SPREADSHEET_EXT = /\.(csv|xlsx|xls)$/i;
const SPREADSHEET_TYPES = new Set([
  'text/csv',
  'text/comma-separated-values',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/csv',
  'application/x-csv',
  'application/octet-stream', // 브라우저가 엑셀을 octet-stream으로 보낼 수 있음 → 확장자로 판별
]);

function isSpreadsheetFile(file: File): boolean {
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  if (SPREADSHEET_EXT.test(name) || name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls')) return true;
  if (type === 'application/octet-stream' && SPREADSHEET_EXT.test(name)) return true;
  return SPREADSHEET_TYPES.has(type);
}

/** CSV 한 줄 파싱 (쉼표 구분, 따옴표 허용) */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      cur += c;
    } else if (c === ',') {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

/** 파일에서 스프레드시트 행 배열 추출 (첫 행 = 헤더) */
async function parseSpreadsheetToRows(file: File): Promise<Record<string, string>[]> {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.csv') || file.type === 'text/csv') {
    const text = await file.text();
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    const lines = normalized.split('\n').filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = parseCsvLine(lines[0]);
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, j) => {
        const key = (h || '').trim();
        if (key) row[key] = (cells[j] ?? '').trim();
      });
      rows.push(row);
    }
    return rows;
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) return [];
  const ws = wb.Sheets[firstSheet];
  const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' });
  if (!Array.isArray(data) || data.length < 2) return [];
  const headerRow = data[0];
  const headers = (headerRow || []).map((h) => String(h ?? '').trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < data.length; i++) {
    const cells = data[i] as string[];
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      if (h) row[h] = String(cells?.[j] ?? '').trim();
    });
    rows.push(row);
  }
  return rows;
}

/** 헤더 이름 → part 필드명 매핑 (공백/대소문자 무시) */
const PART_HEADER_MAP: Record<string, string> = {
  '공장id': 'factory_id',
  'factory_id': 'factory_id',
  'factory id': 'factory_id',
  '공장명': 'factory_name',
  '공장 이름': 'factory_name',
  'factory name': 'factory_name',
  '부품명': 'name',
  '부품 이름': 'name',
  'name': 'name',
  'part name': 'name',
  '부품 사진': 'photo_url',
  '사진': 'photo_url',
  'photo_url': 'photo_url',
  '설명': 'description',
  'description': 'description',
  '제조사': 'manufacturer',
  'manufacturer': 'manufacturer',
  'as담당자': 'as_contact',
  'as 담당자': 'as_contact',
  'as_contact': 'as_contact',
  'as연락처': 'as_phone',
  'as 연락처': 'as_phone',
  'as_phone': 'as_phone',
};

function normalizeHeader(key: string): string | null {
  const k = key.replace(/\s+/g, ' ').trim().toLowerCase().replace(/\s/g, ' ');
  for (const [h, field] of Object.entries(PART_HEADER_MAP)) {
    if (h.toLowerCase() === k) return field;
  }
  const noSpace = k.replace(/\s/g, '');
  for (const [h, field] of Object.entries(PART_HEADER_MAP)) {
    if (h.replace(/\s/g, '').toLowerCase() === noSpace) return field;
  }
  return null;
}

function rowToPart(raw: Record<string, string>, factories: { id: number; name: string }[]): { factory_id: number; name: string; photo_url: string | null; description: string | null; manufacturer: string | null; as_contact: string | null; as_phone: string | null } | null {
  const obj: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const field = normalizeHeader(k);
    if (field && v !== undefined) obj[field] = String(v).trim();
  }
  let factory_id: number | null = null;
  if (obj.factory_id) {
    const n = Number(obj.factory_id);
    if (Number.isInteger(n) && n > 0) factory_id = n;
  }
  if (factory_id == null && obj.factory_name) {
    const name = obj.factory_name.trim();
    const found = factories.find((f) => (f.name || '').trim() === name);
    if (found) factory_id = found.id;
  }
  const name = (obj.name || '').trim();
  if (!name || factory_id == null) return null;
  return {
    factory_id,
    name,
    photo_url: obj.photo_url || null,
    description: obj.description || null,
    manufacturer: obj.manufacturer || null,
    as_contact: obj.as_contact || null,
    as_phone: obj.as_phone || null,
  };
}

/** 스프레드시트 행으로 부품 일괄 등록 */
async function registerPartsFromFile(
  file: File,
  updatedBy: string | null
): Promise<{ success: number; errorMessage?: string }> {
  const rows = await parseSpreadsheetToRows(file);
  if (rows.length === 0) {
    return { success: 0, errorMessage: '엑셀/CSV에서 부품 데이터를 읽을 수 없습니다. 첫 행은 헤더(공장ID 또는 공장명, 부품명 등)여야 합니다.' };
  }
  let factories: { id: number; name: string }[] = [];
  try {
    const factoryRows = await query<{ id: number; name: string }[]>('SELECT id, name FROM factory WHERE deleted_yn = ?', ['N']);
    factories = Array.isArray(factoryRows) ? factoryRows : [];
  } catch {
    // ignore
  }
  let success = 0;
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const part = rowToPart(rows[i], factories);
    if (!part) {
      errors.push(`${i + 2}행: 공장(공장ID 또는 공장명)과 부품명이 필요합니다.`);
      continue;
    }
    try {
      await query(
        `INSERT INTO part (factory_id, name, photo_url, description, manufacturer, as_contact, as_phone, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          part.factory_id,
          part.name,
          part.photo_url,
          part.description,
          part.manufacturer,
          part.as_contact,
          part.as_phone,
          updatedBy,
        ]
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

/** 헤더 이름 → machine 필드명 매핑 */
const MACHINE_HEADER_MAP: Record<string, string> = {
  '공장id': 'factory_id',
  'factory_id': 'factory_id',
  'factory id': 'factory_id',
  '공장명': 'factory_name',
  '공장 이름': 'factory_name',
  'factory name': 'factory_name',
  '기계 이름': 'name',
  '기계명': 'name',
  'name': 'name',
  'machine name': 'name',
  '기계 소요시간': 'total_duration_sec',
  '소요시간(초)': 'total_duration_sec',
  'total_duration_sec': 'total_duration_sec',
  '기계 사진': 'photo_url',
  '사진': 'photo_url',
  'photo_url': 'photo_url',
  '설명': 'description',
  'description': 'description',
  '제조사': 'manufacturer',
  'manufacturer': 'manufacturer',
  'as담당자': 'as_contact',
  'as 담당자': 'as_contact',
  'as_contact': 'as_contact',
  'as연락처': 'as_phone',
  'as 연락처': 'as_phone',
  'as_phone': 'as_phone',
  '도입일시': 'introduced_at',
  'introduced_at': 'introduced_at',
  '공장내 위치': 'location_in_factory',
  'location_in_factory': 'location_in_factory',
};

function normalizeMachineHeader(key: string): string | null {
  const k = key.replace(/\s+/g, ' ').trim().toLowerCase().replace(/\s/g, ' ');
  for (const [h, field] of Object.entries(MACHINE_HEADER_MAP)) {
    if (h.toLowerCase() === k) return field;
  }
  const noSpace = k.replace(/\s/g, '');
  for (const [h, field] of Object.entries(MACHINE_HEADER_MAP)) {
    if (h.replace(/\s/g, '').toLowerCase() === noSpace) return field;
  }
  return null;
}

function rowToMachine(
  raw: Record<string, string>,
  factories: { id: number; name: string }[]
): {
  factory_id: number;
  name: string;
  total_duration_sec: number | null;
  photo_url: string | null;
  description: string | null;
  manufacturer: string | null;
  as_contact: string | null;
  as_phone: string | null;
  introduced_at: string | null;
  location_in_factory: string | null;
} | null {
  const obj: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const field = normalizeMachineHeader(k);
    if (field && v !== undefined) obj[field] = String(v).trim();
  }
  let factory_id: number | null = null;
  if (obj.factory_id) {
    const n = Number(obj.factory_id);
    if (Number.isInteger(n) && n > 0) factory_id = n;
  }
  if (factory_id == null && obj.factory_name) {
    const name = obj.factory_name.trim();
    const found = factories.find((f) => (f.name || '').trim() === name);
    if (found) factory_id = found.id;
  }
  const name = (obj.name || '').trim();
  if (!name || factory_id == null) return null;
  let total_duration_sec: number | null = null;
  if (obj.total_duration_sec !== undefined && obj.total_duration_sec !== '') {
    const n = Number(obj.total_duration_sec);
    if (Number.isInteger(n) && n >= 0) total_duration_sec = n;
  }
  let introduced_at: string | null = obj.introduced_at || null;
  if (introduced_at && !/^\d{4}-\d{2}-\d{2}/.test(introduced_at)) {
    const d = new Date(introduced_at);
    if (!Number.isNaN(d.getTime())) introduced_at = d.toISOString().slice(0, 19).replace('T', ' ');
  }
  return {
    factory_id,
    name,
    total_duration_sec,
    photo_url: obj.photo_url || null,
    description: obj.description || null,
    manufacturer: obj.manufacturer || null,
    as_contact: obj.as_contact || null,
    as_phone: obj.as_phone || null,
    introduced_at,
    location_in_factory: obj.location_in_factory || null,
  };
}

/** 스프레드시트 행으로 기계 일괄 등록 */
async function registerMachinesFromFile(
  file: File,
  updatedBy: string | null
): Promise<{ success: number; errorMessage?: string }> {
  const rows = await parseSpreadsheetToRows(file);
  if (rows.length === 0) {
    return { success: 0, errorMessage: '엑셀/CSV에서 기계 데이터를 읽을 수 없습니다. 첫 행은 헤더(공장ID 또는 공장명, 기계 이름 등)여야 합니다.' };
  }
  let factories: { id: number; name: string }[] = [];
  try {
    const factoryRows = await query<{ id: number; name: string }[]>('SELECT id, name FROM factory WHERE deleted_yn = ?', ['N']);
    factories = Array.isArray(factoryRows) ? factoryRows : [];
  } catch {
    // ignore
  }
  let success = 0;
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const machine = rowToMachine(rows[i], factories);
    if (!machine) {
      errors.push(`${i + 2}행: 공장(공장ID 또는 공장명)과 기계 이름이 필요합니다.`);
      continue;
    }
    try {
      await query(
        `INSERT INTO machine (factory_id, name, total_duration_sec, photo_url, description, manufacturer, as_contact, as_phone, introduced_at, location_in_factory, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          machine.factory_id,
          machine.name,
          machine.total_duration_sec,
          machine.photo_url,
          machine.description,
          machine.manufacturer,
          machine.as_contact,
          machine.as_phone,
          machine.introduced_at,
          machine.location_in_factory,
          updatedBy,
        ]
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

function isImageType(type: string): boolean {
  return IMAGE_TYPES.has(type?.toLowerCase());
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        content: 'ChatGPT 연동이 설정되지 않았습니다. OPENAI_API_KEY 환경 변수를 설정해 주세요.',
        action: null,
      });
    }

    let messages: Array<{ role?: string; content?: string | unknown }>;
    let file: File | null = null;
    let isMultipart = false;

    const contentType = req.headers.get('content-type') ?? '';
    if (contentType.includes('multipart/form-data')) {
      isMultipart = true;
      const formData = await req.formData();
      const messagesStr = formData.get('messages');
      if (typeof messagesStr !== 'string') {
        return NextResponse.json({ error: 'messages가 필요합니다.' }, { status: 400 });
      }
      messages = JSON.parse(messagesStr) as Array<{ role?: string; content?: string }>;
      const f = formData.get('file') ?? formData.get('files');
      file = f instanceof File ? f : null;
    } else {
      const body = await req.json().catch(() => ({}));
      messages = Array.isArray(body.messages) ? body.messages : [];
    }

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'messages 배열이 필요합니다.' },
        { status: 400 }
      );
    }

    const lastMsg = messages[messages.length - 1];
    const userText = String(lastMsg?.content ?? '');
    if (isMultipart && !file && lastMsg?.role === 'user' && isBulkRegistrationIntent(userText)) {
      return NextResponse.json({
        content: '엑셀 또는 CSV 파일을 첨부한 뒤 전송해 주세요. (파일이 전달되지 않았을 수 있습니다. 파일을 선택하고 메시지를 다시 보내 주세요.)',
        action: null,
      });
    }
    if (file && lastMsg?.role === 'user') {
      const content = userText;
      if (isImageType(file.type)) {
        const buf = await file.arrayBuffer();
        const base64 = Buffer.from(buf).toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;
        lastMsg.content = [
          { type: 'text', text: content || '이 이미지를 참고해 주세요.' },
          { type: 'image_url', image_url: { url: dataUrl } },
        ];
      } else if (isSpreadsheetFile(file)) {
        const intentWithFile = content || `(파일 첨부: ${file.name})`;
        if (isPartRegistrationIntent(intentWithFile)) {
          try {
            const steps: string[] = ['① 첨부 파일을 확인했습니다.'];
            const updatedBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(req);
            const result = await registerPartsFromFile(file, updatedBy);
            if (result.errorMessage) {
              steps.push(`② 부품 일괄 등록 중 오류가 발생했습니다. ${result.errorMessage}`);
              return NextResponse.json({ steps, action: null });
            }
            steps.push(`② ${result.success}건의 부품을 등록했습니다.`);
            steps.push('③ 부품 목록에서 확인하실 수 있습니다.');
            return NextResponse.json({
              steps,
              action: { type: 'navigate', path: '/parts' },
            });
          } catch (err) {
            console.error('[chat] registerPartsFromFile', err);
            const errMsg = err instanceof Error ? err.message : '잠시 후 다시 시도해 주세요.';
            return NextResponse.json({
              steps: ['① 첨부 파일을 확인했습니다.', `② 부품 일괄 등록 처리 중 오류가 발생했습니다. ${errMsg}`],
              action: null,
            });
          }
        }
        if (isMachineRegistrationIntent(intentWithFile)) {
          try {
            const steps: string[] = ['① 첨부 파일을 확인했습니다.'];
            const updatedBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(req);
            const result = await registerMachinesFromFile(file, updatedBy);
            if (result.errorMessage) {
              steps.push(`② 기계 일괄 등록 중 오류가 발생했습니다. ${result.errorMessage}`);
              return NextResponse.json({ steps, action: null });
            }
            steps.push(`② ${result.success}건의 기계를 등록했습니다.`);
            steps.push('③ 기계 목록에서 확인하실 수 있습니다.');
            return NextResponse.json({
              steps,
              action: { type: 'navigate', path: '/machines' },
            });
          } catch (err) {
            console.error('[chat] registerMachinesFromFile', err);
            const errMsg = err instanceof Error ? err.message : '잠시 후 다시 시도해 주세요.';
            return NextResponse.json({
              steps: ['① 첨부 파일을 확인했습니다.', `② 기계 일괄 등록 처리 중 오류가 발생했습니다. ${errMsg}`],
              action: null,
            });
          }
        }
        if (isWorkRegistrationIntent(intentWithFile)) {
          try {
            const steps: string[] = ['① 첨부 파일을 확인했습니다.'];
            const updatedBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(req);
            const result = await registerWorksFromFile(file, updatedBy);
            if (result.errorMessage) {
              steps.push(`② 작업 일괄 등록 중 오류가 발생했습니다. ${result.errorMessage}`);
              return NextResponse.json({ steps, action: null });
            }
            steps.push(`② ${result.success}건의 작업을 등록했습니다.`);
            steps.push('③ 작업 목록에서 확인하실 수 있습니다.');
            return NextResponse.json({
              steps,
              action: { type: 'navigate', path: '/works' },
            });
          } catch (err) {
            console.error('[chat] registerWorksFromFile', err);
            const errMsg = err instanceof Error ? err.message : '잠시 후 다시 시도해 주세요.';
            return NextResponse.json({
              steps: ['① 첨부 파일을 확인했습니다.', `② 작업 일괄 등록 처리 중 오류가 발생했습니다. ${errMsg}`],
              action: null,
            });
          }
        }
        if (isProcessRegistrationIntent(intentWithFile)) {
          try {
            const steps: string[] = ['① 첨부 파일을 확인했습니다.'];
            const updatedBy = (await getUpdatedByFromAuth()) ?? getUpdatedBy(req);
            const result = await registerProcessesFromFile(file, updatedBy);
            if (result.errorMessage) {
              steps.push(`② 공정 일괄 등록 중 오류가 발생했습니다. ${result.errorMessage}`);
              return NextResponse.json({ steps, action: null });
            }
            steps.push(`② ${result.success}건의 공정을 등록했습니다.`);
            steps.push('③ 공정 목록에서 확인하실 수 있습니다.');
            return NextResponse.json({
              steps,
              action: { type: 'navigate', path: '/processes' },
            });
          } catch (err) {
            console.error('[chat] registerProcessesFromFile', err);
            const errMsg = err instanceof Error ? err.message : '잠시 후 다시 시도해 주세요.';
            return NextResponse.json({
              steps: ['① 첨부 파일을 확인했습니다.', `② 공정 일괄 등록 처리 중 오류가 발생했습니다. ${errMsg}`],
              action: null,
            });
          }
        }
        lastMsg.content = content ? `${content} (첨부: ${file.name})` : `(파일 첨부: ${file.name})`;
      } else {
        lastMsg.content = content ? `${content} (첨부: ${file.name})` : `(파일 첨부: ${file.name})`;
      }
    }

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map((m: { role?: string; content?: string | unknown }) => ({
            role: m.role || 'user',
            content: m.content,
          })),
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[chat] OpenAI error', response.status, errText);
      return NextResponse.json({
        content: `ChatGPT 요청 실패 (${response.status}). 잠시 후 다시 시도해 주세요.`,
        action: null,
      });
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const rawContent =
      data.choices?.[0]?.message?.content?.trim() ?? '응답을 생성하지 못했습니다.';
    const { action, cleanContent } = extractAction(rawContent);

    return NextResponse.json({
      content: cleanContent,
      action: action ?? null,
    });
  } catch (e) {
    console.error('[chat]', e);
    return NextResponse.json(
      {
        content: e instanceof Error ? e.message : '채팅 처리 중 오류가 발생했습니다.',
        action: null,
      },
      { status: 500 }
    );
  }
}
