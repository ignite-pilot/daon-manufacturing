import { NextRequest, NextResponse } from 'next/server';
import { normalizeMeResponse } from '@/lib/auth-server';

const IG_MEMBER = process.env.IG_MEMBER_API_URL || 'https://ig-member.ig-pilot.com';
const LOG_TAG = '[api/auth/me]';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, max-age=0',
  Pragma: 'no-cache',
};

function okResponse(user: unknown) {
  return NextResponse.json({ user }, { status: 200, headers: noCacheHeaders });
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value;
    if (!token) {
      console.info(LOG_TAG, 'no auth_token cookie');
      return okResponse(null);
    }

    // local profile: ig-member 검증 없이 auth_user 쿠키에서 바로 반환
    if (process.env.PROFILE === 'local') {
      return fallbackAuthUser(req);
    }

    let res: Response;
    try {
      res = await fetch(`${IG_MEMBER}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        cache: 'no-store',
      });
    } catch (fetchErr) {
      console.warn(LOG_TAG, 'fetch to IG_MEMBER failed', fetchErr instanceof Error ? fetchErr.message : String(fetchErr));
      return fallbackAuthUser(req);
    }

    if (res.status === 404) {
      try {
        res = await fetch(`${IG_MEMBER}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
      } catch {
        return fallbackAuthUser(req);
      }
    }

    if (res.status === 401) {
      console.warn(LOG_TAG, 'IG_MEMBER returned 401, clearing cookie');
      const out = okResponse(null);
      out.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
      return out;
    }

    if (res.ok) {
      const body = await res.json().catch(() => null);
      try {
        const payload = normalizeMeResponse(body);
        if (payload) {
          console.info(LOG_TAG, 'user resolved (IG_MEMBER)');
          return okResponse(payload);
        }
      } catch (normErr) {
        console.warn(LOG_TAG, 'normalizeMeResponse error', normErr instanceof Error ? normErr.message : String(normErr));
      }
    } else {
      console.warn(LOG_TAG, 'IG_MEMBER not ok', { status: res.status });
    }

    return fallbackAuthUser(req);
  } catch (e) {
    console.error(LOG_TAG, 'unexpected error', e instanceof Error ? e.message : String(e), e instanceof Error ? e.stack : '');
    return fallbackAuthUser(req);
  }
}

function fallbackAuthUser(req: NextRequest): NextResponse {
  try {
    const authUserRaw = req.cookies.get('auth_user')?.value;
    if (authUserRaw) {
      const stored = JSON.parse(authUserRaw) as { name?: string; email?: string };
      if (stored && (stored.name || stored.email)) {
        console.info(LOG_TAG, 'user resolved (auth_user 쿠키)');
        return okResponse(stored);
      }
    }
  } catch {
    // ignore parse error
  }
  return okResponse(null);
}
