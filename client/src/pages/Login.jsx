import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

/** prd: 회원 연동 ig-member.ig-pilot.com. 회원가입·비밀번호 찾기는 해당 서비스로 연결 */
const IG_MEMBER_BASE = 'https://ig-member.ig-pilot.com';
const IG_MEMBER_SIGNUP = IG_MEMBER_BASE;
const IG_MEMBER_FORGOT_PASSWORD = `${IG_MEMBER_BASE}/forgot-password`;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, setUser, fetchMe } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate(location.state?.from?.pathname || '/', { replace: true });
    }
  }, [authLoading, user, navigate, location.state?.from?.pathname]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || data?.message || '이메일 또는 비밀번호를 확인해 주세요.';
        setError(msg);
        return;
      }
      // 로그인 응답에 user가 있으면 바로 설정 (auth/me 호출 실패 시에도 진입 가능)
      const userFromRes = data?.user ?? data?.data?.user;
      if (userFromRes) {
        setUser(userFromRes);
      } else {
        await fetchMe();
      }
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center login-page-bg">
        <p style={{ color: '#616161' }}>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 login-page-bg">
      <div className="login-page-box w-full max-w-sm flex flex-col items-center">
        <h1
          className="text-center font-bold mb-8"
          style={{ color: '#212121', fontSize: '26px' }}
        >
          로그인
        </h1>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <label
              className="block font-normal"
              style={{ color: '#212121', fontSize: '16px' }}
              htmlFor="login-email"
            >
              이메일 (아이디)
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded px-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3B7DF0]/30"
              style={{
                background: '#E6F0FF',
                border: 'none',
                height: '48px',
                fontSize: '16px',
              }}
              placeholder="이메일을 입력하세요"
              autoComplete="email"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              className="block font-normal"
              style={{ color: '#212121', fontSize: '16px' }}
              htmlFor="login-password"
            >
              비밀번호
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded px-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3B7DF0]/30"
              style={{
                background: '#E6F0FF',
                border: 'none',
                height: '48px',
                fontSize: '16px',
              }}
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-sm" style={{ color: '#d32f2f' }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="login-page-btn w-full rounded font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#3B7DF0]/50 disabled:opacity-50"
            style={{
              background: '#3B7DF0',
              height: '52px',
              fontSize: '16px',
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <div className="mt-6 flex items-center justify-center gap-3 text-sm" style={{ color: '#374151' }}>
          <a
            href={IG_MEMBER_FORGOT_PASSWORD}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80"
            style={{ color: '#3B7DF0' }}
          >
            비밀번호 찾기
          </a>
          <span style={{ color: '#9e9e9e' }}>|</span>
          <span>
            계정이 없으신가요?{' '}
            <a
              href={IG_MEMBER_SIGNUP}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-80"
              style={{ color: '#3B7DF0' }}
            >
              회원가입
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
