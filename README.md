## local profile (Docker) — .env.local이 있으면 자동 적용
```
npm run infra:up   # Docker 인프라 시작
npm run dev        # 개발 서버 시작
```

## default profile (AWS) — .env.local 삭제 또는 이름 변경
```
del .env.local
npm run dev
```
