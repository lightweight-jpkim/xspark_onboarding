#!/bin/bash

# 환경변수 설정 가이드 스크립트
# 사용법: ./scripts/setup-env.sh

echo "================================================"
echo "🚀 xspark_onboarding 환경변수 설정 가이드"
echo "================================================"
echo ""

# .env 파일 존재 확인
if [ -f .env ]; then
  echo "✅ .env 파일이 이미 존재합니다."
  read -p "다시 설정하시겠습니까? (y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "설정을 건너뜁니다."
    exit 0
  fi
fi

# .env.enc 파일 존재 확인
if [ -f .env.enc ]; then
  echo "📦 암호화된 .env.enc 파일을 발견했습니다."
  read -p "복호화하시겠습니까? (y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./scripts/decrypt-env.sh
    exit $?
  fi
fi

echo ""
echo "새로운 .env 파일을 생성합니다..."
echo ""

# .env.example 복사
if [ ! -f .env.example ]; then
  echo "❌ .env.example 파일이 없습니다."
  exit 1
fi

cp .env.example .env
echo "✅ .env.example을 .env로 복사했습니다."
echo ""

# 사용자 입력 받기
echo "📝 크레덴셜을 입력해주세요:"
echo ""

# Notion API Token
echo "1. Notion API Token"
echo "   발급: https://www.notion.so/profile/integrations"
read -p "   NOTION_API_TOKEN: " NOTION_TOKEN
echo ""

# OpenAI API Key
echo "2. OpenAI API Key"
echo "   발급: https://platform.openai.com/api-keys"
read -p "   OPENAI_API_KEY: " OPENAI_KEY
echo ""

# OpenAI Model
echo "3. AI 모델 선택 (기본값: gpt-4o)"
read -p "   OPENAI_MODEL [gpt-4o]: " OPENAI_MODEL
OPENAI_MODEL=${OPENAI_MODEL:-gpt-4o}
echo ""

# .env 파일 업데이트
sed -i.bak "s|NOTION_API_TOKEN=.*|NOTION_API_TOKEN=$NOTION_TOKEN|" .env
sed -i.bak "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=$OPENAI_KEY|" .env
sed -i.bak "s|OPENAI_MODEL=.*|OPENAI_MODEL=$OPENAI_MODEL|" .env

# 백업 파일 삭제
rm -f .env.bak

echo "✅ .env 파일 설정 완료!"
echo ""
echo "다음 단계:"
echo "  1. npm install (아직 안 했다면)"
echo "  2. npm run dev (서버 실행)"
echo ""

# 암호화 여부 확인
read -p "🔒 .env 파일을 암호화하여 Git에 백업하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  ./scripts/encrypt-env.sh
fi

echo ""
echo "================================================"
echo "설정이 완료되었습니다! 🎉"
echo "================================================"
