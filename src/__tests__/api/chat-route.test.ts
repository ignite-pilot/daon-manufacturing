/**
 * 채팅 API 테스트 (부품 일괄 등록 파일 첨부 포함)
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/chat/route';

const mockQuery = jest.fn();
jest.mock('@/lib/db', () => ({ query: (...args: unknown[]) => mockQuery.apply(null, args) }));
const mockGetUpdatedBy = jest.fn();
jest.mock('@/lib/api-util', () => ({ getUpdatedBy: (req: NextRequest) => mockGetUpdatedBy(req) }));
const mockGetUpdatedByFromAuth = jest.fn();
jest.mock('@/lib/auth-server', () => ({ getUpdatedByFromAuth: () => mockGetUpdatedByFromAuth() }));

describe('POST /api/chat', () => {
  const env = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    mockQuery.mockReset();
    mockGetUpdatedBy.mockReturnValue('tester');
    mockGetUpdatedByFromAuth.mockResolvedValue(null);
  });

  afterAll(() => {
    process.env.OPENAI_API_KEY = env;
  });

  it('returns 400 when messages is missing', async () => {
    const res = await POST(new NextRequest('http://localhost/api/chat', { method: 'POST', body: JSON.stringify({}) }));
    expect(res.status).toBe(400);
  });

  it('registers parts from CSV when file attached and user asks for part registration', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const csv = '공장ID,부품명,설명\n1,부품A,설명A\n1,부품B,설명B';
    const file = new File([csv], 'parts.csv', { type: 'text/csv' });
    const formData = new FormData();
    formData.set('messages', JSON.stringify([{ role: 'user', content: '이 파일로 부품 등록해줘' }]));
    formData.set('file', file);

    mockQuery
      .mockResolvedValueOnce([{ id: 1, name: '공장1' }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([]);

    const res = await POST(
      new NextRequest('http://localhost/api/chat', { method: 'POST', body: formData })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.steps).toBeDefined();
    expect(Array.isArray(data.steps)).toBe(true);
    expect(data.steps.some((s: string) => /\d+건의 부품을 등록했습니다/.test(s))).toBe(true);
    expect(data.action).toEqual({ type: 'navigate', path: '/parts' });
  });

  it('returns error message when CSV has no valid rows', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const csv = '공장ID,부품명\n,,\n,,'; // no valid data
    const file = new File([csv], 'parts.csv', { type: 'text/csv' });
    const formData = new FormData();
    formData.set('messages', JSON.stringify([{ role: 'user', content: '부품 등록 부탁해' }]));
    formData.set('file', file);

    const res = await POST(
      new NextRequest('http://localhost/api/chat', { method: 'POST', body: formData })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.steps).toBeDefined();
    expect(data.steps.some((s: string) => s.includes('오류'))).toBe(true);
    expect(data.action).toBeNull();
  });

  it('registers machines from CSV when file attached and user asks for machine bulk registration', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const csv = '공장ID,기계 이름,기계 소요시간(초)\n1,기계A,60\n1,기계B,120';
    const file = new File([csv], 'machines.csv', { type: 'text/csv' });
    const formData = new FormData();
    formData.set('messages', JSON.stringify([{ role: 'user', content: '첨부한 파일 기계 목록에 일괄 등록해줘' }]));
    formData.set('file', file);

    mockQuery
      .mockResolvedValueOnce([{ id: 1, name: '공장1' }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([]);

    const res = await POST(
      new NextRequest('http://localhost/api/chat', { method: 'POST', body: formData })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.steps).toBeDefined();
    expect(data.steps.some((s: string) => /\d+건의 기계를 등록했습니다/.test(s))).toBe(true);
    expect(data.action).toEqual({ type: 'navigate', path: '/machines' });
  });

  it('asks to attach file when user asks for machine bulk registration without file', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const formData = new FormData();
    formData.set('messages', JSON.stringify([{ role: 'user', content: '기계 목록에 일괄 등록해줘' }]));
    // no formData.set('file', ...) - file not attached

    const res = await POST(
      new NextRequest('http://localhost/api/chat', { method: 'POST', body: formData })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.content).toContain('엑셀 또는 CSV 파일을 첨부');
    expect(data.action).toBeNull();
  });

  it('registers works from CSV when file attached and user asks for work bulk registration', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const csv = '작업명,예상 소요시간,작업 Type\n작업A,60,가조립\n작업B,120,조립';
    const file = new File([csv], 'works.csv', { type: 'text/csv' });
    const formData = new FormData();
    formData.set('messages', JSON.stringify([{ role: 'user', content: '첨부한 작업 목록을 작업 정보에 일괄 등록해줘' }]));
    formData.set('file', file);

    mockQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([]);

    const res = await POST(
      new NextRequest('http://localhost/api/chat', { method: 'POST', body: formData })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.steps).toBeDefined();
    expect(data.steps.some((s: string) => /\d+건의 작업을 등록했습니다/.test(s))).toBe(true);
    expect(data.action).toEqual({ type: 'navigate', path: '/works' });
  });

  it('asks to attach file when user asks for work bulk registration without file', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const formData = new FormData();
    formData.set('messages', JSON.stringify([{ role: 'user', content: '작업 목록을 작업 정보에 일괄 등록해줘 (작업 Type, 작업명, 예상시간)' }]));
    // no formData.set('file', ...)

    const res = await POST(
      new NextRequest('http://localhost/api/chat', { method: 'POST', body: formData })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.content).toContain('엑셀 또는 CSV 파일을 첨부');
    expect(data.action).toBeNull();
  });

  it('registers processes from CSV when file attached and user asks for process bulk registration', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const csv = '공정명,단계 명,작업 명,소요시간\nRG3 SPT RR,조립1,테일트림 로딩,10\nRG3 SPT RR,조립1,로워 스크류 체결,9';
    const file = new File([csv], 'processes.csv', { type: 'text/csv' });
    const formData = new FormData();
    formData.set('messages', JSON.stringify([{ role: 'user', content: '첨부한 파일으로 공정 일괄 등록해줘' }]));
    formData.set('file', file);

    mockQuery
      .mockResolvedValueOnce([{ id: 1, name: 'F1' }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ id: 100 }])
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ id: 2 }])
      .mockResolvedValueOnce(undefined);

    const res = await POST(
      new NextRequest('http://localhost/api/chat', { method: 'POST', body: formData })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.steps).toBeDefined();
    expect(data.steps.some((s: string) => /\d+건의 공정을 등록했습니다/.test(s))).toBe(true);
    expect(data.action).toEqual({ type: 'navigate', path: '/processes' });
  });
});
