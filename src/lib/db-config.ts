/**
 * DB 접속 설정.
 * - local profile (PROFILE=local 또는 DB_HOST 환경변수 존재 시): 환경변수에서 직접 읽음
 * - default profile: AWS Secrets Manager "prod/ignite-pilot/mysql-realpilot"에서 조회
 */
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

const SECRET_ID = 'prod/ignite-pilot/mysql-realpilot';

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

let cached: DbConfig | null = null;

/**
 * DB 접속 정보 반환.
 * - local profile (PROFILE=local 또는 DB_HOST): 환경변수 직접 사용
 * - default profile: AWS Secrets Manager 조회, 결과 캐시
 */
export async function getDbConfig(): Promise<DbConfig> {
  if (cached) return cached;

  // local profile: 환경변수 직접 사용 (Docker MySQL)
  if (process.env.PROFILE === 'local' || process.env.DB_HOST) {
    cached = {
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? '',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'daon_manufacturing',
    };
    return cached;
  }

  // default profile: AWS Secrets Manager
  const client = new SecretsManagerClient({});
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: SECRET_ID })
  );

  if (!response.SecretString) {
    throw new Error(
      `AWS Secrets Manager "${SECRET_ID}": SecretString이 비어 있습니다.`
    );
  }

  const str = response.SecretString.trim();
  let raw: Record<string, unknown>;

  if (str.startsWith('mysql://') || str.startsWith('mysql2://')) {
    try {
      const url = new URL(str);
      raw = {
        host: url.hostname,
        port: url.port || '3306',
        username: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: (url.pathname || '/').replace(/^\//, '') || 'daon_manufacturing',
      };
    } catch {
      throw new Error(
        `AWS Secrets Manager "${SECRET_ID}": 연결 URL 형식이 올바르지 않습니다. (mysql://user:pass@host:port/db)`
      );
    }
  } else {
    try {
      raw = JSON.parse(str) as Record<string, unknown>;
    } catch {
      throw new Error(
        `AWS Secrets Manager "${SECRET_ID}": SecretString이 JSON 또는 mysql:// URL이 아닙니다.`
      );
    }
  }

  // bnk-mes와 동일: 시크릿 flat JSON 키 (host, user, password, database, port / DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT)
  const data = (raw.credentials as Record<string, unknown>) ?? raw;
  const host = String(data.host ?? data.HOST ?? data.DB_HOST ?? 'localhost');
  const port = Number(data.port ?? data.PORT ?? data.DB_PORT ?? 3306);
  const user = String(data.user ?? data.USER ?? data.DB_USER ?? data.username ?? data.MYSQL_USER ?? '');
  const password = String(data.password ?? data.PASSWORD ?? data.DB_PASSWORD ?? data.MYSQL_PASSWORD ?? '');
  const database = String(
    data.database ?? data.DATABASE ?? data.DB_NAME ?? data.db ?? data.dbname ?? data.DBNAME ?? data.MYSQL_DATABASE ?? 'daon_manufacturing'
  );

  if (!user) {
    throw new Error(
      `AWS Secrets Manager "${SECRET_ID}": user가 비어 있습니다. ` +
        '시크릿 JSON에 user(또는 DB_USER, USER, username), password(또는 DB_PASSWORD), host(또는 DB_HOST), port(또는 DB_PORT), database(또는 DB_NAME) 키가 있는지 확인하세요. (bnk-mes와 동일 키 사용)'
    );
  }

  cached = { host, port, user, password, database };
  return cached;
}
