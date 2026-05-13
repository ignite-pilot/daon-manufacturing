/**
 * API 요청 시 쿠키(auth_token)를 포함해 보냅니다. Vite 프록시가 /api → Next(3000)로 전달합니다.
 */
export function apiFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

export async function apiGet(path) {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/**
 * JSON을 주고받는 범용 API 헬퍼.
 * options.body 가 객체이면 자동으로 JSON.stringify 합니다.
 * 성공 시 파싱된 JSON을 반환, 실패 시 에러를 throw 합니다.
 */
export async function api(url, options = {}) {
  const { body, ...rest } = options;
  const res = await apiFetch(url, {
    ...rest,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(text);
  }
  return res.json().catch(() => null);
}

/** S3 비공개 객체 보기용 presigned URL (보기 링크·미리보기 이미지에 사용) */
export function getPhotoViewUrl(storedUrl) {
  if (!storedUrl || typeof storedUrl !== 'string') return '';
  return `/api/upload/presign?url=${encodeURIComponent(storedUrl)}`;
}
