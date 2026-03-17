#!/bin/bash
# GitHub 저장소 생성 스크립트
# AWS Secret Manager "prod/ignite-pilot/github" 참고 (GITHUB-PAT 또는 token 등)
# 사용법: AWS CLI 설정 후 ./scripts/create-github-repo.sh (시크릿에서 자동 조회)
# 또는: export GITHUB_TOKEN=$(aws secretsmanager get-secret-value --secret-id prod/ignite-pilot/github --query SecretString --output text | jq -r '.["GITHUB-PAT"] // .token')
#       ./scripts/create-github-repo.sh

set -e
REPO_NAME="daon-manufacturing"
ORG_OR_USER="${GITHUB_ORG:-ignite-pilot}"

if [ -z "$GITHUB_TOKEN" ]; then
  if command -v aws &>/dev/null; then
    SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id "prod/ignite-pilot/github" --query SecretString --output text 2>/dev/null || true)
    if [ -n "$SECRET_JSON" ]; then
      GITHUB_TOKEN=$(echo "$SECRET_JSON" | jq -r '.token // .GITHUB_TOKEN // .["GITHUB-PAT"] // .GITHUB_PAT // .access_token // empty')
    fi
  fi
fi

if [ -z "$GITHUB_TOKEN" ]; then
  echo "GITHUB_TOKEN이 없습니다. 환경변수로 설정하거나 AWS Secret Manager prod/ignite-pilot/github 에서 조회 가능하도록 하세요."
  exit 1
fi

# 이미 원격이 있으면 스킵
if git remote get-url origin &>/dev/null; then
  echo "origin remote already exists."
  exit 0
fi

# GitHub API로 저장소 생성 (organization 또는 user)
CREATE_URL="https://api.github.com/user/repos"
if [ -n "$ORG_OR_USER" ] && [ "$ORG_OR_USER" != "user" ]; then
  CREATE_URL="https://api.github.com/orgs/${ORG_OR_USER}/repos"
fi

RESP=$(curl -s -w "\n%{http_code}" -X POST "$CREATE_URL" \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -d "{\"name\":\"$REPO_NAME\",\"private\":false,\"description\":\"다온 제조 공정 관리 시스템\"}")

HTTP_CODE=$(echo "$RESP" | tail -n 1)
HTTP_BODY=$(echo "$RESP" | sed '$d')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  CLONE_URL=$(echo "$HTTP_BODY" | grep -o '"clone_url": *"[^"]*"' | cut -d'"' -f4)
  git remote add origin "$CLONE_URL"
  git branch -M main 2>/dev/null || true
  echo "Repository created and origin set to: $CLONE_URL"
elif [ "$HTTP_CODE" = "422" ]; then
  echo "Repository may already exist. Adding remote..."
  git remote add origin "https://github.com/${ORG_OR_USER}/${REPO_NAME}.git" 2>/dev/null || true
  git branch -M main 2>/dev/null || true
else
  echo "Failed to create repo. HTTP $HTTP_CODE"
  echo "$HTTP_BODY"
  exit 1
fi
