import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * 페이지 이탈 방지 hook
 *
 * enabled 가 true 인 동안:
 *  - 브라우저 탭 닫기 / 주소창 직접 이동 / 새로고침 → beforeunload 경고
 *  - React Router 내부 라우팅 → confirm dialog 로 차단
 *
 * @param {boolean} enabled   - 차단 활성화 여부
 * @param {string}  message   - confirm dialog 에 표시할 메시지
 */
export default function usePageLeaveBlocker(enabled, message) {
  // ── 브라우저 이탈 (탭 닫기, 새로고침, 외부 URL) ──────────────
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      // 구형 브라우저 호환
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, message]);

  // ── React Router 내부 이동 차단 ──────────────────────────────
  const blocker = useBlocker(enabled);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;

    const confirmed = window.confirm(message);
    if (confirmed) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker, message]);
}
