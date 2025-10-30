# 🚀 배포 가이드

이 문서는 xspark_onboarding 프로젝트를 안전하게 배포하는 방법을 설명합니다.

---

## 📋 배포 전 체크리스트

- [ ] Notion Integration 생성 완료
- [ ] OpenAI API Key 발급 완료
- [ ] 로컬에서 정상 동작 확인
- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] Git에 크레덴셜이 커밋되지 않았는지 확인

---

## 🔒 보안 권장사항

### 1. 배포 전 필수 확인

```bash
# Git 히스토리에 크레덴셜이 없는지 확인
git log --all --full-history --source -- .env

# 현재 커밋에 .env가 없는지 확인
git ls-files | grep .env

# .gitignore 확인
cat .gitignore | grep .env
```

### 2. 만약 실수로 커밋했다면

```bash
# 주의: 이미 푸시된 경우 히스토리 재작성 필요
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# 또는 git-filter-repo 사용 (권장)
git filter-repo --path .env --invert-paths
```

**중요**: 이미 노출된 크레덴셜은 **즉시 재발급**하세요!

### 3. 크레덴셜 권한 최소화

**Notion Integration 권한:**
- ✅ Read content
- ✅ Update content (로그 저장용)
- ❌ Admin 권한은 불필요

**OpenAI API Key:**
- 사용량 제한 설정 권장 (예: 월 $50)
- Rate limit 설정

---

## 🌐 배포 플랫폼별 가이드

### Option 1: Vercel (추천 ⭐)

**장점:**
- 무료 티어 제공
- GitHub 자동 연동
- 간단한 배포

**단계:**

1. **Vercel 프로젝트 생성**
   ```bash
   npm install -g vercel
   vercel
   ```

2. **환경변수 설정**
   - Vercel Dashboard → Settings → Environment Variables

   추가할 환경변수:
   ```
   NOTION_API_TOKEN=secret_xxxxx
   OPENAI_API_KEY=sk-proj-xxxxx
   OPENAI_MODEL=gpt-4o
   NODE_ENV=production
   CORS_ORIGIN=https://yourdomain.vercel.app
   ```

3. **vercel.json 설정** (프로젝트 루트)
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "backend/server.js",
         "use": "@vercel/node"
       },
       {
         "src": "frontend/*",
         "use": "@vercel/static"
       }
     ],
     "routes": [
       {
         "src": "/api/(.*)",
         "dest": "backend/server.js"
       },
       {
         "src": "/(.*)",
         "dest": "frontend/$1"
       }
     ]
   }
   ```

4. **배포**
   ```bash
   vercel --prod
   ```

---

### Option 2: Railway

**장점:**
- Node.js 앱에 최적화
- 자동 SSL
- 간단한 환경변수 관리

**단계:**

1. **Railway 프로젝트 생성**
   - https://railway.app 접속
   - "New Project" → "Deploy from GitHub repo"
   - 저장소 선택

2. **환경변수 설정**
   - Variables 탭에서 추가:
   ```
   NOTION_API_TOKEN
   OPENAI_API_KEY
   OPENAI_MODEL
   NODE_ENV=production
   PORT (자동 설정됨)
   ```

3. **Start Command 설정**
   - Settings → Deploy → Start Command:
   ```bash
   npm start
   ```

4. **자동 배포**
   - main 브랜치에 푸시하면 자동 배포

---

### Option 3: Render

**장점:**
- 무료 티어 제공
- 백그라운드 워커 지원
- 데이터베이스 통합

**단계:**

1. **Render 서비스 생성**
   - https://render.com 접속
   - "New Web Service"
   - GitHub 저장소 연결

2. **설정**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node

3. **환경변수 설정**
   - Environment 탭에서 추가
   - Secret File 기능으로 .env 파일 업로드 가능

4. **배포**
   - "Create Web Service" 클릭

---

## 🔐 환경변수 관리 Best Practices

### 1. 환경별 분리

```
개발 환경 (.env.development):
- 테스트용 Notion 워크스페이스
- 낮은 rate limit
- 상세한 로깅

프로덕션 (.env.production):
- 실제 Notion 워크스페이스
- 엄격한 rate limit
- 최소 로깅
```

### 2. 팀 협업 시

**방법 1: 암호화된 설정 파일 (중간 레벨)**

```bash
# .env.enc 파일 생성 (OpenSSL 사용)
openssl enc -aes-256-cbc -salt -in .env -out .env.enc

# 복호화
openssl enc -aes-256-cbc -d -in .env.enc -out .env
```

`.env.enc`는 Git에 커밋 가능, 복호화 비밀번호만 안전하게 공유

**방법 2: GitHub Secrets (권장)**

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Create .env
        run: |
          echo "NOTION_API_TOKEN=${{ secrets.NOTION_API_TOKEN }}" >> .env
          echo "OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}" >> .env

      - name: Deploy
        run: npm run deploy
```

Repository Settings → Secrets and variables → Actions에서 설정

---

## 📊 모니터링 및 로깅

### 1. 프로덕션 로깅 설정

`.env`:
```env
LOG_LEVEL=error        # error만 로깅
LOG_API_CALLS=false    # API 호출 로깅 비활성화
```

### 2. 크레덴셜 노출 방지

서버 시작 시 자동으로 크레덴셜을 마스킹하여 로깅:

```
🔐 크레덴셜 상태:
==================
✅ NOTION: secr****************************abc1
✅ OPENAI: sk-p****************************xyz9
==================
```

### 3. 에러 모니터링

프로덕션에서는 상세 에러를 숨기고 일반 메시지만 반환:

```javascript
// 개발: 상세 에러 스택 포함
// 프로덕션: "Internal Server Error"만 반환
```

---

## 🛡️ 추가 보안 조치

### 1. Rate Limiting

현재 설정: **1분에 30회 요청**

변경하려면 `backend/utils/security.js`:
```javascript
export const chatRateLimiter = new RateLimiter(
  30,    // 최대 요청 수
  60000  // 시간 윈도우 (밀리초)
);
```

### 2. CORS 설정

프로덕션 환경변수:
```env
CORS_ORIGIN=https://yourdomain.com  # 특정 도메인만 허용
```

### 3. IP 화이트리스트 (선택)

환경변수에 추가:
```env
IP_WHITELIST=1.2.3.4,5.6.7.8
```

---

## ✅ 배포 후 확인사항

- [ ] 서버가 정상적으로 시작되는지 확인
- [ ] 환경변수가 올바르게 로드되는지 확인
- [ ] 채팅 기능이 정상 작동하는지 테스트
- [ ] Notion 문서 검색이 작동하는지 확인
- [ ] OpenAI API 호출이 성공하는지 확인
- [ ] Rate Limiting이 작동하는지 확인
- [ ] 로그에 크레덴셜이 노출되지 않는지 확인

---

## 🆘 문제 해결

### 환경변수 로드 안 됨

```bash
# 서버 시작 시 로그 확인
🔐 크레덴셜 상태:
❌ NOTION: Missing
❌ OPENAI: Invalid placeholder
```

→ 배포 플랫폼의 환경변수 설정 확인

### CORS 에러

```
Access to fetch at 'http://api.com' from origin 'http://localhost:3000'
has been blocked by CORS policy
```

→ `CORS_ORIGIN` 환경변수를 올바른 도메인으로 설정

### Rate Limit 초과

```json
{
  "error": "요청이 너무 많습니다",
  "retryAfter": 45
}
```

→ 정상 작동. `retryAfter` 초 후 재시도

---

## 📞 지원

문제가 발생하면:
1. GitHub Issues 생성
2. 로그 확인 (크레덴셜 제외)
3. 환경변수 설정 재확인

---

## 🔄 롤백 절차

배포 후 문제 발생 시:

**Vercel:**
```bash
vercel rollback
```

**Railway:**
- Deployments → 이전 버전 선택 → Redeploy

**Render:**
- Manual Deploy → 이전 커밋 선택

---

**마지막 업데이트:** 2025-10-30
