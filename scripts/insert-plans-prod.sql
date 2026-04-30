SET NAMES utf8mb4;

INSERT INTO plan (
  id, name, version, factory_id, building, floor,
  original_file_name, original_file_format, original_file_path,
  svg_file_path, metadata_file_path,
  analysis_result_file_path, analysis_notes_file_path,
  additional_instructions, analysis_status, analysis_error,
  deleted_yn, created_at, updated_at, updated_by
) VALUES
(
  2,
  'Line 51 도면',
  1,
  NULL,
  '미지정',
  '1',
  'line51_layout.dxf',
  'dxf',
  'https://ignite-pilot-s3-1.s3.ap-northeast-2.amazonaws.com/daon-manufacturing/plans/seed/original.dxf',
  'https://ignite-pilot-s3-1.s3.ap-northeast-2.amazonaws.com/daon-manufacturing/plans/2/drawing.svg',
  'https://ignite-pilot-s3-1.s3.ap-northeast-2.amazonaws.com/daon-manufacturing/plans/2/metadata.json',
  NULL,
  NULL,
  NULL,
  'COMPLETED',
  NULL,
  'N',
  '2026-04-21 03:58:28',
  '2026-04-21 03:58:28',
  'system-seed'
),
(
  4,
  'Line 51 분석본 (Cropped)',
  4,
  NULL,
  '미지정',
  '1',
  'daon_layout_line51_cropped.dxf',
  'dxf',
  'https://ignite-pilot-s3-1.s3.ap-northeast-2.amazonaws.com/daon-manufacturing/plans/ea04882f-a248-4e52-9025-8a004386e32f-daon_layout_line51_cropped.dxf',
  'https://ignite-pilot-s3-1.s3.ap-northeast-2.amazonaws.com/daon-manufacturing/plans/4/drawing.svg',
  'https://ignite-pilot-s3-1.s3.ap-northeast-2.amazonaws.com/daon-manufacturing/plans/4/metadata.json',
  'https://ignite-pilot-s3-1.s3.ap-northeast-2.amazonaws.com/daon-manufacturing/plans/4/analysis_result.json',
  'https://ignite-pilot-s3-1.s3.ap-northeast-2.amazonaws.com/daon-manufacturing/plans/4/analysis_notes.txt',
  NULL,
  'COMPLETED',
  NULL,
  'N',
  '2026-04-23 09:28:05',
  '2026-04-23 14:38:19',
  'Hwan Cho'
);
