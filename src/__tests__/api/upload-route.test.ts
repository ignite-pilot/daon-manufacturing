/**
 * 파일 업로드 API 테스트 (S3 업로드)
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/upload/route';

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: (...args: unknown[]) => mockSend(...args) })),
  PutObjectCommand: jest.fn(),
}));

describe('POST /api/upload', () => {
  beforeEach(() => {
    mockSend.mockResolvedValue(undefined);
  });

  it('returns 400 when not multipart', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/upload', { method: 'POST', body: JSON.stringify({}) })
    );
    expect(res.status).toBe(400);
  });

  it('returns 200 and url when file is uploaded', async () => {
    const file = new File(['image content'], 'photo.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.set('file', file);
    formData.set('prefix', 'parts');

    const res = await POST(
      new NextRequest('http://localhost/api/upload', { method: 'POST', body: formData })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toMatch(/^https?:\/\//);
    expect(data.url).toContain('daon-manufacturing');
    expect(data.url).toContain('parts');
    expect(data.key).toBeDefined();
  });

  it('accepts prefix machines', async () => {
    const file = new File(['x'], 'm.png', { type: 'image/png' });
    const formData = new FormData();
    formData.set('file', file);
    formData.set('prefix', 'machines');

    const res = await POST(
      new NextRequest('http://localhost/api/upload', { method: 'POST', body: formData })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toContain('daon-manufacturing');
    expect(data.url).toContain('machines');
  });

  it('accepts prefix factories (CAD/문서 업로드)', async () => {
    const file = new File(['cad content'], 'drawing.pdf', { type: 'application/pdf' });
    const formData = new FormData();
    formData.set('file', file);
    formData.set('prefix', 'factories');

    const res = await POST(
      new NextRequest('http://localhost/api/upload', { method: 'POST', body: formData })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toContain('daon-manufacturing');
    expect(data.url).toContain('factories');
  });

  describe('plans prefix (도면 파일)', () => {
    it('DXF 파일 업로드 성공 (application/octet-stream)', async () => {
      const file = new File(['SECTION\r\n'], 'factory-layout.dxf', { type: 'application/octet-stream' });
      const formData = new FormData();
      formData.set('file', file);
      formData.set('prefix', 'plans');

      const res = await POST(
        new NextRequest('http://localhost/api/upload', { method: 'POST', body: formData })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.url).toContain('daon-manufacturing');
      expect(data.url).toContain('plans');
      expect(data.key).toBeDefined();
      expect(data.format).toBe('dxf');
    });

    it('DXF 파일 업로드 성공 (MIME 타입 미지정 - 브라우저 미인식 케이스)', async () => {
      const file = new File(['SECTION\r\n'], 'layout.dxf', { type: '' });
      const formData = new FormData();
      formData.set('file', file);
      formData.set('prefix', 'plans');

      const res = await POST(
        new NextRequest('http://localhost/api/upload', { method: 'POST', body: formData })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.format).toBe('dxf');
    });

    it('DXF 파일 업로드 성공 (image/vnd.dxf MIME 타입)', async () => {
      const file = new File(['SECTION\r\n'], 'layout.dxf', { type: 'image/vnd.dxf' });
      const formData = new FormData();
      formData.set('file', file);
      formData.set('prefix', 'plans');

      const res = await POST(
        new NextRequest('http://localhost/api/upload', { method: 'POST', body: formData })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.format).toBe('dxf');
    });

    it('허용되지 않은 확장자는 400 반환', async () => {
      const file = new File(['content'], 'layout.exe', { type: 'application/octet-stream' });
      const formData = new FormData();
      formData.set('file', file);
      formData.set('prefix', 'plans');

      const res = await POST(
        new NextRequest('http://localhost/api/upload', { method: 'POST', body: formData })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('dxf');
    });

    it('확장자와 MIME 타입이 불일치하면 400 반환', async () => {
      // 확장자는 dxf 이지만 MIME 타입이 명백히 다른 타입인 경우
      const file = new File(['content'], 'layout.dxf', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.set('file', file);
      formData.set('prefix', 'plans');

      const res = await POST(
        new NextRequest('http://localhost/api/upload', { method: 'POST', body: formData })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('MIME');
    });

    it('format 필드는 plans 이외 prefix 응답에 없음', async () => {
      const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.set('file', file);
      formData.set('prefix', 'parts');

      const res = await POST(
        new NextRequest('http://localhost/api/upload', { method: 'POST', body: formData })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.format).toBeUndefined();
    });
  });
});
