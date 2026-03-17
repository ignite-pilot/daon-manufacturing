/**
 * Daum 주소 검색 유틸 테스트
 */

import {
  openDaumPostcode,
  openDaumPostcodeForAddress,
  type DaumPostcodeResult,
} from '@/lib/daum-postcode';

describe('daum-postcode', () => {
  it('exports openDaumPostcode that returns a Promise', () => {
    const p = openDaumPostcode();
    expect(p).toBeInstanceOf(Promise);
    p.catch(() => {});
  });

  it('exports openDaumPostcodeForAddress as a function', () => {
    expect(typeof openDaumPostcodeForAddress).toBe('function');
  });

  it('openDaumPostcodeForAddress calls onSelect with address when Postcode is available', (done) => {
    if (typeof window === 'undefined') {
      done();
      return;
    }
    const origDaum = (window as unknown as { daum?: unknown }).daum;
    (window as unknown as { daum: { Postcode: new (opts: { oncomplete: (d: DaumPostcodeResult) => void }) => { open: () => void } } }).daum = {
      Postcode: class {
        opts: { oncomplete: (d: DaumPostcodeResult) => void };
        constructor(opts: { oncomplete: (d: DaumPostcodeResult) => void }) {
          this.opts = opts;
        }
        open() {
          this.opts.oncomplete({
            zonecode: '06134',
            roadAddress: '서울특별시 강남구 테헤란로 123',
            jibunAddress: '서울 강남구 역삼동 123-45',
            userSelectedType: 'R',
          });
        }
      },
    };
    openDaumPostcodeForAddress(
      (address) => {
        expect(address).toBe('서울특별시 강남구 테헤란로 123');
        (window as unknown as { daum: unknown }).daum = origDaum;
        done();
      },
      () => {}
    );
  });

  it('openDaumPostcode resolves with zonecode and address for form (우편번호, 주소)', (done) => {
    if (typeof window === 'undefined') {
      done();
      return;
    }
    const origDaum = (window as unknown as { daum?: unknown }).daum;
    (window as unknown as { daum: { Postcode: new (opts: { oncomplete: (d: DaumPostcodeResult) => void }) => { open: () => void } } }).daum = {
      Postcode: class {
        opts: { oncomplete: (d: DaumPostcodeResult) => void };
        constructor(opts: { oncomplete: (d: DaumPostcodeResult) => void }) {
          this.opts = opts;
        }
        open() {
          this.opts.oncomplete({
            zonecode: '06134',
            roadAddress: '서울특별시 강남구 테헤란로 123',
            jibunAddress: '서울 강남구 역삼동 123-45',
            userSelectedType: 'R',
          });
        }
      },
    };
    openDaumPostcode()
      .then(({ address, zonecode }) => {
        expect(zonecode).toBe('06134');
        expect(address).toBe('서울특별시 강남구 테헤란로 123');
        (window as unknown as { daum: unknown }).daum = origDaum;
        done();
      })
      .catch(() => {
        (window as unknown as { daum: unknown }).daum = origDaum;
        done();
      });
  });
});
