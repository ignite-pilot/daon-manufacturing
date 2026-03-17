# 프론트엔드: bnk-mes와 동일한 기술 (Vite + React + React Router)

다온 제조 공정 관리의 **UI는 bnk-mes와 동일하게 Vite SPA**로만 동작합니다.

## 기술 스택 (bnk-mes와 동일)

| 구분 | 기술 |
|------|------|
| 프론트엔드 | **Vite** + React + **React Router** (클라이언트 전용, 하이드레이션 없음) |
| API 서버 | Next.js (API 라우트만 사용, `/api/*`) |

## 실행 방법

```bash
npm install
npm run dev
```

- **프론트엔드(앱)**: **http://localhost:3500** ← 여기서 로그인·공장/공정/작업/기계/부품 관리
- **API**: http://localhost:3000 (Vite가 `/api` 요청을 3000으로 프록시)

`http://localhost:3000` 으로 접속하면 "앱 열기 (localhost:3500)" 안내 페이지가 나옵니다.

## 포트

- **3500** — Vite 프론트엔드 (앱 접속 주소)
- **3000** — Next.js API (`dev:server`)

`npm run dev` 시 Next는 3000, Vite는 3500에서 실행되며, Vite가 `/api`를 3000으로 프록시합니다. **package.json**에서 `dev:server`를 `next dev -p 3000`으로 두세요.

## 빌드

```bash
npm run build          # Vite 빌드 + Next 빌드
npm run build:client   # Vite SPA만 빌드 → client/dist
```

## 폴더 구조

- **client/** — Vite SPA 소스 (bnk-mes의 `src/`와 동일 역할)
  - `client/src/main.jsx`, `App.jsx`, `pages/`, `components/`, `context/`
- **src/app/** — Next.js는 **API 전용**
  - `src/app/api/*` — API 라우트만 유지
  - `src/app/layout.tsx`, `page.tsx`, `login/page.tsx`, `[[...slug]]/page.tsx` — 최소 안내 페이지만 유지 (실제 UI 없음)

이제 **하이드레이션을 사용하지 않으며**, bnk-mes와 동일한 방식으로 동작합니다.
