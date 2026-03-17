/**
 * 작업 단건 API 테스트 (GET, PUT, DELETE)
 */

import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '@/app/api/works/[id]/route';

const mockQuery = jest.fn();
jest.mock('@/lib/db', () => ({ query: (...args: unknown[]) => mockQuery.apply(null, args) }));
const mockGetUpdatedBy = jest.fn();
jest.mock('@/lib/api-util', () => ({ getUpdatedBy: (req: NextRequest) => mockGetUpdatedBy(req) }));

const params = (id: string) => Promise.resolve({ id });

describe('GET /api/works/[id]', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('returns 404 when work not found', async () => {
    mockQuery.mockResolvedValueOnce([]);
    const res = await GET(new NextRequest('http://localhost/api/works/999'), { params: params('999') });
    expect(res.status).toBe(404);
  });

  it('returns work with part_ids, machine_ids, steps, applied_processes', async () => {
    mockQuery
      .mockResolvedValueOnce([{ id: 1, name: '작업1', estimated_duration_sec: 30, work_type: '조립', updated_at: '2026-01-01', updated_by: 'user' }])
      .mockResolvedValueOnce([{ part_id: 1 }])
      .mockResolvedValueOnce([{ machine_id: 1 }])
      .mockResolvedValueOnce([{ id: 10, step_order: 1, step_name: '단계1', duration_min: 10, part_ids: '1', machine_ids: '1' }])
      .mockResolvedValueOnce([{ process_id: 1, process_name: '공정1' }]);
    const res = await GET(new NextRequest('http://localhost/api/works/1'), { params: params('1') });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('작업1');
    expect(data.work_type).toBe('조립');
    expect(Array.isArray(data.part_ids)).toBe(true);
    expect(Array.isArray(data.machine_ids)).toBe(true);
    expect(Array.isArray(data.steps)).toBe(true);
    expect(Array.isArray(data.applied_processes)).toBe(true);
    expect(data.steps[0].step_name).toBe('단계1');
    expect(data.applied_processes[0].process_name).toBe('공정1');
  });
});

describe('PUT /api/works/[id]', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockGetUpdatedBy.mockReturnValue('tester');
  });

  it('returns 400 when name, estimated_duration_sec or work_type is missing', async () => {
    const req = new NextRequest('http://localhost/api/works/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '작업1', estimated_duration_sec: 1800 }),
    });
    const res = await PUT(req, { params: params('1') });
    expect(res.status).toBe(400);
  });

  it('updates work and returns row', async () => {
    mockQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ id: 1, name: '작업1 수정', estimated_duration_sec: 2400, work_type: '가조립' }]);
    const req = new NextRequest('http://localhost/api/works/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '작업1 수정',
        estimated_duration_sec: 2400,
        work_type: '가조립',
        part_ids: [],
        machine_ids: [],
        steps: [],
      }),
    });
    const res = await PUT(req, { params: params('1') });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('작업1 수정');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE work SET'),
      expect.arrayContaining(['작업1 수정', 2400, '가조립', 'tester', '1'])
    );
  });
});

describe('DELETE /api/works/[id]', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockGetUpdatedBy.mockReturnValue('tester');
  });

  it('returns 400 when work is used in process', async () => {
    mockQuery.mockResolvedValueOnce([{ cnt: 1 }]);
    const res = await DELETE(new NextRequest('http://localhost/api/works/1'), { params: params('1') });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(data.used).toBeDefined();
  });

  it('soft-deletes when not in use', async () => {
    mockQuery.mockResolvedValueOnce([{ cnt: 0 }]).mockResolvedValueOnce(undefined);
    const res = await DELETE(new NextRequest('http://localhost/api/works/1'), { params: params('1') });
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("deleted_yn = 'Y'"),
      expect.arrayContaining(['tester', '1'])
    );
  });
});
