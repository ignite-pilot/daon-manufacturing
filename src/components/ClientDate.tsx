'use client';

import { useEffect, useState } from 'react';

/**
 * 서버/클라이언트 날짜 포맷 불일치로 인한 하이드레이션 오류 방지.
 * 마운트 전에는 raw 문자열을, 마운트 후에만 toLocaleString 적용.
 */
export default function ClientDate({
  value,
  fallback = '-',
  options,
}: {
  value: string | null | undefined;
  fallback?: string;
  options?: Intl.DateTimeFormatOptions;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (value == null || value === '') return <>{fallback}</>;
  if (!mounted) {
    return <span suppressHydrationWarning>{value.slice(0, 19).replace('T', ' ')}</span>;
  }
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return <>{fallback}</>;
    return (
      <span suppressHydrationWarning>
        {date.toLocaleString('ko-KR', options ?? { dateStyle: 'short', timeStyle: 'short' })}
      </span>
    );
  } catch {
    return <>{fallback}</>;
  }
}
