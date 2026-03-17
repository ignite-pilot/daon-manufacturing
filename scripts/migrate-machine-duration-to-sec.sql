-- 기계 소요시간 단위 변경: 분 → 초 (기존 데이터는 분*60으로 변환)
-- 기존 DB에 적용 후, init-db.sql은 이미 total_duration_sec 기준으로 수정되어 있음.

ALTER TABLE machine ADD COLUMN total_duration_sec INT UNSIGNED NULL DEFAULT 0 COMMENT '기계 소요시간(초)' AFTER name;
UPDATE machine SET total_duration_sec = IFNULL(total_duration_min, 0) * 60 WHERE 1=1;
ALTER TABLE machine DROP COLUMN total_duration_min;
