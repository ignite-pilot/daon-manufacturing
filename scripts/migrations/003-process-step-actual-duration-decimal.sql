-- 작업 소요시간을 초 단위 입력값이 분 소수로 정확히 저장되도록 (11초 → 0.18분 저장)
-- 기존 INT는 0.18 → 0으로 잘려 저장되던 문제 해결

ALTER TABLE process_step
  MODIFY actual_duration_min DECIMAL(10,2) NULL DEFAULT NULL COMMENT '실 소요시간(분, 소수 허용)';
