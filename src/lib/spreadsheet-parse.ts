import * as XLSX from 'xlsx';

/** CSV 한 줄 파싱 (쉼표 구분, 따옴표 허용) */
export function parseCsvLine(line: string): string[] {
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
export async function parseSpreadsheetToRows(file: File): Promise<Record<string, string>[]> {
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
