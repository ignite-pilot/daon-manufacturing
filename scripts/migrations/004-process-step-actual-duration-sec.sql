-- 공정 단계 소요시간 단위 변경: 분(actual_duration_min) → 초(actual_duration_sec)
-- 기존 컬럼이 INT 또는 DECIMAL 모두 분 단위이므로 * 60 으로 초 변환 후 새 컬럼으로 이전

ALTER TABLE process_step
  ADD COLUMN actual_duration_sec INT UNSIGNED NULL DEFAULT NULL COMMENT '실 소요시간(초)' AFTER step_order;

UPDATE process_step
SET actual_duration_sec = CASE
  WHEN actual_duration_min IS NULL THEN NULL
  ELSE LEAST(2147483647, GREATEST(0, ROUND(actual_duration_min * 60)))
END;

ALTER TABLE process_step
  DROP COLUMN actual_duration_min;
