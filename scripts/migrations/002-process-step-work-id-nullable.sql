-- 작업 없는 단계(단계만 있고 하위 작업이 없음) 저장 지원
-- work_id NULL = 단계 헤더만 있는 행 (description에 단계명·설명 인코딩)
-- 사용법: 적용할 DB 선택 후 본 스크립트 실행

ALTER TABLE process_step
  DROP FOREIGN KEY fk_process_step_work;

ALTER TABLE process_step
  MODIFY work_id BIGINT UNSIGNED NULL COMMENT '작업 ID; NULL이면 단계만 표시(작업 없음)';

ALTER TABLE process_step
  ADD CONSTRAINT fk_process_step_work FOREIGN KEY (work_id) REFERENCES work (id) ON DELETE RESTRICT;
