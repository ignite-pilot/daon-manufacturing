/**
 * 기계 단건 API 테스트 (GET, PUT, DELETE)
 */

import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '@/app/api/machines/[id]/route';

const mockQuery = jest.fn();
jest.mock('@/lib/db', () => ({ query: (...args: unknown[]) => mockQuery.apply(null, args) }));
const mockGetUpdatedBy = jest.fn();
jest.mock('@/lib/api-util', () => ({ getUpdatedBy: (req: NextRequest) => mockGetUpdatedBy(req) }));

const params = (id: string) => Promise.resolve({ id });

describe('GET /api/machines/[id]', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('returns 404 when machine not found', async () => {
    mockQuery.mockResolvedValueOnce([]);
    const res = await GET(new NextRequest('http://localhost/api/machines/999'), { params: params('999') });
    expect(res.status).toBe(404);
  });

  it('returns machine with operation_steps, required_part_ids, used_works, used_processes', async () => {
    mockQuery
      .mockResolvedValueOnce([{
        id: 1, name: '기계1', factory_id: 1, factory_name: '공장1',
        total_duration_sec: 3600, photo_url: null, description: null, manufacturer: null,
        as_contact: null, as_phone: null, introduced_at: null, location_in_factory: null,
        updated_at: '2026-01-01', updated_by: 'user',
      }])
      .mockResolvedValueOnce([{ id: 10, step_order: 1, step_name: '단계1', duration_min: 10, description: '설명', part_ids: '1,2' }])
      .mockResolvedValueOnce([{ part_id: 1 }])
      .mockResolvedValueOnce([{ work_id: 1, work_name: '작업1' }])
      .mockResolvedValueOnce([{ process_id: 1, process_name: '공정1' }]);
    const res = await GET(new NextRequest('http://localhost/api/machines/1'), { params: params('1') });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('기계1');
    expect(data.factory_name).toBe('공장1');
    expect(Array.isArray(data.operation_steps)).toBe(true);
    expect(Array.isArray(data.required_part_ids)).toBe(true);
    expect(Array.isArray(data.used_works)).toBe(true);
    expect(Array.isArray(data.used_processes)).toBe(true);
    expect(data.operation_steps[0].step_name).toBe('단계1');
    expect(data.used_works[0].work_name).toBe('작업1');
    expect(data.used_processes[0].process_name).toBe('공정1');
  });
});

describe('PUT /api/machines/[id]', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockGetUpdatedBy.mockReturnValue('tester');
  });

  it('returns 400 when factory_id or name is missing', async () => {
    const req = new NextRequest('http://localhost/api/machines/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '기계1' }),
    });
    const res = await PUT(req, { params: params('1') });
    expect(res.status).toBe(400);
  });

  it('updates machine and returns row', async () => {
    mockQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ id: 1, name: '기계1 수정', factory_id: 1 }]);
    const req = new NextRequest('http://localhost/api/machines/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        factory_id: 1,
        name: '기계1 수정',
        total_duration_sec: 5400,
        photo_url: null,
        description: null,
        manufacturer: null,
        as_contact: null,
        as_phone: null,
        introduced_at: null,
        location_in_factory: null,
        operation_steps: [],
        required_part_ids: [],
      }),
    });
    const res = await PUT(req, { params: params('1') });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('기계1 수정');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE machine SET'),
      expect.arrayContaining(['기계1 수정', 90, 'tester', '1'])
    );
  });
});

describe('DELETE /api/machines/[id]', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockGetUpdatedBy.mockReturnValue('tester');
  });

  it('returns 400 when machine is in use', async () => {
    mockQuery
      .mockResolvedValueOnce([{ cnt: 1 }])
      .mockResolvedValueOnce([{ cnt: 0 }]);
    const res = await DELETE(new NextRequest('http://localhost/api/machines/1'), { params: params('1') });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(data.used).toBeDefined();
  });

  it('soft-deletes when not in use', async () => {
    mockQuery
      .mockResolvedValueOnce([{ cnt: 0 }])
      .mockResolvedValueOnce([{ cnt: 0 }])
      .mockResolvedValueOnce(undefined);
    const res = await DELETE(new NextRequest('http://localhost/api/machines/1'), { params: params('1') });
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("deleted_yn = 'Y'"),
      expect.arrayContaining(['tester', '1'])
    );
  });
});
