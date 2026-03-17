-- 작업(work) 테이블: estimated_duration_min → estimated_duration_sec
-- 기존 분 단위 값을 초로 변환하여 저장 (분 * 60 = 초)

ALTER TABLE work ADD COLUMN estimated_duration_sec INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '예상 소요시간(초)' AFTER name;
UPDATE work SET estimated_duration_sec = IFNULL(estimated_duration_min, 0) * 60 WHERE 1=1;
ALTER TABLE work DROP COLUMN estimated_duration_min;
