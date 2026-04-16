import { useEffect, useRef } from 'react';
import { apiFetch } from '../../lib/api';
import usePageLeaveBlocker from '../../hooks/usePageLeaveBlocker';

const LEAVE_WARNING =
  '도면 분석 중입니다. 페이지를 이동할 경우 정보가 소멸되거나 ' +
  '도면 분석 서비스를 더 이상 이용하지 못할 수 있습니다. ' +
  '도면 분석이 끝나기 전까지 페이지 이동을 하지 마시기를 강력히 권장합니다.';

/**
 * 도면 분석 대기 모달 (spec step 4)
 *
 * - 마운트 즉시 analyze_cad API 를 호출하고 응답을 기다린다.
 * - 분석 완료(성공·실패) 시 onComplete({ success, error? }) 를 호출한다.
 * - 모달이 열려 있는 동안 페이지 이탈을 차단한다.
 * - 닫기 버튼이 없으며 사용자가 임의로 닫을 수 없다.
 *
 * @param {{ planId: number, instructions: string|null, format: string }} props.target
 * @param {function} props.onComplete
 */
export default function AnalyzingModal({ target, onComplete }) {
  const { planId, instructions, format } = target;
  const calledRef = useRef(false);

  // 페이지 이탈 방지 (브라우저 + React Router)
  usePageLeaveBlocker(true, LEAVE_WARNING);

  // 분석 API 호출 (마운트 1회)
  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    let cancelled = false;

    apiFetch(`/api/plan/${planId}/analyze_cad?format=${format ?? 'dxf'}`, {
      method: 'POST',
      body: JSON.stringify({ additional_instructions: instructions }),
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          onComplete({ success: true });
        } else {
          const d = await res.json().catch(() => ({}));
          onComplete({ success: false, error: d?.error || `HTTP ${res.status}` });
        }
      })
      .catch((e) => {
        if (!cancelled) onComplete({ success: false, error: e.message || '알 수 없는 오류' });
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 의도적으로 빈 배열 — 마운트 1회만 실행

  return (
    <div className="analyzing-overlay" role="dialog" aria-modal="true" aria-label="도면 분석 중">
      <div className="analyzing-card">
        {/* spinner */}
        <div className="plan-spinner analyzing-spinner" />

        {/* 메시지 */}
        <p className="analyzing-title">도면 분석 중...</p>
        <p className="analyzing-sub">
          도면 분석은 오랜 시간이 걸릴 수 있습니다.
          <br />
          끈기 있게 기다려 주세요.
        </p>

        {/* 이탈 경고 안내 */}
        <p className="analyzing-warn">
          분석이 완료되기 전 페이지를 이동하면 결과가 소멸될 수 있습니다.
        </p>
      </div>
    </div>
  );
}
