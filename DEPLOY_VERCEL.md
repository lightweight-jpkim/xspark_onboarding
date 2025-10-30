# 🚀 Vercel 배포 가이드

Vercel에 xspark_onboarding을 5분 안에 배포하는 방법입니다.

---

## ⚡ 빠른 시작 (5분)

### 1. Vercel 계정 생성

1. https://vercel.com 접속
2. **Sign Up** → GitHub 계정으로 가입
3. 무료 (Hobby Plan)

### 2. 프로젝트 배포

**방법 A: Vercel Dashboard (추천)**

1. Vercel Dashboard → **Add New...** → **Project**
2. **Import Git Repository** → GitHub 저장소 선택
   - `lightweight-jpkim/xspark_onboarding`
3. **Configure Project**:
   - Framework Preset: **Other**
   - Root Directory: `./` (그대로)
   - Build Command: `npm run build`
   - Output Directory: (비워둠)
4. **Environment Variables** 추가:
   ```
   NOTION_API_TOKEN=secret_xxxxx
   OPENAI_API_KEY=sk-proj-xxxxx
   OPENAI_MODEL=gpt-4o
   NODE_ENV=production
   CORS_ORIGIN=https://your-project.vercel.app
   ```
5. **Deploy** 클릭!

**방법 B: CLI (개발자용)**

```bash
# 1. Vercel CLI 설치
npm install -g vercel

# 2. 로그인
vercel login

# 3. 프로젝트 루트에서 배포
cd /Users/jpkim/xspark_onboarding
vercel

# 4. 환경변수 설정
vercel env add NOTION_API_TOKEN
vercel env add OPENAI_API_KEY
vercel env add OPENAI_MODEL
vercel env add NODE_ENV

# 5. 프로덕션 배포
vercel --prod
```

### 3. 환경변수 설정 (중요!)

Dashboard → Settings → Environment Variables

**필수 환경변수:**
```env
NOTION_API_TOKEN=secret_your_token_here
OPENAI_API_KEY=sk-proj-your_key_here
OPENAI_MODEL=gpt-4o
NODE_ENV=production
```

**선택 환경변수:**
```env
CORS_ORIGIN=https://your-project.vercel.app
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7
LOG_LEVEL=error
```

**주의:**
- Production, Preview, Development 모두 체크
- 민감 정보는 Secret으로 마킹

### 4. 배포 확인

```bash
# 배포 URL 확인
https://your-project.vercel.app

# 헬스체크
curl https://your-project.vercel.app/api/health
```

**응답 예시:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-30T...",
  "services": {
    "notion": true,
    "openai": true
  }
}
```

---

## 🔄 자동 배포 설정

### GitHub 푸시 → 자동 배포

```bash
# 로컬에서 코드 수정
vi backend/server.js

# Git 커밋 & 푸시
git add .
git commit -m "Update server code"
git push origin main

# Vercel이 자동으로 감지하여 배포 시작!
# → Dashboard에서 배포 진행 상황 확인 가능
```

**브랜치별 배포:**
- `main` → Production (https://your-project.vercel.app)
- 다른 브랜치 → Preview (https://branch-name-your-project.vercel.app)

---

## 🔧 프로젝트 설정

### vercel.json 설명

```json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/server.js",      // Express 서버
      "use": "@vercel/node"             // Node.js 런타임
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",               // /api/* 요청
      "dest": "backend/server.js"       // → 서버로
    },
    {
      "src": "/(.*\\.(html|css|js|...))", // 정적 파일
      "dest": "frontend/$1"              // → frontend/
    },
    {
      "src": "/",                       // 루트
      "dest": "frontend/index.html"     // → index.html
    }
  ]
}
```

### 환경별 설정

**프로덕션:**
```env
NODE_ENV=production
LOG_LEVEL=error
LOG_API_CALLS=false
CORS_ORIGIN=https://your-project.vercel.app
```

**프리뷰 (개발 테스트):**
```env
NODE_ENV=development
LOG_LEVEL=info
LOG_API_CALLS=true
CORS_ORIGIN=*
```

---

## 🐛 문제 해결

### 1. 배포는 성공했는데 500 에러

**원인:** 환경변수 누락

**해결:**
```bash
# Dashboard → Settings → Environment Variables 확인
# 필수: NOTION_API_TOKEN, OPENAI_API_KEY

# 재배포
vercel --prod
```

### 2. CORS 에러

**원인:** CORS_ORIGIN 미설정

**해결:**
```bash
# Environment Variables 추가
CORS_ORIGIN=https://your-project.vercel.app

# 또는 모두 허용 (내부 툴이라 괜찮음)
CORS_ORIGIN=*
```

### 3. Serverless Function Timeout

**현상:**
```
Error: Function execution timed out after 10.00 seconds
```

**해결:**
```bash
# OpenAI API 호출이 10초 넘는 경우
# → Railway로 전환 고려

# 또는 timeout 설정 (Pro Plan만 가능)
# vercel.json에 추가:
{
  "functions": {
    "backend/server.js": {
      "maxDuration": 60  // Pro Plan 필요
    }
  }
}
```

**임시 해결:**
- OpenAI 모델 변경: `gpt-4o` → `gpt-3.5-turbo` (더 빠름)
- max_tokens 줄이기: `1000` → `500`

### 4. 로그 확인

```bash
# CLI로 로그 실시간 확인
vercel logs your-project.vercel.app --follow

# Dashboard에서 확인
# Deployments → 특정 배포 클릭 → Runtime Logs
```

---

## 💰 비용 (무료!)

**Hobby Plan (무료):**
```
✅ 월 100GB 대역폭
✅ 100 serverless 함수 실행/일
✅ 무제한 배포
✅ 자동 HTTPS
✅ GitHub 연동

내부 팀 사용: 충분!
```

**예상 사용량 (팀 10명):**
```
대역폭: ~1-2GB/월 (여유!)
함수 실행: ~500회/월 (여유!)
→ 무료 한도 안에 충분
```

**Pro Plan ($20/월) 필요한 경우:**
- 월 1TB 대역폭
- 60초 타임아웃 (Hobby는 10초)
- 팀 협업 기능

→ 우리 프로젝트: 필요 없음!

---

## 🔒 보안 설정

### 1. 환경변수 보호

- ✅ 모든 환경변수를 Vercel Dashboard에서 관리
- ✅ `.env` 파일은 절대 Git에 커밋 안 됨
- ✅ 배포 로그에 환경변수 노출 안 됨

### 2. HTTPS 자동

- ✅ Vercel이 자동으로 SSL 인증서 발급
- ✅ 모든 트래픽 HTTPS 강제

### 3. Rate Limiting

- ✅ 우리 코드의 Rate Limiter 작동
- ✅ Vercel도 자체 DDoS 방어

---

## 📊 모니터링

### Vercel Analytics (무료)

Dashboard → Analytics

**확인 가능:**
- 요청 수
- 응답 시간
- 에러율
- 지역별 트래픽

### 커스텀 로깅

```javascript
// backend/server.js
console.log('Important event');  // Vercel에 자동 수집

// 로그 확인
vercel logs --follow
```

---

## 🚀 배포 체크리스트

### 배포 전
- [ ] 로컬에서 정상 작동 확인 (`npm run dev`)
- [ ] `.env`가 `.gitignore`에 있는지 확인
- [ ] Git에 최신 코드 푸시
- [ ] Notion Integration 준비
- [ ] OpenAI API Key 준비

### 배포 중
- [ ] Vercel 프로젝트 생성
- [ ] GitHub 저장소 연결
- [ ] 환경변수 설정
- [ ] 배포 시작

### 배포 후
- [ ] 배포 URL 접속 확인
- [ ] `/api/health` 엔드포인트 확인
- [ ] 채팅 기능 테스트
- [ ] Notion 문서 검색 작동 확인
- [ ] OpenAI 응답 확인
- [ ] 로그에서 에러 없는지 확인

---

## 🔄 롤백

문제 발생 시 이전 버전으로 복구:

**Dashboard 방법:**
1. Deployments 탭
2. 정상 작동하던 이전 배포 선택
3. **Promote to Production** 클릭

**CLI 방법:**
```bash
vercel rollback
```

---

## 🎯 다음 단계

배포 완료 후:

1. **팀원들에게 URL 공유**
   ```
   https://xspark-onboarding.vercel.app
   ```

2. **Notion 워크스페이스 설정**
   - 온보딩 문서 작성/정리
   - Integration 연결

3. **사용법 가이드 작성**
   - 팀원들에게 사용 방법 안내

4. **피드백 수집**
   - 응답 품질 확인
   - 개선사항 파악

---

## 📞 지원

**문제 발생 시:**
1. Vercel 로그 확인: `vercel logs --follow`
2. 환경변수 재확인
3. GitHub Issues에 문의

**참고 문서:**
- [Vercel 공식 문서](https://vercel.com/docs)
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 다른 플랫폼 비교
- [DEPLOYMENT_COMPARISON.md](./DEPLOYMENT_COMPARISON.md) - 상세 비교

---

**마지막 업데이트:** 2025-10-30
