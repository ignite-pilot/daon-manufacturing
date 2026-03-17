import * as XLSX from 'xlsx';

export function buildExcelBuffer(sheetName: string, data: Record<string, unknown>[]): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as unknown as ArrayBuffer;
}

export function excelHeaders(filename: string) {
  return {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.xlsx"`,
  };
}
