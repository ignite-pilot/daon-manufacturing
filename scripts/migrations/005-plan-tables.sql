-- 공간 관리 기능 - 도면 관리 테이블 추가
-- plan      : 도면 원장 (업로드 파일 정보 + LLM 분석 산출물 경로 + 상태)
-- plan_upload_audit : 업로드 감사 로그 (악성 파일 탐지 이력 포함)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 도면 원장
-- -----------------------------------------------------------------------------
-- version    : 수정(PUT) 시 서버에서 version + 1 로 갱신
-- original_file_format : 현재 'dxf' 만 허용. 추후 dwg/jpg/png/xlsx/pdf/pptx 추가 예정
-- analysis_status      : PENDING(업로드 완료, 분석 대기) → ANALYZING → COMPLETED | FAILED
-- svg / metadata / analysis_result / analysis_notes 경로 : 분석 전 NULL, 완료 후 채워짐
-- additional_instructions : step 3 에서 이용자가 입력한 도면 분석 보조 정보
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plan (
  id                          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name                        VARCHAR(255)     NOT NULL                   COMMENT '도면 이름',
  version                     INT UNSIGNED     NOT NULL DEFAULT 1         COMMENT '버전 (수정할 때마다 +1)',
  factory_id                  BIGINT UNSIGNED  NULL                       COMMENT '연관 공장 (선택)',

  -- 원본 파일 정보
  original_file_name          VARCHAR(255)     NOT NULL                   COMMENT '업로드 원본 파일명',
  original_file_format        VARCHAR(20)      NOT NULL                   COMMENT '파일 형식: dxf | dwg | jpg | png | xlsx | pdf | pptx',
  original_file_path          VARCHAR(500)     NOT NULL                   COMMENT 'MinIO 오브젝트 공개 URL',

  -- LLM 분석 산출물 경로 (분석 완료 전 NULL)
  svg_file_path               VARCHAR(500)     NULL                       COMMENT '변환된 SVG 파일 MinIO URL',
  metadata_file_path          VARCHAR(500)     NULL                       COMMENT 'JSON 메타데이터 MinIO URL',
  analysis_result_file_path   VARCHAR(500)     NULL                       COMMENT 'LLM 분석 결과 JSON MinIO URL',
  analysis_notes_file_path    VARCHAR(500)     NULL                       COMMENT '추가 수정 내용 텍스트 MinIO URL',

  -- 분석 컨텍스트 및 상태
  additional_instructions     TEXT             NULL                       COMMENT '분석 보조 정보 (step 3 이용자 입력)',
  analysis_status             VARCHAR(20)      NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING | ANALYZING | COMPLETED | FAILED',
  analysis_error              TEXT             NULL                       COMMENT '분석 실패 시 오류 메시지',

  -- 공통 감사 컬럼
  deleted_yn                  CHAR(1)          NOT NULL DEFAULT 'N',
  created_at                  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by                  VARCHAR(100)     NULL,

  PRIMARY KEY (id),
  INDEX idx_plan_factory  (factory_id),
  INDEX idx_plan_deleted  (deleted_yn),
  INDEX idx_plan_status   (analysis_status),

  CONSTRAINT fk_plan_factory
    FOREIGN KEY (factory_id) REFERENCES factory (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공간 관리 - 도면 원장';

-- -----------------------------------------------------------------------------
-- 업로드 감사 로그
-- -----------------------------------------------------------------------------
-- 모든 업로드 시도를 기록 (정상 + 악성 파일 포함)
-- plan_id NULL : 악성 파일 탐지로 plan 레코드가 생성되지 않은 경우
-- malware_detected = 'Y' : 악성 파일 업로드 시도로 판정된 경우
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plan_upload_audit (
  id                    BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  plan_id               BIGINT UNSIGNED  NULL                        COMMENT '생성된 plan ID; 악성 파일이면 NULL',
  uploaded_by           VARCHAR(100)     NOT NULL                    COMMENT '업로드 시도 사용자 (updated_by 형식)',
  ip_address            VARCHAR(50)      NULL                        COMMENT '클라이언트 IP',
  original_file_name    VARCHAR(255)     NOT NULL                    COMMENT '업로드 원본 파일명',
  original_file_format  VARCHAR(20)      NOT NULL                    COMMENT '파일 형식',
  file_size             BIGINT UNSIGNED  NULL                        COMMENT '파일 크기 (bytes)',
  malware_detected      CHAR(1)          NOT NULL DEFAULT 'N'        COMMENT '악성 파일 탐지 여부 (Y/N)',
  malware_detail        TEXT             NULL                        COMMENT '악성 탐지 상세 내용 (차후 구현)',
  upload_at             DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_audit_plan         (plan_id),
  INDEX idx_audit_uploaded_by  (uploaded_by),
  INDEX idx_audit_malware      (malware_detected),

  CONSTRAINT fk_audit_plan
    FOREIGN KEY (plan_id) REFERENCES plan (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공간 관리 - 업로드 감사 로그';

SET FOREIGN_KEY_CHECKS = 1;
