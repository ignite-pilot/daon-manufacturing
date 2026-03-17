/**
 * 기계 목록 API 테스트
 * - 검색(기계 이름, 적용 공정/작업), 등록(POST, 동작 순서·필수 부품 포함)
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/machines/route';

const mockQuery = jest.fn();
jest.mock('@/lib/db', () => ({ query: (...args: unknown[]) => mockQuery.apply(null, args) }));
const mockGetUpdatedBy = jest.fn();
jest.mock('@/lib/api-util', () => ({ getUpdatedBy: (req: NextRequest) => mockGetUpdatedBy(req), getPagination: (req: NextRequest) => ({ page: 1, pageSize: 20, offset: 0 }) }));

function createGetRequest(searchParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3500/api/machines');
  Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

describe('GET /api/machines', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);
  });

  it('accepts machineName and filters by name', async () => {
    const req = createGetRequest({ machineName: '기계A', page: '1', pageSize: '20' });
    await GET(req);
    expect(mockQuery).toHaveBeenCalled();
    const firstCall = mockQuery.mock.calls[0];
    const sql = firstCall[0] as string;
    const params = firstCall[1] as (string | number)[];
    expect(sql).toContain('m.name LIKE ?');
    expect(params).toContain('%기계A%');
  });

  it('accepts processId and workId for filter', async () => {
    const req = createGetRequest({ processId: '1', workId: '2', page: '1', pageSize: '10' });
    await GET(req);
    const firstCall = mockQuery.mock.calls[0];
    const sql = firstCall[0] as string;
    expect(sql).toContain('process_step');
    expect(sql).toContain('work_machine');
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

describe('POST /api/machines', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockGetUpdatedBy.mockReturnValue('tester');
  });

  it('returns 400 when factory_id or name is missing', async () => {
    const req = new NextRequest('http://localhost:3500/api/machines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '기계1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('required');
  });

  it('inserts machine with operation_steps and required_part_ids', async () => {
    mockQuery
      .mockResolvedValueOnce(undefined)                    // INSERT machine
      .mockResolvedValueOnce([{ id: 1 }])                   // LAST_INSERT_ID (machine)
      .mockResolvedValueOnce(undefined)                    // INSERT machine_operation_step
      .mockResolvedValueOnce([{ id: 10 }])                 // LAST_INSERT_ID (step)
      .mockResolvedValueOnce(undefined)                     // INSERT step_part (part 1)
      .mockResolvedValueOnce(undefined)                     // INSERT step_part (part 2)
      .mockResolvedValueOnce(undefined)                    // INSERT machine_required_part
      .mockResolvedValueOnce([{ id: 1, name: '기계1', factory_id: 1 }]); // SELECT machine
    const req = new NextRequest('http://localhost:3500/api/machines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        factory_id: 1,
        name: '기계1',
        total_duration_sec: 3600,
        operation_steps: [{ step_name: '단계1', duration_min: 10, description: '설명', part_ids: [1, 2] }],
        required_part_ids: [1],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('id', 1);
    expect(data).toHaveProperty('name', '기계1');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO machine'),
      expect.any(Array)
    );
  });
});
