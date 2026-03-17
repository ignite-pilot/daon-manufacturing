const DAUM_SCRIPT_URL = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

function loadScript() {
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

export function openDaumPostcode() {
  return new Promise((resolve, reject) => {
    loadScript()
      .then(() => {
        const Postcode = window.daum?.Postcode ?? window.kakao?.Postcode;
        if (!Postcode) {
          reject(new Error('Daum Postcode API not available'));
          return;
        }
        new Postcode({
          oncomplete(data) {
            const addr = data.userSelectedType === 'R' ? data.roadAddress : (data.jibunAddress || data.roadAddress);
            const extra = data.buildingName ? ` ${data.buildingName}` : '';
            resolve({ address: addr + extra, zonecode: data.zonecode || '' });
          },
          onclose() {
            reject(new Error('cancelled'));
          },
        }).open();
      })
      .catch(reject);
  });
}
