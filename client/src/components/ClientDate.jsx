import { useEffect, useState } from 'react';

export default function ClientDate({ value, fallback = '-', options }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (value == null || value === '') return <>{fallback}</>;
  if (!mounted) return <span>{String(value).slice(0, 19).replace('T', ' ')}</span>;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return <>{fallback}</>;
    return <span>{date.toLocaleString('ko-KR', options ?? { dateStyle: 'short', timeStyle: 'short' })}</span>;
  } catch {
    return <>{fallback}</>;
  }
}
