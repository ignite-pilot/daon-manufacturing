-- 도면 심볼과 작업(Work)을 연결하는 컬럼 추가
-- Station / Buffer / Conveyor 심볼은 실제 작업(Work)에 사용되는 대상이므로
-- plan_symbol_overrides 에 work_id 를 저장하여 연결 관계를 기록한다.
ALTER TABLE plan_symbol_overrides
  ADD COLUMN work_id BIGINT UNSIGNED NULL AFTER annotation_id,
  ADD CONSTRAINT fk_symbol_overrides_work
    FOREIGN KEY (work_id) REFERENCES work(id) ON DELETE SET NULL;
