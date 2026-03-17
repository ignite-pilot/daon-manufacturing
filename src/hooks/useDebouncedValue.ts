import { useEffect, useState } from 'react';

/**
 * value를 delay(ms) 후에 반영한 값을 반환.
 * 입력 시 바로바로 검색하되, 연속 입력 시 마지막 입력 기준으로만 API 호출하기 위해 사용.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
