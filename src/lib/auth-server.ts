import { cookies } from 'next/headers';

const IG_MEMBER = process.env.IG_MEMBER_API_URL || 'https://ig-member.ig-pilot.com';
const LOG_TAG = '[auth-server getServerUser]';

export interface ServerUser {
  id?: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

/** ig-member 응답 정규화 (bnk-mes와 동일: data / user / body, loginId·nickname 등) */
export function normalizeMeResponse(body: unknown): ServerUser | null {
  if (!body || typeof body !== 'object') return null;
  const raw = (body as { data?: unknown; user?: unknown }).data
    ?? (body as { user?: unknown }).user
    ?? body;
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const name = (r.name ?? r.nickname ?? r.loginId ?? r.username ?? r.email) as string | undefined;
  const email = (r.email ?? r.loginId ?? r.username) as string | undefined;
  if (!name && !email) return null;
  return {
    id: (r.id ?? r.userId) as string | undefined,
    name: name ?? email,
    email,
  };
}

export async function getServerUser(): Promise<ServerUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      console.info(LOG_TAG, '→ initialUser null 이유: no auth_token cookie (레이아웃 요청에 쿠키 없음)');
      return null;
    }
    // bnk-mes와 동일: ig-member는 GET /api/users/me 사용
    let res = await fetch(`${IG_MEMBER}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (res.status === 404) {
      res = await fetch(`${IG_MEMBER}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
    }
    if (res.ok) {
      const body = await res.json().catch(() => null);
      const result = normalizeMeResponse(body);
      if (result) {
        console.info(LOG_TAG, '→ initialUser 있음 (IG_MEMBER)', { hasName: !!result.name, hasEmail: !!result.email });
        return result;
      }
    } else {
      console.warn(LOG_TAG, 'IG_MEMBER not ok', { status: res.status });
    }
    // IG_MEMBER에 me API가 없을 때: 로그인 시 저장한 auth_user 쿠키 사용
    const authUserRaw = cookieStore.get('auth_user')?.value;
    if (authUserRaw) {
      try {
        const stored = JSON.parse(authUserRaw) as { name?: string; email?: string };
        if (stored && (stored.name || stored.email)) {
          console.info(LOG_TAG, '→ initialUser 있음 (auth_user 쿠키)');
          return { name: stored.name, email: stored.email };
        }
      } catch {
        // ignore
      }
    }
    return null;
  } catch (e) {
    console.warn(LOG_TAG, '→ initialUser null 이유: error', e instanceof Error ? e.message : String(e));
    return null;
  }
}

/** 등록/수정 시 수정자로 쓸 값 (name 우선, 없으면 email). API 라우트에서 updated_by 용으로 사용 */
export async function getUpdatedByFromAuth(): Promise<string | null> {
  const user = await getServerUser();
  return user?.name ?? user?.email ?? null;
}
