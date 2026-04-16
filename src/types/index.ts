export interface Factory {
  id: number;
  name: string;
  zip_code?: string | null;
  address: string;
  address_detail?: string | null;
  description: string | null;
  area: number | null;
  cad_file_path: string | null;
  deleted_yn: 'Y' | 'N';
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface Work {
  id: number;
  name: string;
  estimated_duration_sec: number;
  work_type: '가조립' | '조립';
  deleted_yn: 'Y' | 'N';
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface Machine {
  id: number;
  factory_id: number;
  name: string;
  total_duration_sec: number | null;
  photo_url: string | null;
  description: string | null;
  manufacturer: string | null;
  as_contact: string | null;
  as_phone: string | null;
  introduced_at: string | null;
  location_in_factory: string | null;
  deleted_yn: 'Y' | 'N';
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface Part {
  id: number;
  factory_id: number;
  name: string;
  photo_url: string | null;
  description: string | null;
  manufacturer: string | null;
  as_contact: string | null;
  as_phone: string | null;
  deleted_yn: 'Y' | 'N';
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface Process {
  id: number;
  factory_id: number;
  product_name: string;
  process_name: string;
  total_duration_sec: number;
  description: string | null;
  deleted_yn: 'Y' | 'N';
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface ProcessStep {
  id: number;
  process_id: number;
  work_id: number;
  step_order: number;
  actual_duration_sec: number | null;
  description: string | null;
}

export type PlanAnalysisStatus = 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';

export interface Plan {
  id: number;
  name: string;
  version: number;
  factory_id: number | null;
  factory_name?: string | null;
  original_file_name: string;
  original_file_format: string;
  original_file_path: string;
  svg_file_path: string | null;
  metadata_file_path: string | null;
  analysis_result_file_path: string | null;
  analysis_notes_file_path: string | null;
  additional_instructions: string | null;
  analysis_status: PlanAnalysisStatus;
  analysis_error: string | null;
  deleted_yn: 'Y' | 'N';
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_DELETE_REFERENCES = 3;
