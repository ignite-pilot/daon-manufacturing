import { NextRequest } from 'next/server';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export function getPagination(req: NextRequest) {
  const page = Math.max(1, Math.floor(Number(req.nextUrl.searchParams.get('page')) || DEFAULT_PAGE));
  const pageSize = Math.min(100, Math.max(1, Math.floor(Number(req.nextUrl.searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE)));
  const offset = Math.floor((page - 1) * pageSize);
  return { page, pageSize, offset };
}

export function getUpdatedBy(req: NextRequest): string | null {
  return req.headers.get('x-user-id') || req.headers.get('x-user-name') || null;
}
