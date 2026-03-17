/**
 * 공정 목록 API 테스트
 * - 검색(공장, 완제품, 공정 이름), 등록(POST, 작업 단계)
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/processes/route';

const mockQuery = jest.fn();
jest.mock('@/lib/db', () => ({ query: (...args: unknown[]) => mockQuery.apply(null, args) }));
const mockGetUpdatedBy = jest.fn();
jest.mock('@/lib/api-util', () => ({ getUpdatedBy: (req: NextRequest) => mockGetUpdatedBy(req), getPagination: (req: NextRequest) => ({ page: 1, pageSize: 20, offset: 0 }) }));

function createRequest(searchParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3500/api/processes');
  Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

describe('GET /api/processes', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);
  });

  it('accepts factoryId and filters by factory', async () => {
    const req = createRequest({ factoryId: '1', page: '1', pageSize: '20' });
    await GET(req);
    expect(mockQuery).toHaveBeenCalled();
    const firstCall = mockQuery.mock.calls[0];
    const sql = firstCall[0] as string;
    const params = firstCall[1] as (string | number)[];
    expect(sql).toContain('p.factory_id = ?');
    expect(params).toContain(1);
  });

  it('accepts productName and processName for filter', async () => {
    const req = createRequest({ productName: '제품', processName: '공정', page: '1', pageSize: '10' });
    await GET(req);
    const firstCall = mockQuery.mock.calls[0];
    const sql = firstCall[0] as string;
    const params = firstCall[1] as (string | number)[];
    expect(sql).toContain('product_name LIKE ?');
    expect(sql).toContain('process_name LIKE ?');
    expect(params).toContain('%제품%');
    expect(params).toContain('%공정%');
  });

  it('returns items and total when no factoryId', async () => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);
    const req = createRequest({ page: '1', pageSize: '10' });
    const res = await GET(req);
    const data = await res.json();
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.items)).toBe(true);
  });
});

describe('POST /api/processes', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockGetUpdatedBy.mockReturnValue('tester');
  });

  it('returns 400 when required fields missing', async () => {
    const req = new NextRequest('http://localhost:3500/api/processes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ process_name: '공정1', product_name: '제품1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('required');
  });

  it('inserts process with steps', async () => {
    mockQuery
      .mockResolvedValueOnce(undefined)                    // INSERT process
      .mockResolvedValueOnce([{ id: 1 }])                   // LAST_INSERT_ID
      .mockResolvedValueOnce(undefined)                    // INSERT process_step (1 step)
      .mockResolvedValueOnce([{ id: 1, process_name: '공정1', product_name: '제품1', factory_id: 1, total_duration_sec: 3600 }]); // SELECT process
    const req = new NextRequest('http://localhost:3500/api/processes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        factory_id: 1,
        product_name: '제품1',
        process_name: '공정1',
        total_duration_sec: 3600,
        description: '설명',
        steps: [{ work_id: 1, actual_duration_sec: 600, description: '단계설명' }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('id', 1);
    expect(data).toHaveProperty('process_name', '공정1');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO process'),
      expect.any(Array)
    );
  });
});
