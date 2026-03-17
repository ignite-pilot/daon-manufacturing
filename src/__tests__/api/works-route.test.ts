/**
 * 작업 목록 API 테스트
 * - 검색(작업 이름, 적용 공정), 등록(POST, 사용 부품/기계, 세부 공정 단계)
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/works/route';

const mockQuery = jest.fn();
jest.mock('@/lib/db', () => ({ query: (...args: unknown[]) => mockQuery.apply(null, args) }));
const mockGetUpdatedBy = jest.fn();
jest.mock('@/lib/api-util', () => ({ getUpdatedBy: (req: NextRequest) => mockGetUpdatedBy(req), getPagination: (req: NextRequest) => ({ page: 1, pageSize: 20, offset: 0 }) }));

function createGetRequest(searchParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3500/api/works');
  Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

describe('GET /api/works', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);
  });

  it('accepts workName and filters by name', async () => {
    const req = createGetRequest({ workName: '조립1', page: '1', pageSize: '20' });
    await GET(req);
    expect(mockQuery).toHaveBeenCalled();
    const firstCall = mockQuery.mock.calls[0];
    const sql = firstCall[0] as string;
    const params = firstCall[1] as (string | number)[];
    expect(sql).toContain('w.name LIKE ?');
    expect(params).toContain('%조립1%');
  });

  it('accepts processId for filter', async () => {
    const req = createGetRequest({ processId: '1', page: '1', pageSize: '10' });
    await GET(req);
    const firstCall = mockQuery.mock.calls[0];
    const sql = firstCall[0] as string;
    expect(sql).toContain('process_step');
  });

  it('returns items and total', async () => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);
    const req = createGetRequest({ page: '1', pageSize: '10' });
    const res = await GET(req);
    const data = await res.json();
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.items)).toBe(true);
  });
});

describe('POST /api/works', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockGetUpdatedBy.mockReturnValue('tester');
  });

  it('returns 400 when name, estimated_duration_sec or work_type is missing', async () => {
    const req = new NextRequest('http://localhost:3500/api/works', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '작업1', work_type: '조립' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('required');
  });

  it('inserts work with part_ids, machine_ids and steps', async () => {
    mockQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ id: 10 }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ id: 1, name: '작업1', estimated_duration_sec: 1800, work_type: '조립' }]);
    const req = new NextRequest('http://localhost:3500/api/works', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '작업1',
        estimated_duration_sec: 1800,
        work_type: '조립',
        part_ids: [1],
        machine_ids: [1],
        steps: [{ step_name: '단계1', duration_min: 10, part_ids: [1], machine_ids: [1] }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('id', 1);
    expect(data).toHaveProperty('name', '작업1');
    expect(data).toHaveProperty('work_type', '조립');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO work'),
      expect.any(Array)
    );
  });
});
