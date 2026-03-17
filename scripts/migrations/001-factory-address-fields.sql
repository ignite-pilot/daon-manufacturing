-- 기존 factory 테이블에 우편번호, 상세 주소 컬럼 추가
-- 사용법: 적용할 DB 선택 후 본 스크립트 실행 (이미 컬럼이 있으면 오류 발생 시 스킵)
-- ALTER 전에 컬럼 존재 여부 확인 권장: SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='factory' AND COLUMN_NAME='zip_code';

ALTER TABLE factory
  ADD COLUMN zip_code VARCHAR(10) NULL COMMENT '우편번호' AFTER name,
  ADD COLUMN address_detail VARCHAR(300) NULL COMMENT '상세 주소' AFTER address;
