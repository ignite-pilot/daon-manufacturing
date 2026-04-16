/**
 * 공간 관리 - 도면 API 테스트
 * GET/POST /api/plan, GET/PUT/DELETE /api/plan/[id], POST /api/plan/[id]/analyze_cad
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/plan/route';
import { GET as getById, PUT, DELETE } from '@/app/api/plan/[id]/route';
import { POST as analyzeCAD } from '@/app/api/plan/[id]/analyze_cad/route';

const mockQuery = jest.fn();
jest.mock('@/lib/db', () => ({ query: (...args: unknown[]) => mockQuery(...args) }));
jest.mock('@/lib/api-util', () => ({
  getPagination: () => ({ page: 1, pageSize: 10, offset: 0 }),
  getUpdatedBy: () => 'test-user',
}));
jest.mock('@/lib/auth-server', () => ({ getUpdatedByFromAuth: async () => 'auth-user' }));

const PLAN_STUB = {
  id: 1,
  name: '1층 공장 도면',
  version: 1,
  factory_id: null,
  factory_name: null,
  original_file_name: 'factory-1f.dxf',
  original_file_format: 'dxf',
  original_file_path: 'http://localhost:9000/bucket/daon-manufacturing/plans/uuid-factory-1f.dxf',
  svg_file_path: null,
  metadata_file_path: null,
  analysis_result_file_path: null,
  analysis_notes_file_path: null,
  additional_instructions: null,
  analysis_status: 'PENDING',
  analysis_error: null,
  deleted_yn: 'N',
  created_at: '2026-04-17T00:00:00.000Z',
  updated_at: '2026-04-17T00:00:00.000Z',
  updated_by: 'auth-user',
};

function makeReq(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(url, options);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ---------------------------------------------------------------------------
// 공통 리셋
// ---------------------------------------------------------------------------
beforeEach(() => {
  mockQuery.mockReset();
});

// ---------------------------------------------------------------------------
// GET /api/plan
// ---------------------------------------------------------------------------
describe('GET /api/plan', () => {
  beforeEach(() => {
    mockQuery.mockResolvedValueOnce([PLAN_STUB]).mockResolvedValueOnce([{ total: 1 }]);
  });

  it('목록과 total 을 반환한다', async () => {
    const res = await GET(makeReq('http://localhost/api/plan'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.items).toHaveLength(1);
    expect(data.total).toBe(1);
  });

  it('name 파라미터로 LIKE 검색한다', async () => {
    await GET(makeReq('http://localhost/api/plan?name=1층'));
    const sql: string = mockQuery.mock.calls[0][0];
    const params: unknown[] = mockQuery.mock.calls[0][1];
    expect(sql).toContain('p.name LIKE ?');
    expect(params).toContain('%1층%');
  });

  it('factoryId 파라미터로 필터링한다', async () => {
    await GET(makeReq('http://localhost/api/plan?factoryId=5'));
    const sql: string = mockQuery.mock.calls[0][0];
    const params: unknown[] = mockQuery.mock.calls[0][1];
    expect(sql).toContain('p.factory_id = ?');
    expect(params).toContain(5);
  });

  it('status 파라미터로 필터링한다', async () => {
    await GET(makeReq('http://localhost/api/plan?status=completed'));
    const sql: string = mockQuery.mock.calls[0][0];
    const params: unknown[] = mockQuery.mock.calls[0][1];
    expect(sql).toContain('p.analysis_status = ?');
    expect(params).toContain('COMPLETED');
  });
});

// ---------------------------------------------------------------------------
// POST /api/plan
// ---------------------------------------------------------------------------
describe('POST /api/plan', () => {

  it('필수 필드 누락 시 400 반환', async () => {
    const res = await POST(makeReq('http://localhost/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '도면' }),
    }));
    expect(res.status).toBe(400);
  });

  it('정상 등록 시 201 과 plan 객체 반환', async () => {
    mockQuery
      .mockResolvedValueOnce(undefined)     // INSERT plan
      .mockResolvedValueOnce([PLAN_STUB])   // SELECT LAST_INSERT_ID
      .mockResolvedValueOnce(undefined);    // INSERT audit (catch 내부)

    const res = await POST(makeReq('http://localhost/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '1층 공장 도면',
        original_file_name: 'factory-1f.dxf',
        original_file_format: 'dxf',
        original_file_path: 'http://localhost:9000/bucket/plans/uuid.dxf',
        file_size: 204800,
      }),
    }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('1층 공장 도면');
  });

  it('factory_id 가 주어지면 쿼리에 포함된다', async () => {
    mockQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ ...PLAN_STUB, factory_id: 3 }])
      .mockResolvedValueOnce(undefined);

    await POST(makeReq('http://localhost/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '도면',
        factory_id: 3,
        original_file_name: 'f.dxf',
        original_file_format: 'dxf',
        original_file_path: 'http://localhost:9000/x',
      }),
    }));
    const insertParams: unknown[] = mockQuery.mock.calls[0][1];
    expect(insertParams).toContain(3);
  });
});

// ---------------------------------------------------------------------------
// GET /api/plan/[id]
// ---------------------------------------------------------------------------
describe('GET /api/plan/[id]', () => {
  it('존재하는 id 면 plan 객체 반환', async () => {
    mockQuery.mockResolvedValueOnce([PLAN_STUB]);
    const res = await getById(makeReq('http://localhost/api/plan/1'), makeParams('1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(1);
  });

  it('존재하지 않는 id 면 404 반환', async () => {
    mockQuery.mockResolvedValueOnce([]);
    const res = await getById(makeReq('http://localhost/api/plan/999'), makeParams('999'));
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/plan/[id]
// ---------------------------------------------------------------------------
describe('PUT /api/plan/[id]', () => {
  it('name 누락 시 400 반환', async () => {
    mockQuery.mockResolvedValueOnce([PLAN_STUB]);
    const res = await PUT(
      makeReq('http://localhost/api/plan/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factory_id: 1 }),
      }),
      makeParams('1')
    );
    expect(res.status).toBe(400);
  });

  it('정상 수정 시 version +1 쿼리 포함', async () => {
    mockQuery
      .mockResolvedValueOnce([PLAN_STUB])              // 존재 확인
      .mockResolvedValueOnce(undefined)                // UPDATE
      .mockResolvedValueOnce([{ ...PLAN_STUB, version: 2 }]); // SELECT

    const res = await PUT(
      makeReq('http://localhost/api/plan/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '수정된 도면', factory_id: null }),
      }),
      makeParams('1')
    );
    expect(res.status).toBe(200);
    const updateSql: string = mockQuery.mock.calls[1][0];
    expect(updateSql).toContain('version = version + 1');
  });

  it('존재하지 않는 id 면 404 반환', async () => {
    mockQuery.mockResolvedValueOnce([]);
    const res = await PUT(
      makeReq('http://localhost/api/plan/999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '수정' }),
      }),
      makeParams('999')
    );
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/plan/[id]
// ---------------------------------------------------------------------------
describe('DELETE /api/plan/[id]', () => {
  it('소프트 삭제 후 success: true 반환', async () => {
    mockQuery
      .mockResolvedValueOnce([PLAN_STUB])  // 존재 확인
      .mockResolvedValueOnce(undefined);   // UPDATE deleted_yn

    const res = await DELETE(makeReq('http://localhost/api/plan/1', { method: 'DELETE' }), makeParams('1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    const deleteSql: string = mockQuery.mock.calls[1][0];
    expect(deleteSql).toContain("deleted_yn = 'Y'");
  });

  it('존재하지 않는 id 면 404 반환', async () => {
    mockQuery.mockResolvedValueOnce([]);
    const res = await DELETE(makeReq('http://localhost/api/plan/999', { method: 'DELETE' }), makeParams('999'));
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /api/plan/[id]/analyze_cad
// ---------------------------------------------------------------------------
describe('POST /api/plan/[id]/analyze_cad', () => {
  it('미지원 format 은 400 반환', async () => {
    const res = await analyzeCAD(
      makeReq('http://localhost/api/plan/1/analyze_cad?format=pdf', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } }),
      makeParams('1')
    );
    expect(res.status).toBe(400);
  });

  it('이미 ANALYZING 중이면 409 반환', async () => {
    mockQuery.mockResolvedValueOnce([{ ...PLAN_STUB, analysis_status: 'ANALYZING' }]);
    const res = await analyzeCAD(
      makeReq('http://localhost/api/plan/1/analyze_cad?format=dxf', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } }),
      makeParams('1')
    );
    expect(res.status).toBe(409);
  });

  it('존재하지 않는 id 면 404 반환', async () => {
    mockQuery.mockResolvedValueOnce([]);
    const res = await analyzeCAD(
      makeReq('http://localhost/api/plan/999/analyze_cad?format=dxf', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } }),
      makeParams('999')
    );
    expect(res.status).toBe(404);
  });

  it('stub 분석 성공 시 COMPLETED 상태로 업데이트', async () => {
    mockQuery
      .mockResolvedValueOnce([PLAN_STUB])          // 존재 확인
      .mockResolvedValueOnce(undefined)            // ANALYZING 으로 UPDATE
      .mockResolvedValueOnce(undefined)            // COMPLETED 로 UPDATE
      .mockResolvedValueOnce([{ ...PLAN_STUB, analysis_status: 'COMPLETED', version: 2 }]); // SELECT

    const res = await analyzeCAD(
      makeReq('http://localhost/api/plan/1/analyze_cad?format=dxf', {
        method: 'POST',
        body: JSON.stringify({ additional_instructions: '1층 생산라인 중심으로 분석해 주세요.' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('1')
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.analysis_status).toBe('COMPLETED');

    const completedSql: string = mockQuery.mock.calls[2][0];
    expect(completedSql).toContain("analysis_status = 'COMPLETED'");
    expect(completedSql).toContain('svg_file_path');
  });

  it('additional_instructions 를 ANALYZING UPDATE 에 포함한다', async () => {
    mockQuery
      .mockResolvedValueOnce([PLAN_STUB])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([PLAN_STUB]);

    await analyzeCAD(
      makeReq('http://localhost/api/plan/1/analyze_cad?format=dxf', {
        method: 'POST',
        body: JSON.stringify({ additional_instructions: '추가 정보' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('1')
    );

    const analyzingParams: unknown[] = mockQuery.mock.calls[1][1];
    expect(analyzingParams).toContain('추가 정보');
  });
});
