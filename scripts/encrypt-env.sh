#!/bin/bash

# .env 파일 암호화 스크립트
# 사용법: ./scripts/encrypt-env.sh

if [ ! -f .env ]; then
  echo "❌ .env 파일이 없습니다."
  exit 1
fi

echo "🔒 .env 파일 암호화 중..."
echo "비밀번호를 입력하세요 (팀원과 안전하게 공유할 것):"

openssl enc -aes-256-cbc -salt -pbkdf2 -in .env -out .env.enc

if [ $? -eq 0 ]; then
  echo "✅ 암호화 완료: .env.enc"
  echo "📝 이 파일을 Git에 커밋할 수 있습니다:"
  echo "   git add .env.enc"
  echo "   git commit -m 'Update encrypted env'"
else
  echo "❌ 암호화 실패"
  exit 1
fi
