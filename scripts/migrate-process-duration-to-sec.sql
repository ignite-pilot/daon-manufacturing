-- 공정(process) 테이블: total_duration_min → total_duration_sec
-- 기존 분 단위 값을 초로 변환하여 저장 (분 * 60 = 초)

ALTER TABLE process ADD COLUMN total_duration_sec INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '전체 소요시간(초)' AFTER process_name;
UPDATE process SET total_duration_sec = IFNULL(total_duration_min, 0) * 60 WHERE 1=1;
ALTER TABLE process DROP COLUMN total_duration_min;
