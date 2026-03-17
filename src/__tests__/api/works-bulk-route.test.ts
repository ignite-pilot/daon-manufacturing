/**
 * 작업 일괄 등록 API 테스트
 */
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/works/bulk/route';

const mockRegisterWorksFromFile = jest.fn();
jest.mock('@/lib/bulk-register-works', () => ({
  registerWorksFromFile: (file: File, updatedBy: string | null) => mockRegisterWorksFromFile(file, updatedBy),
}));
jest.mock('@/lib/auth-server', () => ({ getUpdatedByFromAuth: () => Promise.resolve(null) }));
const mockGetUpdatedBy = jest.fn();
jest.mock('@/lib/api-util', () => ({ getUpdatedBy: (req: NextRequest) => mockGetUpdatedBy(req) }));

describe('POST /api/works/bulk', () => {
  beforeEach(() => {
    mockRegisterWorksFromFile.mockReset();
    mockGetUpdatedBy.mockReturnValue('tester');
  });

  it('returns 400 when content-type is not multipart', async () => {
    const req = new NextRequest('http://localhost/api/works/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('엑셀');
    expect(mockRegisterWorksFromFile).not.toHaveBeenCalled();
  });

  it('returns 400 when no file in formData', async () => {
    const formData = new FormData();
    formData.set('other', 'value');
    const req = new NextRequest('http://localhost/api/works/bulk', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(mockRegisterWorksFromFile).not.toHaveBeenCalled();
  });

  it('returns 400 when file has wrong extension', async () => {
    const formData = new FormData();
    formData.set('file', new File(['a'], 'test.txt', { type: 'text/plain' }));
    const req = new NextRequest('http://localhost/api/works/bulk', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/CSV|엑셀/);
    expect(mockRegisterWorksFromFile).not.toHaveBeenCalled();
  });

  it('returns 200 and success count when CSV file is uploaded', async () => {
    mockRegisterWorksFromFile.mockResolvedValue({ success: 3 });
    const formData = new FormData();
    formData.set('file', new File(['작업명,예상 소요시간,작업 Type\nA,60,조립'], 'works.csv', { type: 'text/csv' }));
    const req = new NextRequest('http://localhost/api/works/bulk', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(3);
    expect(mockRegisterWorksFromFile).toHaveBeenCalledTimes(1);
  });

  it('returns 200 with error message when registerWorksFromFile returns errorMessage', async () => {
    mockRegisterWorksFromFile.mockResolvedValue({ success: 0, errorMessage: '1행: 작업명이 필요합니다.' });
    const formData = new FormData();
    formData.set('file', new File(['col1\n'], 'bad.csv', { type: 'text/csv' }));
    const req = new NextRequest('http://localhost/api/works/bulk', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(0);
    expect(data.error).toContain('작업명');
  });
});
