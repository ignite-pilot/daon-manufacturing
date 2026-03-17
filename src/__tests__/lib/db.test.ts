/**
 * db: query()는 getDbConfig()로 풀을 만들고 SQL 실행
 */

const mockGetDbConfig = jest.fn();
const mockExecute = jest.fn();
const mockQuery = jest.fn();

jest.mock('@/lib/db-config', () => ({
  getDbConfig: () => mockGetDbConfig(),
}));

jest.mock('mysql2/promise', () => ({
  __esModule: true,
  default: {
    createPool: jest.fn().mockImplementation(() => ({
      execute: mockExecute,
      query: mockQuery,
    })),
  },
}));

describe('db.query', () => {
  beforeEach(() => {
    mockGetDbConfig.mockReset();
    mockExecute.mockReset();
    mockQuery.mockReset();
    mockGetDbConfig.mockResolvedValue({
      host: 'localhost',
      port: 3306,
      user: 'u',
      password: 'p',
      database: 'd',
    });
    mockExecute.mockResolvedValue([['row1', 'row2']]);
    mockQuery.mockResolvedValue([['row1', 'row2']]);
    jest.resetModules();
  });

  it('calls getDbConfig and uses pool to run SQL with params', async () => {
    const { query } = await import('@/lib/db');
    const result = await query('SELECT * FROM t WHERE id = ?', [1]);

    expect(mockGetDbConfig).toHaveBeenCalled();
    expect(mockExecute).toHaveBeenCalledWith('SELECT * FROM t WHERE id = ?', [1]);
    expect(result).toEqual(['row1', 'row2']);
  });

  it('runs SQL without params via query', async () => {
    mockQuery.mockResolvedValue([['one']]);
    const { query } = await import('@/lib/db');
    const result = await query('SELECT 1');

    expect(mockQuery).toHaveBeenCalledWith('SELECT 1');
    expect(result).toEqual(['one']);
  });

  it('propagates getDbConfig failure', async () => {
    mockGetDbConfig.mockRejectedValue(new Error('Secrets error'));
    const { query } = await import('@/lib/db');

    await expect(query('SELECT 1')).rejects.toThrow('Secrets error');
  });
});
