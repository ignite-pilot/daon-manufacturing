/**
 * DB 연결 (mysql2). AWS Secrets Manager "prod/ignite-pilot/mysql-realpilot"만 사용.
 * 환경 변수는 사용하지 않음.
 * 풀은 프로세스당 1개만 유지(globalThis 캐시)하여 서버리스/멀티 인스턴스 시 연결 수 폭증 방지.
 */
import mysql from 'mysql2/promise';
import { getDbConfig } from '@/lib/db-config';

const globalForDb = globalThis as unknown as { poolPromise: Promise<mysql.Pool> | null };

async function getPool(): Promise<mysql.Pool> {
  if (globalForDb.poolPromise) return globalForDb.poolPromise;
  globalForDb.poolPromise = (async () => {
    const config = await getDbConfig();
    return mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionLimit: 5,
      charset: 'utf8mb4',
    });
  })();
  return globalForDb.poolPromise;
}

/**
 * SQL 실행. SELECT 시 rows 반환, INSERT/UPDATE 등은 result 반환.
 * @param sql SQL 문자열 (placeholder ? 지원)
 * @param params placeholder 파라미터 (선택)
 */
export async function query<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T> {
  const p = await getPool();
  const [rows] =
    params?.length != null && params.length > 0
      ? await p.execute(sql, params)
      : await p.query(sql);
  return rows as T;
}
