/**
 * Daum(카카오) 우편번호 검색 API
 * @see https://postcode.map.daum.net/guide
 */

const DAUM_SCRIPT_URL = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: DaumPostcodeOptions) => { open: () => void };
    };
    kakao?: {
      Postcode: new (options: DaumPostcodeOptions) => { open: () => void };
    };
  }
}

export interface DaumPostcodeResult {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  buildingName?: string;
  userSelectedType: 'R' | 'J';
  [key: string]: unknown;
}

export interface DaumPostcodeOptions {
  oncomplete: (data: DaumPostcodeResult) => void;
  onclose?: () => void;
  onresize?: (size: { width: string; height: string }) => void;
  width?: string;
  height?: string;
  animation?: boolean;
  theme?: object;
  [key: string]: unknown;
}

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('window is undefined'));
  if (window.daum?.Postcode || window.kakao?.Postcode) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = DAUM_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Daum Postcode script load failed'));
    document.head.appendChild(script);
  });
}

/**
 * Daum 주소 검색 팝업을 띄우고, 사용자가 선택한 주소를 반환합니다.
 * @returns Promise<{ address: string; zonecode: string }> 선택 시 resolve, 닫기 시 reject
 */
export function openDaumPostcode(): Promise<{ address: string; zonecode: string }> {
  return new Promise((resolve, reject) => {
    loadScript()
      .then(() => {
        const Postcode = window.daum?.Postcode ?? window.kakao?.Postcode;
        if (!Postcode) {
          reject(new Error('Daum Postcode API not available'));
          return;
        }
        new Postcode({
          oncomplete(data: DaumPostcodeResult) {
            const addr =
              data.userSelectedType === 'R'
                ? data.roadAddress
                : data.jibunAddress || data.roadAddress;
            const extra = data.buildingName ? ` ${data.buildingName}` : '';
            resolve({
              address: addr + extra,
              zonecode: data.zonecode || '',
            });
          },
          onclose() {
            reject(new Error('cancelled'));
          },
        }).open();
      })
      .catch(reject);
  });
}

/**
 * 주소 문자열만 필요할 때 사용. 우편번호는 포함하지 않음.
 */
export function openDaumPostcodeForAddress(
  onSelect: (address: string) => void,
  onCancel?: () => void
): void {
  openDaumPostcode()
    .then(({ address }) => onSelect(address.trim()))
    .catch((err) => {
      if (err?.message !== 'cancelled') console.warn('Daum postcode:', err);
      onCancel?.();
    });
}
