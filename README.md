# xspark_onboarding

Notion 기반 AI 온보딩 어시스턴트 - 내부 개발 툴의 효율적인 팀원 온보딩을 위한 챗봇

## 기능

- 💬 Notion 문서 기반 질문-응답 시스템
- 📝 대화 로그 자동 저장
- 🤖 OpenAI GPT-4o 기반 AI 답변
- 🔍 관련 문서 자동 검색 및 링크 제공

## 기술 스택

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **AI**: OpenAI GPT-4o
- **Knowledge Base**: Notion API

## 시작하기

### 1. 필수 요구사항

- Node.js 18+
- Notion 계정 및 Integration
- OpenAI API Key

### 2. 설치

```bash
git clone https://github.com/lightweight-jpkim/xspark_onboarding.git
cd xspark_onboarding
npm install
```

### 3. 환경변수 설정

**Option A: 자동 설정 스크립트 (추천)**

```bash
./scripts/setup-env.sh
```

대화형으로 크레덴셜을 입력하고, 선택적으로 암호화하여 백업할 수 있습니다.

**Option B: 수동 설정**

```bash
cp .env.example .env
vi .env  # 또는 원하는 에디터로 편집
```

**Option C: 암호화된 파일에서 복구**

팀원이 공유한 `.env.enc` 파일이 있다면:

```bash
./scripts/decrypt-env.sh
# 비밀번호 입력 (팀 리더에게 문의)
```

#### 필요한 크레덴셜

**Notion Integration**
1. [Notion Integrations](https://www.notion.so/profile/integrations)에서 새 Integration 생성
2. API Token 복사 → `.env`의 `NOTION_API_TOKEN`에 입력
3. 온보딩 문서가 있는 페이지에 Integration 연결
   - 페이지 우측 상단 `...` → `Connections` → Integration 선택

**OpenAI API Key**
1. [OpenAI Platform](https://platform.openai.com/api-keys)에서 API Key 생성
2. `.env`의 `OPENAI_API_KEY`에 입력

### 3-1. 크레덴셜 백업 및 공유 (선택)

**개인 백업:**
```bash
# 암호화하여 안전하게 백업
./scripts/encrypt-env.sh

# .env.enc 파일을 안전한 곳에 보관
# Git에 커밋할 수도 있음 (비밀번호만 안전하게 보관)
```

**팀 공유:**
```bash
# 1. 암호화
./scripts/encrypt-env.sh

# 2. .env.enc를 Git에 커밋
git add .env.enc
git commit -m "Add encrypted credentials"
git push

# 3. 팀원들에게 비밀번호를 안전하게 공유 (Slack DM, 1Password 등)
```

### 4. 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm start
```

서버가 실행되면 http://localhost:3000 에서 접속 가능합니다.

## 프로젝트 구조

```
xspark_onboarding/
├── frontend/          # 프론트엔드 (채팅 UI)
├── backend/           # 백엔드 API 서버
│   ├── services/      # Notion, OpenAI 서비스
│   ├── routes/        # API 라우트
│   └── utils/         # 유틸리티 함수
├── .env               # 환경변수 (git ignored)
└── CLAUDE.md          # 개발 히스토리
```

## 크레덴셜 관리

### 로컬 개발
- `.env` 파일은 로컬에만 존재 (Git에 업로드 안 됨)
- PC 종료해도 파일은 유지됨
- 새 PC나 팀원: 스크립트로 재설정

### 배포 환경
- Vercel/Railway/Render 등 플랫폼의 환경변수 사용
- 서버 재시작해도 자동으로 로드됨
- 상세 가이드: [DEPLOYMENT.md](./DEPLOYMENT.md)

### 백업 옵션
1. **암호화된 Git 백업** (추천)
   - `./scripts/encrypt-env.sh` 실행
   - `.env.enc`를 Git에 커밋

2. **클라우드 백업**
   - Dropbox, Google Drive 등에 `.env` 복사

3. **비밀번호 관리자**
   - 1Password, Bitwarden 등에 저장

## 보안 기능

- 🔒 API Key 자동 마스킹 (로그)
- ⏱️ Rate Limiting (1분 30회)
- 🛡️ CORS 설정
- 📊 프로덕션/개발 환경 분리
- 🔐 로그 새니타이징

## 문서

- [CLAUDE.md](./CLAUDE.md) - 개발 히스토리
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 배포 가이드

## 라이선스

MIT
