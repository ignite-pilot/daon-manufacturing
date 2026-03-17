# config-manager(ig-pilot) 설정 화면 vs 프로젝트 설정 비교

이미지: `config-manager.ig-pilot.com/apps/3/settings` (다온 컴퍼니 제조공정 앱 설정)

## 비교 결과

| 항목 | 이미지(설정 화면) | 프로젝트 현재 값 | 일치 여부 |
|------|-------------------|------------------|-----------|
| **앱 코드 (App Code)** | `DAON_MFG` | `ig-config.ts` 기본값 `DAON_MFG`, env `IG_CONFIG_APP_CODE` | ✅ 일치 |
| **API Key** | `440f3827f93d403ea70e3b73f1e9d418` | `.env.local` 의 `IG_CONFIG_API_KEY` | ✅ 일치 |
| **API 호출** | (설정 화면은 조회 API가 아님) | `IG_CONFIG_API_KEY` 설정 시 **config-manager API**에서 코드 조회 | ✅ 연동됨 |

## 코드 조회 흐름

- **앱 코드**·**API Key**는 이미지와 동일하게 사용합니다.
- **완제품 코드(PRODUCT_CODE)** 는 아래 순서로 조회합니다.
  1. `PRODUCT_CODES_API_URL` 이 있으면 → 해당 URL만 호출 (Bearer API Key).
  2. **`IG_CONFIG_API_KEY`만 있으면** → **config-manager API** 호출  
     `GET {CONFIG_MANAGER_API_URL}/api/apps/DAON_MFG/codes/PRODUCT_CODE/items`  
     (기본 base: `https://config-manager.ig-pilot.com`)
  3. 그 외 → 로컬 env `PRODUCT_CODE` (쉼표 구분 또는 JSON 배열).
