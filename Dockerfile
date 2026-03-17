# 다온 제조 공정 관리 - Docker 이미지
# Next(API, 3000) + Vite 클라이언트 빌드 정적 서빙(3500)
# 실행 시 AWS 자격 증명·Secrets Manager 접근 필요 (MySQL 등)

# -----------------------------------------------------------------------------
# Stage 1: 의존성 설치 및 빌드
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# 패키지 파일 복사 후 설치 (dev 포함, 빌드용)
COPY package.json package-lock.json* ./
RUN npm ci

# 소스 복사 및 빌드 (Vite 클라이언트 → next 빌드)
COPY . .
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: 프로덕션 실행
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 프로덕션 의존성만 설치 (serve 포함, npx로 실행)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# 빌드 결과 복사
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/next.config.js ./

EXPOSE 3000 3500

# Next(API) 3000, 클라이언트 정적 3500 동시 실행 (npx로 PATH 문제 방지)
CMD ["sh", "-c", "npx serve client/dist -s -l 3500 & exec npx next start"]
