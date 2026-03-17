/**
 * 공정 단건 API 테스트 (GET, PUT, DELETE)
 */

import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '@/app/api/processes/[id]/route';

const mockQuery = jest.fn();
jest.mock('@/lib/db', () => ({ query: (...args: unknown[]) => mockQuery.apply(null, args) }));
const mockGetUpdatedBy = jest.fn();
jest.mock('@/lib/api-util', () => ({ getUpdatedBy: (req: NextRequest) => mockGetUpdatedBy(req) }));

const params = (id: string) => Promise.resolve({ id });

describe('GET /api/processes/[id]', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('returns 404 when process not found', async () => {
    mockQuery.mockResolvedValueOnce([]);
    const res = await GET(new NextRequest('http://localhost/api/processes/999'), { params: params('999') });
    expect(res.status).toBe(404);
  });

  it('returns process with steps (work_name, actual_duration_sec, description)', async () => {
    mockQuery
      .mockResolvedValueOnce([{
        id: 1, factory_id: 1, factory_name: '공장1', product_name: '제품1', process_name: '공정1',
        total_duration_sec: 3600, description: '설명', updated_at: '2026-01-01', updated_by: 'user',
      }])
      .mockResolvedValueOnce([{ id: 10, work_id: 1, work_name: '작업1', step_order: 1, actual_duration_sec: 600, description: '단계설명' }]);
    const res = await GET(new NextRequest('http://localhost/api/processes/1'), { params: params('1') });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.process_name).toBe('공정1');
    expect(data.product_name).toBe('제품1');
    expect(data.factory_name).toBe('공장1');
    expect(Array.isArray(data.steps)).toBe(true);
    expect(data.steps[0].work_name).toBe('작업1');
    expect(data.steps[0].actual_duration_sec).toBe(600);
    expect(data.steps[0].description).toBe('단계설명');
  });
});

describe('PUT /api/processes/[id]', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockGetUpdatedBy.mockReturnValue('tester');
  });

  it('returns 400 when required fields missing', async () => {
    const req = new NextRequest('http://localhost/api/processes/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ process_name: '공정1', product_name: '제품1' }),
    });
    const res = await PUT(req, { params: params('1') });
    expect(res.status).toBe(400);
  });

  it('updates process and returns row', async () => {
    mockQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ id: 1, process_name: '공정1 수정', product_name: '제품1', factory_id: 1, total_duration_sec: 5400 }]);
    const req = new NextRequest('http://localhost/api/processes/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        factory_id: 1,
        product_name: '제품1',
        process_name: '공정1 수정',
        total_duration_sec: 5400,
        description: null,
        steps: [],
      }),
    });
    const res = await PUT(req, { params: params('1') });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.process_name).toBe('공정1 수정');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE process SET'),
      expect.arrayContaining(['공정1 수정', 5400, 'tester', '1'])
    );
  });
});

describe('DELETE /api/processes/[id]', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockGetUpdatedBy.mockReturnValue('tester');
  });

  it('soft-deletes process', async () => {
    mockQuery.mockResolvedValueOnce(undefined);
    const res = await DELETE(new NextRequest('http://localhost/api/processes/1'), { params: params('1') });
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("deleted_yn = 'Y'"),
      expect.arrayContaining(['tester', '1'])
    );
  });
});
