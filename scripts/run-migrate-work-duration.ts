/**
 * 작업(work) 테이블 estimated_duration_min → estimated_duration_sec 마이그레이션 실행
 */
import * as fs from 'fs';
import * as path from 'path';
import mysql from 'mysql2/promise';
import { getDbConfig } from '../src/lib/db-config';

async function main() {
  const config = await getDbConfig();
  if (!config.user || !config.password) {
    console.error('DB 접속 정보를 가져올 수 없습니다.');
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
  const sqlPath = path.join(process.cwd(), 'scripts', 'migrate-work-duration-to-sec.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await conn.query(sql);
  await conn.end();
  console.log('마이그레이션 완료: work.estimated_duration_min → estimated_duration_sec');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
