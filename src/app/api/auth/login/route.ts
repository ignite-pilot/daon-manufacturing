import { NextRequest, NextResponse } from 'next/server';

const LOG_TAG = '[auth/login]';
const IG_MEMBER = process.env.IG_MEMBER_API_URL || 'https://ig-member.ig-pilot.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch((err) => {
      console.error(LOG_TAG, 'body parse failed', err);
      return {};
    });
    const loginId = (body.loginId ?? body.email ?? '').toString().trim();
    const password = body.password != null ? String(body.password) : '';
    if (!loginId || !password) {
      console.warn(LOG_TAG, 'missing email or password');
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해 주세요.' },
        { status: 400 }
      );
    }
    const trimmedEmail = loginId;
    const emailForApi = trimmedEmail ? trimmedEmail.toLowerCase() : '';
    console.info(LOG_TAG, 'attempt', { email: trimmedEmail.replace(/(.{2}).*@/, '$1***@'), url: IG_MEMBER });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    let res: Response;
    try {
      res = await fetch(`${IG_MEMBER}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: emailForApi, password: String(password) }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      const isAbort = fetchErr instanceof Error && fetchErr.name === 'AbortError';
      console.error(LOG_TAG, 'fetch to ig-member failed', {
        error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
        name: fetchErr instanceof Error ? fetchErr.name : undefined,
        aborted: isAbort,
      });
      const msg = isAbort
        ? '로그인 서버 응답 시간 초과'
        : '로그인 서버에 연결할 수 없습니다.';
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    clearTimeout(timeoutId);

    const rawText = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      console.error(LOG_TAG, 'ig-member response not JSON', { status: res.status, bodyPreview: rawText.slice(0, 200) });
    }

    if (res.status === 404) {
      console.info(LOG_TAG, 'trying /api/login (404 on /api/auth/login)');
      const controller2 = new AbortController();
      const t2 = setTimeout(() => controller2.abort(), 12000);
      try {
        res = await fetch(`${IG_MEMBER}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email: emailForApi, password: String(password) }),
          signal: controller2.signal,
        });
        clearTimeout(t2);
        const text2 = await res.text();
        try {
          data = text2 ? JSON.parse(text2) : {};
        } catch {
          data = {};
        }
      } catch (retryErr) {
        clearTimeout(t2);
        console.error(LOG_TAG, 'retry /api/login failed', retryErr);
        return NextResponse.json(
          { error: '로그인 서버에 연결할 수 없습니다.' },
          { status: 502 }
        );
      }
    }

    const errMsg =
      (data.message as string) ||
      (data.error as string) ||
      (data.msg as string) ||
      (data.reason as string) ||
      '';

    if (!res.ok) {
      console.warn(LOG_TAG, 'ig-member non-ok', { status: res.status, dataKeys: Object.keys(data), errMsg });
      return NextResponse.json(
        { error: errMsg || '이메일 또는 비밀번호를 확인해 주세요.' },
        { status: res.status >= 400 ? res.status : 400 }
      );
    }

    if (data.success === false || (data as { success?: boolean }).success === false) {
      console.warn(LOG_TAG, 'ig-member success:false', { dataKeys: Object.keys(data), errMsg });
      return NextResponse.json(
        { error: errMsg || '이메일 또는 비밀번호를 확인해 주세요.' },
        { status: 401 }
      );
    }

    // ig-member 응답 (bnk-mes와 동일): data.data ?? data, token/user/member
    const dataObj = (data.data ?? data) as Record<string, unknown>;
    const token = (
      (data.token ?? data.accessToken ?? data.access_token ?? data.jwt) as string | undefined
    ) ?? (
      (dataObj.token ?? dataObj.accessToken ?? dataObj.access_token ?? dataObj.jwt) as string | undefined
    );
    if (!token) {
      console.error(LOG_TAG, 'no token in response', {
        responseKeys: Object.keys(data),
        dataObjKeys: typeof dataObj === 'object' && dataObj !== null ? Object.keys(dataObj) : [],
        sample: JSON.stringify(data).slice(0, 300),
      });
      return NextResponse.json(
        { error: '토큰을 받지 못했습니다. 관리자에게 문의해 주세요.' },
        { status: 502 }
      );
    }

    const secure = process.env.NODE_ENV === 'production';
    console.info(LOG_TAG, 'success', { email: trimmedEmail.replace(/(.{2}).*@/, '$1***@'), cookieSecure: secure });

    const userPayload = (dataObj.user ?? dataObj.member ?? data.user ?? data.member ?? data) as Record<string, unknown> | undefined;
    const userName = (userPayload?.name ?? userPayload?.nickname ?? userPayload?.loginId ?? userPayload?.username ?? data.name) as string | undefined;
    const userEmail = (userPayload?.email ?? userPayload?.loginId ?? userPayload?.username ?? trimmedEmail) as string | undefined;
    const userForClient = userPayload && typeof userPayload === 'object'
      ? { email: userEmail ?? trimmedEmail, name: userName ?? userEmail ?? trimmedEmail }
      : { email: trimmedEmail, name: userName ?? trimmedEmail };
    const response = NextResponse.json({ ok: true, user: userForClient });
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    // IG_MEMBER에 /api/me 등이 없을 때 로그인 시 저장한 사용자 정보로 상단 표시용
    response.cookies.set('auth_user', JSON.stringify(userForClient), {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (e) {
    console.error(LOG_TAG, 'unexpected error', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
