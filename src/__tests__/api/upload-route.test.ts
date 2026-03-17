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
    expect(data.url).toMatch(/^https:\/\//);
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
});
