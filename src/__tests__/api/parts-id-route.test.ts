/**
 * 부품 단건 API 테스트 (GET, PUT, DELETE)
 */

import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '@/app/api/parts/[id]/route';

const mockQuery = jest.fn();
jest.mock('@/lib/db', () => ({ query: (...args: unknown[]) => mockQuery.apply(null, args) }));
const mockGetUpdatedBy = jest.fn();
jest.mock('@/lib/api-util', () => ({ getUpdatedBy: (req: NextRequest) => mockGetUpdatedBy(req) }));

const params = (id: string) => Promise.resolve({ id });

describe('GET /api/parts/[id]', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('returns 404 when part not found', async () => {
    mockQuery.mockResolvedValueOnce([]);
    const res = await GET(new NextRequest('http://localhost/api/parts/999'), { params: params('999') });
    expect(res.status).toBe(404);
  });

  it('returns part with used_works, used_machines, used_processes', async () => {
    mockQuery
      .mockResolvedValueOnce([{ id: 1, name: '부품1', factory_id: 1, factory_name: '공장1', photo_url: null, description: '설명', manufacturer: null, as_contact: null, as_phone: null, updated_at: '2026-01-01', updated_by: 'user' }])
      .mockResolvedValueOnce([{ work_id: 1, work_name: '작업1' }])
      .mockResolvedValueOnce([{ machine_id: 1, machine_name: '기계1' }])
      .mockResolvedValueOnce([{ process_id: 1, process_name: '공정1' }]);
    const res = await GET(new NextRequest('http://localhost/api/parts/1'), { params: params('1') });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('부품1');
    expect(data.factory_name).toBe('공장1');
    expect(Array.isArray(data.used_works)).toBe(true);
    expect(Array.isArray(data.used_machines)).toBe(true);
    expect(Array.isArray(data.used_processes)).toBe(true);
    expect(data.used_works[0].work_name).toBe('작업1');
    expect(data.used_machines[0].machine_name).toBe('기계1');
    expect(data.used_processes[0].process_name).toBe('공정1');
  });
});

describe('PUT /api/parts/[id]', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockGetUpdatedBy.mockReturnValue('tester');
  });

  it('returns 400 when factory_id or name is missing', async () => {
    const req = new NextRequest('http://localhost/api/parts/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '부품1' }),
    });
    const res = await PUT(req, { params: params('1') });
    expect(res.status).toBe(400);
  });

  it('updates part and returns row', async () => {
    mockQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ id: 1, name: '부품1 수정', factory_id: 1 }]);
    const req = new NextRequest('http://localhost/api/parts/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        factory_id: 1,
        name: '부품1 수정',
        description: '설명 수정',
        manufacturer: null,
        as_contact: null,
        as_phone: null,
      }),
    });
    const res = await PUT(req, { params: params('1') });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('부품1 수정');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE part SET'),
      expect.arrayContaining(['부품1 수정', '설명 수정', 'tester', '1'])
    );
  });
});

describe('DELETE /api/parts/[id]', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockGetUpdatedBy.mockReturnValue('tester');
  });

  it('returns 400 when part is in use', async () => {
    mockQuery
      .mockResolvedValueOnce([{ cnt: 1 }])
      .mockResolvedValueOnce([{ cnt: 0 }])
      .mockResolvedValueOnce([{ cnt: 0 }]);
    const res = await DELETE(new NextRequest('http://localhost/api/parts/1'), { params: params('1') });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(data.used).toBeDefined();
  });

  it('soft-deletes when not in use', async () => {
    mockQuery
      .mockResolvedValueOnce([{ cnt: 0 }])
      .mockResolvedValueOnce([{ cnt: 0 }])
      .mockResolvedValueOnce([{ cnt: 0 }])
      .mockResolvedValueOnce(undefined);
    const res = await DELETE(new NextRequest('http://localhost/api/parts/1'), { params: params('1') });
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("deleted_yn = 'Y'"),
      expect.arrayContaining(['tester', '1'])
    );
  });
});
