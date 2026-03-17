/**
 * process_step.work_id NULL 허용 마이그레이션 (작업 없는 단계 저장 지원)
 * DB 접속: getDbConfig() (AWS Secrets Manager prod/ignite-pilot/mysql-realpilot)
 * 실행: npx ts-node -r tsconfig-paths/register scripts/run-migrate-work-id-nullable.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import mysql from 'mysql2/promise';
import { getDbConfig } from '../src/lib/db-config';

async function main() {
  const config = await getDbConfig();

  if (!config.user || !config.password) {
    console.error(
      'DB 접속 정보를 가져올 수 없습니다. AWS Secrets Manager prod/ignite-pilot/mysql-realpilot 조회에 실패했을 수 있습니다.'
    );
    process.exit(1);
  }

  console.log(`연결 중: ${config.host}:${config.port} / ${config.database}`);

  const conn = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  const sqlPath = path.join(process.cwd(), 'scripts', 'migrations', '002-process-step-work-id-nullable.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  await conn.query(sql);
  await conn.end();
  console.log('마이그레이션 완료: process_step.work_id NULL 허용');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
