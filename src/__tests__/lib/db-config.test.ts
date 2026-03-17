/**
 * db-config: AWS Secrets Manager 기반 DB 설정 조회 테스트
 */

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  GetSecretValueCommand: jest.fn(),
}));

describe('getDbConfig', () => {
  beforeEach(() => {
    mockSend.mockReset();
    jest.resetModules();
  });

  it('returns config from AWS Secrets Manager secret prod/ignite-pilot/mysql-realpilot', async () => {
    mockSend.mockResolvedValue({
      SecretString: JSON.stringify({
        host: 'db.example.com',
        port: 3306,
        username: 'dbuser',
        password: 'secret',
        database: 'daon_manufacturing',
      }),
    });

    const { getDbConfig } = await import('@/lib/db-config');
    const config = await getDbConfig();

    expect(config).toEqual({
      host: 'db.example.com',
      port: 3306,
      user: 'dbuser',
      password: 'secret',
      database: 'daon_manufacturing',
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('accepts alternate secret key names (user, dbname)', async () => {
    mockSend.mockResolvedValue({
      SecretString: JSON.stringify({
        host: 'localhost',
        user: 'root',
        password: 'pwd',
        dbname: 'mydb',
      }),
    });

    jest.resetModules();
    const { getDbConfig } = await import('@/lib/db-config');
    const config = await getDbConfig();

    expect(config.user).toBe('root');
    expect(config.database).toBe('mydb');
    expect(config.port).toBe(3306);
  });

  it('throws when SecretString is empty', async () => {
    mockSend.mockResolvedValue({ SecretString: undefined });

    jest.resetModules();
    const { getDbConfig } = await import('@/lib/db-config');

    await expect(getDbConfig()).rejects.toThrow(/SecretString이 비어 있습니다/);
  });

  it('throws when user is empty after parsing', async () => {
    mockSend.mockResolvedValue({
      SecretString: JSON.stringify({ host: 'localhost', password: 'pwd' }),
    });

    jest.resetModules();
    const { getDbConfig } = await import('@/lib/db-config');

    await expect(getDbConfig()).rejects.toThrow(/user가 비어 있습니다/);
  });

  it('parses bnk-mes style keys (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT)', async () => {
    mockSend.mockResolvedValue({
      SecretString: JSON.stringify({
        DB_HOST: 'rds.bnk.example.com',
        DB_PORT: 3306,
        DB_USER: 'mesuser',
        DB_PASSWORD: 'mespass',
        DB_NAME: 'daon_manufacturing',
      }),
    });

    jest.resetModules();
    const { getDbConfig } = await import('@/lib/db-config');
    const config = await getDbConfig();

    expect(config).toEqual({
      host: 'rds.bnk.example.com',
      port: 3306,
      user: 'mesuser',
      password: 'mespass',
      database: 'daon_manufacturing',
    });
  });

  it('parses mysql:// URL format secret', async () => {
    mockSend.mockResolvedValue({
      SecretString: 'mysql://myuser:mypass@rds.example.com:3306/daon_db',
    });

    jest.resetModules();
    const { getDbConfig } = await import('@/lib/db-config');
    const config = await getDbConfig();

    expect(config).toEqual({
      host: 'rds.example.com',
      port: 3306,
      user: 'myuser',
      password: 'mypass',
      database: 'daon_db',
    });
  });

  it('returns cached config on second call', async () => {
    mockSend.mockResolvedValue({
      SecretString: JSON.stringify({
        host: 'cache.example.com',
        username: 'u',
        password: 'p',
        database: 'd',
      }),
    });

    const { getDbConfig } = await import('@/lib/db-config');
    const first = await getDbConfig();
    const second = await getDbConfig();

    expect(first).toEqual(second);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});
