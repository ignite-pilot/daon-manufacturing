# 다온 제조 공정 관리

Next.js(API) + Vite/React(SPA) 단일 이미지로 구성된 제조 공정 관리 시스템.

---

## 목차

1. [로컬 개발 환경 구성](#1-로컬-개발-환경-구성)
2. [프로젝트 구조](#2-프로젝트-구조)
3. [AWS 인프라 구성](#3-aws-인프라-구성)
4. [배포 프로세스](#4-배포-프로세스)
5. [데이터 동기화](#5-데이터-동기화)

---

## 1. 로컬 개발 환경 구성

### 사전 요구사항

- Node.js 20+
- Docker Desktop
- `.env.local` 파일 (로컬 인프라용 환경변수)

### 로컬 프로필 (Docker 인프라 사용)

`.env.local` 파일이 존재하면 자동으로 로컬 프로필이 적용됩니다.

```bash
npm run infra:up   # MySQL + MinIO Docker 컨테이너 시작
npm run dev        # 개발 서버 시작
                   #   - Next.js API 서버: http://localhost:3000
                   #   - Vite 프론트엔드:  http://localhost:3500
```

### AWS 프로필 (AWS 인프라 직접 연결)

`.env.local`을 제거하면 AWS Secrets Manager에서 DB 접속 정보를 가져옵니다.

```bash
del .env.local     # Windows
# rm .env.local   # Mac/Linux
npm run dev
```

### 주요 npm scripts

| 스크립트 | 설명 |
|---|---|
| `npm run dev` | Next.js(:3000) + Vite(:3500) 동시 실행 |
| `npm run build` | Vite 빌드 → Next.js 빌드 (Docker 이미지용) |
| `npm run infra:up` | 로컬 Docker 인프라(MySQL, MinIO) 시작 |
| `npm run infra:down` | 로컬 Docker 인프라 중지 |
| `npm run infra:logs` | 로컬 Docker 인프라 로그 확인 |

---

## 2. 프로젝트 구조

```
daon-manufacturing/
├── src/                  # Next.js App Router (API 서버)
│   ├── app/api/          # REST API 라우트
│   ├── lib/              # DB, Auth 유틸리티
│   └── types/            # TypeScript 타입 정의
├── client/               # Vite + React (SPA 프론트엔드)
│   └── src/
│       ├── pages/        # 페이지 컴포넌트
│       └── components/   # 공통 컴포넌트
├── scripts/              # DB 마이그레이션, Python 분석 스크립트
│   └── migrations/       # SQL 마이그레이션 파일 (순차 적용)
├── Dockerfile            # 프로덕션 멀티스테이지 빌드
├── docker-compose.dev.yml # 로컬 개발용 인프라 (MySQL, MinIO)
└── next.config.js        # Next.js 설정 (SPA rewrite 포함)
```

**빌드 결과물 구조** (Docker 이미지 내):
- `/.next/` — Next.js 서버 번들 (API + SSR)
- `/public/` — Vite 빌드 결과 (SPA 정적 파일)
- `/scripts/` — DXF 분석용 Python 스크립트
- 포트 **3500** 단일 포트로 API와 SPA 모두 서빙

---

## 3. AWS 인프라 구성

| 항목 | 값 |
|---|---|
| 리전 | `ap-northeast-2` (서울) |
| 도메인 | `daon-manufacturing.ig-pilot.com` |
| ECS 클러스터 | `ig-pilot-ecs` (Fargate) |
| ECS 서비스 | `ig-pilot-daon-manufacturing` |
| ECR 리포지토리 | `575084400422.dkr.ecr.ap-northeast-2.amazonaws.com/daon-manufacturing` |
| 이미지 태그 형식 | `YYYYMMDD-HHMMSS` (배포 시점 타임스탬프) |
| 컨테이너 포트 | `3500` |
| ALB | `ig-pilot-alb-2036329886.ap-northeast-2.elb.amazonaws.com` |
| ALB 라우팅 | `daon-manufacturing.ig-pilot.com` → `ig-daon-manufacturing-tg` |
| DB 접속 정보 | AWS Secrets Manager: `prod/ignite-pilot/mysql-realpilot` |

### 트래픽 흐름

```
사용자 브라우저
  └─▶ Route53 (daon-manufacturing.ig-pilot.com)
        └─▶ ALB (ig-pilot-alb, HTTPS:443)
              └─▶ Target Group (ig-daon-manufacturing-tg)
                    └─▶ ECS Fargate Task (포트 3500)
                          └─▶ Next.js 서버
                                ├─▶ /api/*  → API 처리
                                └─▶ /*      → Vite SPA (index.html)
```

---

## 4. 배포 프로세스

배포는 내부 CD 플랫폼 **aws-simple-deploy** (`https://aws-simple-deploy.ig-pilot.com`)를 통해 수행합니다.

### 4-1. 전체 흐름

```
로컬 개발
  │
  │  (1) 코드 변경 및 로컬 테스트
  ▼
git push → GitHub (main 브랜치)
  │
  │  (2) GitHub에 최신 코드 반영 확인
  ▼
aws-simple-deploy 재배포 트리거
  │
  │  (3) aws-simple-deploy 서비스가 자동으로 수행:
  │       a. GitHub 리포지토리 클론 (main 브랜치)
  │       b. Docker 이미지 빌드 (Dockerfile)
  │       c. ECR push (태그: YYYYMMDD-HHMMSS, latest)
  │       d. ECS Task Definition 신규 revision 등록
  │       e. ECS Service 롤링 업데이트 트리거
  ▼
ECS Fargate 새 태스크 기동 → 구 태스크 종료
  │
  ▼
https://daon-manufacturing.ig-pilot.com 에 반영 완료
```

### 4-2. 배포 실행 방법

**방법 A — 웹 UI (권장)**

1. 브라우저에서 `https://aws-simple-deploy.ig-pilot.com` 접속
2. 서비스 목록에서 **daon-manufacturing** 항목 클릭
3. **재배포** 버튼 클릭
4. 배포 로그를 통해 진행 상태 확인 (약 5~10분 소요)

**방법 B — API 직접 호출**

```bash
curl -X POST https://aws-simple-deploy.ig-pilot.com/api/services/134/redeploy \
  -H "Content-Type: application/json" \
  -d '{"githubUrl":"https://github.com/ignite-pilot/daon-manufacturing"}'
```

### 4-3. 배포 상태 확인

```bash
# ECS 서비스 상태 확인
aws ecs describe-services \
  --cluster ig-pilot-ecs \
  --services ig-pilot-daon-manufacturing \
  --region ap-northeast-2 \
  --query 'services[0].{status:status,running:runningCount,desired:desiredCount}'

# 실행 중인 태스크의 이미지 태그 확인
aws ecs describe-tasks \
  --cluster ig-pilot-ecs \
  --tasks $(aws ecs list-tasks --cluster ig-pilot-ecs --service-name ig-pilot-daon-manufacturing --query 'taskArns[0]' --output text) \
  --region ap-northeast-2 \
  --query 'tasks[0].containers[0].image'
```

### 4-4. 배포 로그 확인

CloudWatch Logs 그룹: `/ecs/ig-pilot-daon-manufacturing`

```bash
aws logs tail /ecs/ig-pilot-daon-manufacturing --follow --region ap-northeast-2
```

---

## 5. 데이터 동기화

### DB (MySQL)

프로덕션 DB 접속 정보는 AWS Secrets Manager(`prod/ignite-pilot/mysql-realpilot`)에 저장되어 있습니다.

**로컬 → 프로덕션 스키마 반영** (마이그레이션):

```bash
# scripts/migrations/ 의 SQL 파일을 번호 순서대로 프로덕션 DB에 적용
# 예: 006-plan-building-floor.sql
mysql -h <prod-host> -u <user> -p <database> < scripts/migrations/006-plan-building-floor.sql
```

> 마이그레이션 파일은 `scripts/migrations/` 디렉토리에 `NNN-description.sql` 형식으로 관리합니다.

### MinIO → AWS S3/MinIO

로컬 MinIO와 프로덕션 스토리지 간 동기화가 필요한 경우 `mc` (MinIO Client)를 사용합니다.

```bash
# mc alias 설정 (최초 1회)
mc alias set local http://localhost:9000 <access-key> <secret-key>
mc alias set prod <prod-endpoint> <access-key> <secret-key>

# 버킷 동기화
mc mirror local/<bucket> prod/<bucket>
```

---

## 참고

- **aws-simple-deploy 서비스 ID**: 134 (daon-manufacturing)
- **ECR 이미지**: `575084400422.dkr.ecr.ap-northeast-2.amazonaws.com/daon-manufacturing`
- **Task Definition**: `ig-pilot-daon-manufacturing` (Fargate, 0.25 vCPU / 512 MB)
- **Task Role**: `ig-pilot-task` (S3, Secrets Manager 등 접근 권한 포함)
