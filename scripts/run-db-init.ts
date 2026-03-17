/**
 * DB 초기화 스크립트
 * - AWS Secrets Manager "prod/ignite-pilot/mysql-realpilot" 사용 (로컬 MySQL 미지원)
 * 실행: npm run db:init
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const { getDbConfig } = await import(path.join(__dirname, '../src/lib/db-config.ts'));
  const config = await getDbConfig();

  if (!config.user || !config.password) {
    console.error(
      'DB 접속 정보를 가져올 수 없습니다. AWS Secrets Manager prod/ignite-pilot/mysql-realpilot 조회에 실패했을 수 있습니다.\n' +
        '  - AWS 인증 확인: ~/.aws/credentials 또는 AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY'
    );
    process.exit(1);
  }

  console.log(`연결 중: ${config.host}:${config.port} / ${config.database}`);

  const conn = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  // DB 생성 + 테이블 생성 한 번에 실행 (init-db-full.sql, 시크릿의 database 이름 사용)
  const fullSqlPath = path.join(__dirname, 'init-db-full.sql');
  let sql = fs.readFileSync(fullSqlPath, 'utf8');
  sql = sql.replace(/`daon_manufacturing`/g, `\`${config.database.replace(/`/g, '``')}\``);
  await conn.query(sql);

  await conn.end();
  console.log('DB 초기화 완료:', config.database);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
