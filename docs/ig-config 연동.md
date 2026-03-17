# config-manager(ig-pilot) 연동 (DAON_MFG)

설정 화면 **config-manager.ig-pilot.com** 앱 설정과 동일한 **앱 코드**, **API Key**를 사용합니다.

## 현재 구현

- **앱 코드**: `IG_CONFIG_APP_CODE=DAON_MFG` (기본값, 설정 화면과 동일)
- **인증**: ig-config-manager README "외부 연동 API (v1)" — **X-API-Key** + **X-App-Code** 헤더 이중 인증
- **API 베이스**: `CONFIG_MANAGER_API_URL` 미설정 시 `https://config-manager.ig-pilot.com`
- **완제품 코드**: `src/lib/ig-config-manager-client.ts`에서 조회
  - `GET {base}/api/v1/codes/PRODUCT_CODE`
  - 헤더: `X-API-Key: {IG_CONFIG_API_KEY}`, `X-App-Code: {IG_CONFIG_APP_CODE}` (기본 DAON_MFG)
  - 응답: README 형식 `{ code: { children: [...] } }` 에서 value 수집
  - `CONFIG_MANAGER_PRODUCT_CODES_URL` 설정 시 해당 URL만 사용
- **제공 API**: `GET /api/config/product-codes` → `{ items: string[] }`

## 환경 변수

| 변수 | 설명 | 예시 |
|------|------|------|
| `IG_CONFIG_APP_CODE` | 앱 코드 (설정 화면과 동일) | `DAON_MFG` |
| `IG_CONFIG_API_KEY` | 설정 화면에서 복사한 API Key | (설정 화면에서 복사) |
| `CONFIG_MANAGER_API_URL` | config-manager API 베이스 (미설정 시 기본값 사용) | `https://config-manager.ig-pilot.com` |
| `CONFIG_MANAGER_PRODUCT_CODES_URL` | PRODUCT_CODE 조회 **전체 URL** (config-manager 경로가 다를 때만 설정) | (선택) |
| `PRODUCT_CODES_API_URL` | 완제품 코드 **전체 URL** 지정 시 이 URL만 사용 (config-manager 미호출) | (선택) |
| `PRODUCT_CODE` | API 미사용 시 로컬 완제품 코드 (쉼표/JSON). **IG_CONFIG_API_KEY 있으면 사용 안 함** | `CODE-A,CODE-B` |

`.env.local` 예시 (설정 화면 정보 기준):

```bash
IG_CONFIG_APP_CODE=DAON_MFG
IG_CONFIG_API_KEY=440f3827f93d403ea70e3b73f1e9d418
# CONFIG_MANAGER_API_URL 미설정 시 https://config-manager.ig-pilot.com 사용
```

## 조회 순서

1. **PRODUCT_CODES_API_URL** 설정 시 → 해당 URL로만 조회 (API 키 사용 시 헤더는 해당 서비스 문서 참고)
2. **IG_CONFIG_API_KEY** 설정 시 → ig-config-manager에서 **PRODUCT_CODE** 조회 (README 기준)
   - **CONFIG_MANAGER_PRODUCT_CODES_URL** 있으면 해당 URL만 호출
   - 없으면 `GET {CONFIG_MANAGER_API_URL}/api/v1/codes/PRODUCT_CODE`, 헤더 `X-API-Key: {IG_CONFIG_API_KEY}`
3. 그 외 → 환경 변수 **PRODUCT_CODE**(쉼표 구분 또는 JSON 배열) 사용

## 공정 관리에서의 사용

- **공정 등록/수정**: "대상 완제품" 셀렉트에 위 순서로 조회한 목록 노출
- **공정 목록 검색**: "완제품 이름" 필터도 동일

## 연동 기준 (README)

연동 방식은 **ig-config-manager** 공식 문서를 따릅니다.

- **문서**: [ig-config-manager README](https://github.com/ignite-pilot/ig-config-manager/blob/main/README.md)
- **API 경로**: `GET {base}/api/v1/codes/{codeKey}` (예: `PRODUCT_CODE`)
- **인증**: 요청 헤더 `X-API-Key: {API_KEY}` (README에 명시된 인증 방식)
- **환경 변수**: `CONFIG_MANAGER_API_URL`(베이스 URL), `IG_CONFIG_API_KEY`(API 키)

README에서 base URL·헤더 이름·경로가 다르게 명시되어 있으면 해당 내용에 맞춰 수정할 수 있습니다.

## 완제품 코드가 안 나올 때 (서버 로그 확인)

서버 로그에 `[ig-config-manager]` 가 출력됩니다.

- **401 / X-API-Key 헤더 필요**: `IG_CONFIG_API_KEY` 가 설정돼 있는지, README의 인증 방식과 동일한 헤더를 쓰는지 확인.
- **404 또는 HTML 반환**: `CONFIG_MANAGER_API_URL` 이 실제 서비스 주소인지, README의 API 경로와 일치하는지 확인.
- **다른 base/경로 사용 시**: `.env.local` 에 `CONFIG_MANAGER_PRODUCT_CODES_URL=https://실제호스트/실제/경로` 로 전체 URL을 지정할 수 있습니다.

**디버그 스크립트:** `node scripts/debug-product-codes.js` 로 현재 설정의 URL·헤더·응답을 확인할 수 있습니다.
