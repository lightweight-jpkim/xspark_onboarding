#!/bin/bash

# .env 파일 복호화 스크립트
# 사용법: ./scripts/decrypt-env.sh

if [ ! -f .env.enc ]; then
  echo "❌ .env.enc 파일이 없습니다."
  echo "먼저 Git에서 파일을 받아오세요: git pull"
  exit 1
fi

if [ -f .env ]; then
  echo "⚠️  .env 파일이 이미 존재합니다."
  read -p "덮어쓰시겠습니까? (y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "취소되었습니다."
    exit 0
  fi
fi

echo "🔓 .env 파일 복호화 중..."
echo "암호화할 때 사용한 비밀번호를 입력하세요:"

openssl enc -aes-256-cbc -d -pbkdf2 -in .env.enc -out .env

if [ $? -eq 0 ]; then
  echo "✅ 복호화 완료: .env"
  echo "이제 'npm run dev'로 서버를 실행할 수 있습니다."
else
  echo "❌ 복호화 실패 (비밀번호 확인)"
  exit 1
fi
