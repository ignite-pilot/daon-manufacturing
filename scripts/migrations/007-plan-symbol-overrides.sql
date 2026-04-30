-- plantsim symbol 편집 오버라이드 테이블
-- SVG 분석 결과를 사용자가 직접 수정할 때 원본(SVG/metadata.json)을 변경하지 않고
-- 오버라이드만 별도 저장한다. 재분석 시에도 오버라이드는 독립적으로 유지된다.
--
-- handle       : DXF 엔티티 핸들 (e.g. "73ACE") — SVG의 data-handle 속성과 대응
-- category     : 사용자가 지정한 분류 (원본 data-plantsim-category 대체)
-- description  : 설명 (생략 가능)
-- center_x/y   : 도형 중심 좌표 (SVG 좌표계, 7680×4320 기준)
-- width/height : 오버라이드 너비/높이 (리사이즈 결과; NULL이면 원본 bbox 사용)
-- legend       : 범례 이름 (원본 data-facility 대체)
-- annotation_id: metadata.json annotations[].id 참조 (생략 가능)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS plan_symbol_overrides (
  id            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  plan_id       BIGINT UNSIGNED  NOT NULL                    COMMENT '대상 도면 ID',
  handle        VARCHAR(30)      NOT NULL                    COMMENT 'DXF 엔티티 핸들 (SVG data-handle)',
  category      VARCHAR(20)      NOT NULL                    COMMENT 'STATION | CONVEYOR | BUFFER | FOOTPATH | UNDEFINED',
  description   TEXT             NULL                        COMMENT '설명 (생략 가능)',
  center_x      DECIMAL(12,4)    NULL                        COMMENT 'SVG 좌표 중심 X (drag 결과)',
  center_y      DECIMAL(12,4)    NULL                        COMMENT 'SVG 좌표 중심 Y (drag 결과)',
  width         DECIMAL(12,4)    NULL                        COMMENT '오버라이드 너비 (resize 결과)',
  height        DECIMAL(12,4)    NULL                        COMMENT '오버라이드 높이 (resize 결과)',
  legend        VARCHAR(100)     NULL                        COMMENT '범례 이름 (SVG data-facility)',
  annotation_id INT              NULL                        COMMENT 'metadata.json annotations[].id 참조',

  created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by    VARCHAR(100)     NULL,

  PRIMARY KEY (id),
  UNIQUE KEY  uk_plan_handle (plan_id, handle),
  INDEX       idx_pso_plan_id (plan_id),

  CONSTRAINT fk_pso_plan
    FOREIGN KEY (plan_id) REFERENCES plan (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='plantsim symbol 편집 오버라이드';

SET FOREIGN_KEY_CHECKS = 1;
