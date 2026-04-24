-- 도면 원장에 건물·층 컬럼 추가
-- building : 건물 이름 (필수, 빈 값 불허)
-- floor    : 층 (필수, 기본값 '1', 빈 값 불허)
-- 기존 레코드: 임시 기본값 '미지정' / '1' 부여 → 담당자가 직접 수정

SET NAMES utf8mb4;

ALTER TABLE plan
  ADD COLUMN building VARCHAR(100) NOT NULL DEFAULT '미지정' COMMENT '건물 이름' AFTER factory_id,
  ADD COLUMN floor    VARCHAR(20)  NOT NULL DEFAULT '1'     COMMENT '층'       AFTER building;
