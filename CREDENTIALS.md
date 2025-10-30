# 🔐 크레덴셜 관리 가이드

이 문서는 xspark_onboarding 프로젝트의 크레덴셜(API Keys, Tokens)을 안전하게 관리하는 방법을 설명합니다.

---

## 📍 크레덴셜 저장 위치

### 시나리오별 저장소

```
┌──────────────────────────────────────────────────┐
│  개발 환경 (본인 PC)                              │
│  • 위치: .env 파일                                │
│  • 범위: 로컬 디스크에만 존재                     │
│  • 지속성: PC 재부팅 후에도 유지                  │
│  • 백업: 수동 필요                                │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  Git 저장소                                       │
│  • .env: ❌ 절대 커밋 안 됨 (.gitignore)         │
│  • .env.example: ✅ 템플릿만 포함                │
│  • .env.enc: ✅ 암호화된 백업 (선택)             │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  배포 환경 (Vercel/Railway/Render)                │
│  • 위치: 플랫폼 환경변수                         │
│  • 범위: 해당 프로젝트만                         │
│  • 지속성: 서버 재시작 후에도 유지               │
│  • 백업: 플랫폼이 자동 관리                      │
└──────────────────────────────────────────────────┘
```

---

## 🤔 자주 묻는 질문 (FAQ)

### Q1. PC를 종료하면 크레덴셜이 사라지나요?

**A:** 아니요, `.env` 파일은 로컬 디스크에 저장되므로 PC를 종료해도 그대로 남아있습니다.

```bash
# PC 재부팅 후
cd /Users/jpkim/xspark_onboarding
npm run dev  # .env 파일이 여전히 로드됨
```

### Q2. 새 PC에서 작업하려면?

**A:** 세 가지 방법이 있습니다.

**방법 1: 스크립트로 새로 설정**
```bash
git clone https://github.com/lightweight-jpkim/xspark_onboarding.git
cd xspark_onboarding
npm install
./scripts/setup-env.sh  # 대화형으로 크레덴셜 입력
```

**방법 2: 암호화된 파일 복구**
```bash
git clone https://github.com/lightweight-jpkim/xspark_onboarding.git
cd xspark_onboarding
npm install
./scripts/decrypt-env.sh  # Git에 있는 .env.enc 복호화
```

**방법 3: 백업에서 복사**
```bash
# 이전 PC에서 백업한 .env 파일 복사
cp ~/Dropbox/backup/.env .env
```

### Q3. 팀원과 크레덴셜을 어떻게 공유하나요?

**A:** 암호화하여 Git으로 공유하는 것을 추천합니다.

**팀 리더 (처음 1회):**
```bash
# 1. .env 파일 생성 및 설정
./scripts/setup-env.sh

# 2. 암호화 (비밀번호 입력)
./scripts/encrypt-env.sh

# 3. Git에 커밋
git add .env.enc
git commit -m "Add encrypted credentials"
git push

# 4. 팀원들에게 비밀번호를 안전하게 공유
#    - Slack DM
#    - 1Password shared vault
#    - 암호화된 메시지
```

**팀원:**
```bash
# 1. 저장소 클론
git clone https://github.com/lightweight-jpkim/xspark_onboarding.git
cd xspark_onboarding
npm install

# 2. 복호화 (팀 리더에게 받은 비밀번호 입력)
./scripts/decrypt-env.sh

# 3. 서버 실행
npm run dev
```

### Q4. 배포 환경에서는 어떻게 관리하나요?

**A:** 배포 플랫폼의 환경변수 기능을 사용합니다.

**Vercel:**
1. Dashboard → Settings → Environment Variables
2. 각 키를 개별적으로 추가
3. 자동으로 모든 배포에 적용됨

**Railway:**
1. Variables 탭
2. 키-값 쌍 추가
3. 즉시 적용 (재배포 자동)

**Render:**
1. Environment 탭
2. Add Environment Variable
3. Secret File 기능으로 .env 파일 전체 업로드 가능

### Q5. 크레덴셜이 실수로 노출되면?

**A:** 즉시 조치하세요!

```bash
# 1. Git 히스토리 확인
git log --all --full-history --source -- .env

# 2. 노출된 크레덴셜 즉시 재발급
# - Notion: Integration 삭제 후 재생성
# - OpenAI: API Key 삭제 후 재발급

# 3. Git 히스토리에서 제거 (이미 푸시된 경우)
git filter-repo --path .env --invert-paths

# 4. 새 크레덴셜로 업데이트
./scripts/setup-env.sh
```

### Q6. 로컬 백업은 어떻게 하나요?

**A:** 여러 방법이 있습니다.

**방법 1: 암호화 백업**
```bash
# 암호화하여 클라우드에 백업
./scripts/encrypt-env.sh
cp .env.enc ~/Dropbox/xspark_backup/
```

**방법 2: 직접 복사**
```bash
# 안전한 위치에 복사
cp .env ~/Documents/secure/.env.backup
```

**방법 3: 비밀번호 관리자**
```bash
# 1Password, Bitwarden 등에 직접 입력
# - NOTION_API_TOKEN: secret_xxx
# - OPENAI_API_KEY: sk-proj-xxx
```

---

## 🛠️ 제공되는 스크립트

### 1. `setup-env.sh` - 초기 설정

대화형으로 크레덴셜을 입력받아 `.env` 파일을 생성합니다.

```bash
./scripts/setup-env.sh
```

**기능:**
- .env.example 자동 복사
- 대화형 크레덴셜 입력
- 자동 검증
- 선택적 암호화

### 2. `encrypt-env.sh` - 암호화

`.env` 파일을 암호화하여 `.env.enc` 파일을 생성합니다.

```bash
./scripts/encrypt-env.sh
```

**사용 시나리오:**
- Git에 백업하고 싶을 때
- 팀원과 공유하고 싶을 때
- 안전하게 클라우드 저장하고 싶을 때

### 3. `decrypt-env.sh` - 복호화

`.env.enc` 파일을 복호화하여 `.env` 파일을 생성합니다.

```bash
./scripts/decrypt-env.sh
```

**사용 시나리오:**
- 새 PC에서 작업 시작할 때
- Git에서 클론 후 크레덴셜 복구할 때
- 백업에서 복원할 때

---

## 🔒 보안 모범 사례

### ✅ DO (권장)

1. **로컬 개발**
   - .env 파일은 로컬에만 보관
   - 정기적으로 백업
   - 암호화하여 Git에 저장 (선택)

2. **배포**
   - 플랫폼 환경변수 사용
   - 환경별로 다른 크레덴셜 사용 (dev/prod)

3. **팀 협업**
   - 암호화된 파일로 공유
   - 비밀번호는 별도 채널로 전달
   - 정기적으로 크레덴셜 갱신

4. **모니터링**
   - API 사용량 주기적 확인
   - 로그에서 크레덴셜 노출 확인
   - 의심스러운 활동 감지 시 즉시 재발급

### ❌ DON'T (금지)

1. **절대 하지 말 것**
   - .env 파일을 Git에 직접 커밋
   - Slack, 이메일에 크레덴셜 평문 전송
   - 스크린샷에 크레덴셜 노출
   - 공개 저장소에 업로드

2. **피해야 할 것**
   - 모든 환경에서 같은 크레덴셜 사용
   - 크레덴셜을 코드에 하드코딩
   - 오래된 크레덴셜 방치
   - 백업 없이 작업

---

## 🚨 비상 대응

### 크레덴셜이 Git에 커밋된 경우

```bash
# 1. 즉시 크레덴셜 재발급
# Notion: https://www.notion.so/profile/integrations
# OpenAI: https://platform.openai.com/api-keys

# 2. Git 히스토리에서 제거
git filter-repo --path .env --invert-paths

# 3. 강제 푸시 (주의!)
git push origin --force --all

# 4. 팀원들에게 알림
# 모든 팀원이 git pull --rebase 해야 함
```

### 크레덴셜을 잃어버린 경우

```bash
# 1. 백업 확인
ls ~/Dropbox/backup/.env.enc
ls ~/Documents/secure/.env.backup

# 2. Git에서 복구
git pull
./scripts/decrypt-env.sh

# 3. 백업이 없다면 재발급
# Notion, OpenAI에서 새로 발급받아 설정
./scripts/setup-env.sh
```

---

## 📊 크레덴셜 관리 체크리스트

### 프로젝트 시작 시
- [ ] `.env` 파일 생성 (`./scripts/setup-env.sh`)
- [ ] Notion Integration 생성 및 연결
- [ ] OpenAI API Key 발급
- [ ] 로컬에서 정상 작동 확인
- [ ] 백업 방법 선택 및 실행

### 팀에 합류 시
- [ ] 저장소 클론
- [ ] 팀 리더에게 암호화 비밀번호 요청
- [ ] `.env.enc` 복호화 (`./scripts/decrypt-env.sh`)
- [ ] 로컬에서 정상 작동 확인

### 배포 시
- [ ] 배포 플랫폼 선택
- [ ] 환경변수 설정
- [ ] 배포 후 작동 확인
- [ ] 로그에서 크레덴셜 노출 여부 확인

### 주기적 점검 (월 1회)
- [ ] API 사용량 확인
- [ ] 크레덴셜 유효성 확인
- [ ] 백업 상태 확인
- [ ] 보안 업데이트 확인

---

## 🔗 관련 문서

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 배포 가이드
- [README.md](./README.md) - 프로젝트 개요
- [CLAUDE.md](./CLAUDE.md) - 개발 히스토리

---

**마지막 업데이트:** 2025-10-30
