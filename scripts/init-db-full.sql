-- 다온 제조 공정 관리 시스템: DB 생성 + 테이블 일괄 생성
-- 사용: mysql -h <host> -u <user> -p < scripts/init-db-full.sql
-- (접속 정보는 AWS Secrets Manager prod/ignite-pilot/mysql-realpilot 참고)

CREATE DATABASE IF NOT EXISTS `daon_manufacturing` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `daon_manufacturing`;

-- 이하 스키마 (scripts/init-db.sql 와 동일)
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 제조 공장
CREATE TABLE IF NOT EXISTS factory (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL COMMENT '공장 이름',
  zip_code VARCHAR(10) NULL COMMENT '우편번호',
  address VARCHAR(500) NOT NULL COMMENT '주소',
  address_detail VARCHAR(300) NULL COMMENT '상세 주소',
  description TEXT NULL COMMENT '공장 설명',
  area DECIMAL(12,2) NULL COMMENT '면적',
  cad_file_path VARCHAR(500) NULL COMMENT 'CAD 파일 경로',
  deleted_yn CHAR(1) NOT NULL DEFAULT 'N',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(100) NULL,
  PRIMARY KEY (id),
  INDEX idx_factory_deleted (deleted_yn)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='제조 공장';

-- 작업 (공정 단계에서 참조)
CREATE TABLE IF NOT EXISTS work (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL COMMENT '작업 이름',
  estimated_duration_sec INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '예상 소요시간(초)',
  work_type VARCHAR(20) NOT NULL COMMENT '가조립|조립',
  deleted_yn CHAR(1) NOT NULL DEFAULT 'N',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(100) NULL,
  PRIMARY KEY (id),
  INDEX idx_work_deleted (deleted_yn)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='작업';

-- 기계
CREATE TABLE IF NOT EXISTS machine (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  factory_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL COMMENT '기계 이름',
  total_duration_sec INT UNSIGNED NULL DEFAULT 0 COMMENT '기계 소요시간(초)',
  photo_url VARCHAR(500) NULL,
  description TEXT NULL,
  manufacturer VARCHAR(200) NULL,
  as_contact VARCHAR(100) NULL COMMENT 'AS 담당자',
  as_phone VARCHAR(50) NULL COMMENT 'AS 연락처',
  introduced_at DATETIME NULL COMMENT '도입일시',
  location_in_factory VARCHAR(200) NULL COMMENT '공장내 위치',
  deleted_yn CHAR(1) NOT NULL DEFAULT 'N',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(100) NULL,
  PRIMARY KEY (id),
  INDEX idx_machine_factory (factory_id),
  INDEX idx_machine_deleted (deleted_yn),
  CONSTRAINT fk_machine_factory FOREIGN KEY (factory_id) REFERENCES factory (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='기계';

-- 부품
CREATE TABLE IF NOT EXISTS part (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  factory_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL COMMENT '부품 이름',
  photo_url VARCHAR(500) NULL,
  description TEXT NULL,
  manufacturer VARCHAR(200) NULL,
  as_contact VARCHAR(100) NULL,
  as_phone VARCHAR(50) NULL,
  deleted_yn CHAR(1) NOT NULL DEFAULT 'N',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(100) NULL,
  PRIMARY KEY (id),
  INDEX idx_part_factory (factory_id),
  INDEX idx_part_deleted (deleted_yn),
  CONSTRAINT fk_part_factory FOREIGN KEY (factory_id) REFERENCES factory (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='부품';

-- 공정
CREATE TABLE IF NOT EXISTS process (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  factory_id BIGINT UNSIGNED NOT NULL,
  product_name VARCHAR(200) NOT NULL COMMENT '대상 완제품',
  process_name VARCHAR(200) NOT NULL COMMENT '공정 이름',
  total_duration_sec INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '전체 소요시간(초)',
  description TEXT NULL,
  deleted_yn CHAR(1) NOT NULL DEFAULT 'N',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(100) NULL,
  PRIMARY KEY (id),
  INDEX idx_process_factory (factory_id),
  INDEX idx_process_deleted (deleted_yn),
  CONSTRAINT fk_process_factory FOREIGN KEY (factory_id) REFERENCES factory (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공정';

-- 공정 단계 (작업 N개 순서). work_id NULL = 단계만 있고 작업 없음
CREATE TABLE IF NOT EXISTS process_step (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  process_id BIGINT UNSIGNED NOT NULL,
  work_id BIGINT UNSIGNED NULL COMMENT '작업 ID; NULL이면 단계만 표시',
  step_order INT UNSIGNED NOT NULL DEFAULT 0,
  actual_duration_min INT UNSIGNED NULL DEFAULT NULL COMMENT '실 소요시간(초, 컬럼명은 min이지만 초 단위 저장)',
  description TEXT NULL,
  PRIMARY KEY (id),
  INDEX idx_process_step_process (process_id),
  INDEX idx_process_step_work (work_id),
  CONSTRAINT fk_process_step_process FOREIGN KEY (process_id) REFERENCES process (id) ON DELETE CASCADE,
  CONSTRAINT fk_process_step_work FOREIGN KEY (work_id) REFERENCES work (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공정 단계';

-- 작업-부품 (N:N)
CREATE TABLE IF NOT EXISTS work_part (
  work_id BIGINT UNSIGNED NOT NULL,
  part_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (work_id, part_id),
  CONSTRAINT fk_work_part_work FOREIGN KEY (work_id) REFERENCES work (id) ON DELETE CASCADE,
  CONSTRAINT fk_work_part_part FOREIGN KEY (part_id) REFERENCES part (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 작업-기계 (N:N)
CREATE TABLE IF NOT EXISTS work_machine (
  work_id BIGINT UNSIGNED NOT NULL,
  machine_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (work_id, machine_id),
  CONSTRAINT fk_work_machine_work FOREIGN KEY (work_id) REFERENCES work (id) ON DELETE CASCADE,
  CONSTRAINT fk_work_machine_machine FOREIGN KEY (machine_id) REFERENCES machine (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 작업 세부 공정 단계 (작업 내 단계)
CREATE TABLE IF NOT EXISTS work_step (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  work_id BIGINT UNSIGNED NOT NULL,
  step_order INT UNSIGNED NOT NULL DEFAULT 0,
  step_name VARCHAR(200) NOT NULL COMMENT '세부 공정 이름',
  duration_min INT UNSIGNED NULL DEFAULT 0,
  description TEXT NULL,
  PRIMARY KEY (id),
  INDEX idx_work_step_work (work_id),
  CONSTRAINT fk_work_step_work FOREIGN KEY (work_id) REFERENCES work (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='작업 세부 단계';

-- 작업 단계별 사용 부품
CREATE TABLE IF NOT EXISTS work_step_part (
  work_step_id BIGINT UNSIGNED NOT NULL,
  part_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (work_step_id, part_id),
  CONSTRAINT fk_work_step_part_step FOREIGN KEY (work_step_id) REFERENCES work_step (id) ON DELETE CASCADE,
  CONSTRAINT fk_work_step_part_part FOREIGN KEY (part_id) REFERENCES part (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 작업 단계별 사용 기계
CREATE TABLE IF NOT EXISTS work_step_machine (
  work_step_id BIGINT UNSIGNED NOT NULL,
  machine_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (work_step_id, machine_id),
  CONSTRAINT fk_work_step_machine_step FOREIGN KEY (work_step_id) REFERENCES work_step (id) ON DELETE CASCADE,
  CONSTRAINT fk_work_step_machine_machine FOREIGN KEY (machine_id) REFERENCES machine (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기계 동작 순서
CREATE TABLE IF NOT EXISTS machine_operation_step (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  machine_id BIGINT UNSIGNED NOT NULL,
  step_order INT UNSIGNED NOT NULL DEFAULT 0,
  step_name VARCHAR(200) NOT NULL COMMENT '순서 이름',
  duration_min INT UNSIGNED NULL DEFAULT 0 COMMENT '세부 소요시간(분)',
  description TEXT NULL,
  PRIMARY KEY (id),
  INDEX idx_machine_op_machine (machine_id),
  CONSTRAINT fk_machine_op_machine FOREIGN KEY (machine_id) REFERENCES machine (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='기계 동작 순서';

-- 기계 동작 단계별 필요 부품 (선택: JSON 대신 테이블)
CREATE TABLE IF NOT EXISTS machine_operation_step_part (
  operation_step_id BIGINT UNSIGNED NOT NULL,
  part_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (operation_step_id, part_id),
  CONSTRAINT fk_mop_part_step FOREIGN KEY (operation_step_id) REFERENCES machine_operation_step (id) ON DELETE CASCADE,
  CONSTRAINT fk_mop_part_part FOREIGN KEY (part_id) REFERENCES part (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기계 필수 부품 (선택)
CREATE TABLE IF NOT EXISTS machine_required_part (
  machine_id BIGINT UNSIGNED NOT NULL,
  part_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (machine_id, part_id),
  CONSTRAINT fk_machine_req_part_machine FOREIGN KEY (machine_id) REFERENCES machine (id) ON DELETE CASCADE,
  CONSTRAINT fk_machine_req_part_part FOREIGN KEY (part_id) REFERENCES part (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='기계 필수 부품';

SET FOREIGN_KEY_CHECKS = 1;
