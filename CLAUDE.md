# xspark_onboarding 프로젝트 개발 히스토리

## 프로젝트 개요
- **프로젝트명**: xspark_onboarding
- **목적**: 내부 개발 툴의 효율적인 팀원 온보딩을 위한 Notion 기반 AI 어시스턴트
- **시작일**: 2025-10-30
- **GitHub**: https://github.com/lightweight-jpkim/xspark_onboarding

## 기술 스택

### Frontend
- HTML/CSS/JavaScript (Vanilla)
- Fetch API
- Marked.js (Markdown rendering)

### Backend
- Node.js + Express
- OpenAI API (GPT-4o)
- @notionhq/client (Notion API)
- dotenv (환경변수 관리)

## 시스템 아키텍처

```
사용자 브라우저 (채팅 UI)
    ↓
Express Backend
    ├─→ OpenAI API (GPT-4o)
    └─→ Notion API
         ↓
    Notion Workspace
```

## 주요 기능

1. **질문-응답 시스템**
   - 사용자 질문 → Notion 문서 검색 → OpenAI RAG 답변

2. **대화 로그 저장**
   - 모든 대화를 Notion에 자동 저장
   - 온보딩 진행 상황 추적

3. **FAQ 자동 생성**
   - 자주 묻는 질문 패턴 분석
   - FAQ 데이터베이스 자동 업데이트

## 프로젝트 구조

```
xspark_onboarding/
├── frontend/
│   ├── index.html           # 채팅 UI
│   ├── styles.css           # 스타일
│   └── app.js               # 프론트엔드 로직
│
├── backend/
│   ├── server.js            # Express 서버
│   ├── services/
│   │   ├── notion.js        # Notion API 래퍼
│   │   └── openai.js        # OpenAI API 래퍼
│   ├── routes/
│   │   └── chat.js          # 채팅 라우트
│   └── utils/
│       └── rag.js           # RAG 로직
│
├── .env                     # 환경변수
├── .gitignore
├── package.json
├── CLAUDE.md                # 개발 히스토리 (본 파일)
└── README.md
```

## 환경변수 설정

```env
NOTION_API_TOKEN=secret_xxxxx
OPENAI_API_KEY=sk-proj-xxxxx
OPENAI_MODEL=gpt-4o
PORT=3000
NOTION_ONBOARDING_PAGE_ID=xxxxx
NOTION_FAQ_DATABASE_ID=xxxxx
```

## 개발 로드맵

### Phase 1: 기본 인프라 구축 ✅
- [x] GitHub 저장소 클론
- [x] 프로젝트 디렉토리 구조 생성
- [x] package.json 생성
- [x] 환경변수 템플릿 생성
- [x] .gitignore 설정
- [x] 의존성 설치 완료

### Phase 2: 세 가지 핵심 작업 ✅
1. **프론트엔드 구현** (채팅 UI) ✅
   - [x] index.html - 채팅 인터페이스
   - [x] styles.css - UI 스타일링
   - [x] app.js - API 통신 로직

2. **Notion MCP 서버 연동** ✅
   - [x] @notionhq/client 설정
   - [x] 문서 검색 기능 구현
   - [x] 로그 저장 기능 구현
   - [x] 페이지 내용 추출 기능

3. **OpenAI LLM 연동** ✅
   - [x] OpenAI API 클라이언트 설정
   - [x] RAG 파이프라인 구축
   - [x] 프롬프트 엔지니어링
   - [x] 컨텍스트 최적화

### Phase 3: 통합 및 테스트 (다음 단계)
- [ ] Notion Integration 설정
- [ ] 환경변수 설정 (.env)
- [ ] 서버 실행 및 테스트
- [ ] Notion 워크스페이스 구조 설정
- [ ] 전체 플로우 테스트

## 개발 진행 상황

### 2025-10-30

**오전: 프로젝트 기획**
- ✅ 프로젝트 기획 완료
- ✅ 기술 스택 결정 (Node.js + OpenAI + Notion)
- ✅ 아키텍처 설계 완료

**오후: MVP 구현 완료**
- ✅ GitHub 저장소 클론
- ✅ 기본 디렉토리 구조 생성
- ✅ package.json 및 기본 설정 파일 생성
- ✅ 프론트엔드 완전 구현 (HTML/CSS/JS)
- ✅ Notion 서비스 구현 (검색, 로그, 블록 파싱)
- ✅ OpenAI 서비스 구현 (RAG, 요약)
- ✅ Express 서버 및 API 라우트 구현
- ✅ 의존성 설치 완료 (126 packages)

**구현된 파일 목록:**
```
✅ frontend/index.html      - 채팅 UI
✅ frontend/styles.css      - 스타일링
✅ frontend/app.js          - 클라이언트 로직
✅ backend/server.js        - Express 서버
✅ backend/routes/chat.js   - API 라우트
✅ backend/services/notion.js  - Notion 통합
✅ backend/services/openai.js  - OpenAI 통합
✅ package.json             - 프로젝트 설정
✅ .gitignore               - Git 설정
✅ .env.example             - 환경변수 템플릿
✅ README.md                - 프로젝트 문서
✅ CLAUDE.md                - 개발 히스토리
```

**보안 강화 구현:**
- ✅ 환경변수 중앙 관리 (config/index.js)
- ✅ API Key 마스킹 (로그 출력 시)
- ✅ Rate Limiting (1분 30회)
- ✅ CORS 설정
- ✅ 입력 크기 제한 (1MB)
- ✅ 에러 로그 새니타이징
- ✅ 프로덕션/개발 환경 분리

**추가 구현된 파일:**
```
✅ backend/config/index.js      - 환경설정 관리
✅ backend/utils/security.js    - 보안 유틸리티
✅ DEPLOYMENT.md                - 배포 가이드
```

**다음 단계:**
1. Notion Integration 생성 및 토큰 발급
2. OpenAI API Key 발급
3. .env 파일 생성 및 설정
4. 서버 실행 및 테스트
5. Notion 워크스페이스에 FAQ 데이터베이스 생성
6. 배포 (Vercel/Railway/Render)

## 주요 결정사항

1. **LLM 선택**: OpenAI GPT-4o
   - 이유: 성능과 비용의 균형, 안정적인 API

2. **아키텍처**: 3-tier 분리
   - 프론트엔드 (UI)
   - 백엔드 (API 서버)
   - 외부 서비스 (OpenAI, Notion)

3. **개발 우선순위**
   - MVP 먼저: 기본 질문-응답 기능
   - 고도화: FAQ 자동 생성, 분석 대시보드

4. **크레덴셜 관리 전략** (중간 레벨)
   - 로컬 개발: `.env` 파일 (gitignore)
   - 배포 환경: 플랫폼 환경변수
   - Git 저장소: 크레덴셜 완전 배제
   - 보안 강화: Rate limiting, API key 마스킹, 로그 새니타이징
   - 시크릿 매니저 미사용 (비용 절감)

## 참고사항

- Notion Integration 생성 필요: https://www.notion.so/profile/integrations
- OpenAI API Key 필요: https://platform.openai.com/api-keys
- 기존 mcp-notion-server 참고: ~/mcp-notion-server/

## 보안 기능 상세

### 1. 환경변수 관리
- 중앙화된 config 시스템
- 환경변수 검증 및 에러 처리
- 개발/프로덕션 환경 자동 분리

### 2. API Key 보호
```javascript
// 로그 출력 시 자동 마스킹
NOTION_API_TOKEN: secr****abc1
OPENAI_API_KEY: sk-p****xyz9
```

### 3. Rate Limiting
- 1분당 30회 요청 제한
- IP 기반 추적
- X-RateLimit 헤더 제공

### 4. 로그 보안
- API Key 패턴 자동 감지 및 제거
- 프로덕션에서 상세 에러 숨김
- 민감 정보 새니타이징

### 5. 입력 검증
- 요청 크기 제한 (1MB)
- 메시지 타입 검증
- CORS 설정

## 배포 옵션

### 추천: Vercel
- 무료 티어
- GitHub 자동 연동
- 간단한 환경변수 관리

### 대안: Railway, Render
- 상세 가이드: DEPLOYMENT.md 참고

### 2025-10-31

**Electron 데스크톱 앱 개발 및 회의 녹음 기능 구현 ✅**

**구조 변경:**
- Vercel Serverless Functions로 마이그레이션 완료
- API 경로: `/api/*`로 통일
- Electron 앱을 통한 로컬 실행 및 Vercel API 호출

**구현된 주요 기능:**

1. **Electron 데스크톱 앱** 🖥️
   - macOS 네이티브 앱으로 패키징
   - DMG 설치 파일 생성
   - 시스템 권한 관리 (마이크, 화면 녹화)

2. **회의 녹음 기능** 🎤
   - 시스템 오디오 + 마이크 동시 녹음
   - Electron desktopCapturer API 활용
   - MediaRecorder로 WebM 형식 녹음
   - 오디오 레벨 시각화
   - 녹음 시간 표시

3. **음성 → 텍스트 변환** 🔤
   - OpenAI Whisper API 연동
   - 한국어 우선 인식
   - 최대 25MB 파일 지원

4. **지능형 회의록 정리** 🤖
   - GPT-4o로 자동 정리
   - **문맥 기반 학습**: 최근 10개 회의록 참조
   - Q&A 형식 자동 구조화
   - 주요 논의사항, 결정사항, 액션아이템 분류
   - Temperature 0.3 (높은 일관성)
   - Max tokens 3000 (자세한 내용)

5. **오디오 품질 검증** ✅
   - 최소 길이 체크 (50자)
   - 최소 단어 수 체크 (10개)
   - 노이즈/반복 감지 (유니크 단어 비율 20% 이상)
   - 빈 녹음 자동 차단

6. **회의록 미리보기 & 수동 저장** 📝
   - 아름다운 미리보기 UI
   - 마크다운 형식 자동 렌더링
   - **"✏️ 수정하기"** 버튼으로 인라인 편집
   - **"📤 Notion에 저장"** 버튼으로 수동 저장
   - Notion 링크 즉시 제공

**새로운 API 엔드포인트:**
```
✅ /api/meeting/process    - 회의 음성 처리 (Whisper + GPT-4o)
✅ /api/meeting/save       - Notion 저장 (사용자 확인 후)
✅ /api/meeting/examples   - 이전 회의록 10개 가져오기 (문맥 학습용)
```

**파일 구조 업데이트:**
```
xspark_onboarding/
├── electron/
│   ├── main.cjs           # Electron 메인 프로세스
│   ├── preload.cjs        # Preload 스크립트
│   ├── index.html         # 앱 UI
│   ├── app.js             # 채팅 로직
│   ├── recorder.js        # 회의 녹음 로직
│   └── styles.css         # 스타일
│
├── api/
│   ├── chat.js            # RAG 기반 채팅 API
│   ├── init.js            # Notion 초기화 API
│   ├── debug.js           # 데이터베이스 목록 API
│   └── meeting/
│       ├── process.js     # 회의 처리 API
│       ├── save.js        # Notion 저장 API
│       └── examples.js    # 이전 회의록 API
│
└── dist/
    ├── xspark Onboarding-1.0.0-arm64.dmg      # macOS 설치 파일
    └── xspark Onboarding-1.0.0-arm64-mac.zip  # ZIP 배포 파일
```

**기술적 도전 과제 및 해결:**

1. **문제**: API_BASE 스코핑 이슈
   - **해결**: `window.API_BASE`로 전역 변수 설정

2. **문제**: 녹음 시작 버튼이 활성화되지 않음
   - **원인**: "회의록" 키워드 매칭 실패
   - **해결**: 데이터베이스 로드 후 무조건 버튼 활성화

3. **문제**: 빈 녹음에서도 회의록 생성됨 (Whisper "환청")
   - **해결**: 3단계 품질 검증 로직 추가

4. **문제**: 회의록 자동 저장으로 확인 불가
   - **해결**: 미리보기 + 수동 저장 워크플로우 구현

**프롬프트 엔지니어링:**
- 이전 회의록 스타일 학습
- xspark 제품 문맥 이해
- 질문 중심 구조화 ("페르소나란?", "정산은 어떻게?")
- 기술적 세부사항 자동 분류

---

## 📦 v2.0.0 릴리스 (2025-10-31)

### 주요 변경사항

**1. 회의록 미리보기 및 수동 저장 워크플로우**
- ✅ 자동 저장 제거 → 사용자 확인 후 저장으로 변경
- ✅ 아름다운 미리보기 UI 추가
- ✅ **"📤 Notion에 저장"** 버튼 추가
- ✅ **"✏️ 수정하기"** 버튼으로 인라인 편집 가능
- ✅ 저장 후 Notion 링크 즉시 제공

**2. 버전 관리 시스템 도입**
- 📌 버전: v2.0.0
- 📌 이후 모든 업데이트는 시맨틱 버저닝 적용

**3. 빌드 최적화**
- `/public/` 폴더를 빌드에서 제외 (옛날 코드 제거)
- 빌드 크기 최적화 및 중복 파일 제거

**4. DevTools 개선**
- 개발 콘솔 자동 실행 비활성화 (깔끔한 사용자 경험)
- 필요시 Cmd+Option+I로 수동 실행 가능

### 파일 변경 내역

**수정된 파일:**
- `package.json` - 버전 2.0.0으로 업데이트, 빌드 설정 최적화
- `electron/main.cjs` - DevTools 자동 실행 비활성화
- `electron/recorder.js` - 미리보기 및 수동 저장 UI 구현 (라인 453-619)
- `api/meeting/process.js` - 자동 저장 제거, 미리보기 데이터 반환
- `api/meeting/save.js` - 신규 생성 (수동 Notion 저장 전용 엔드포인트)

### 배포 정보

**빌드 파일:**
- `dist/xspark Onboarding-2.0.0-arm64.dmg` (DMG 설치 파일)
- `dist/xspark Onboarding-2.0.0-arm64-mac.zip` (ZIP 배포 파일)

**설치 위치:**
- `/Applications/xspark Onboarding.app` (v2.0.0)

---

## 📦 v2.1.0 릴리스 (2025-10-31)

### 주요 변경사항

**1. Slack 일일 리포트 기능 추가** 🎉
- ✅ Slack 채널 메시지 일자별 수집
- ✅ GPT-4o로 자동 정리 (주요 논의, 결정사항, 액션 아이템)
- ✅ 회의록과 동일한 미리보기 → 수정 → Notion 저장 워크플로우
- ✅ 채널 및 저장 위치 선택 UI

**2. 버전 배지 UI 추가**
- ✅ 앱 헤더에 버전 표시 (v2.1.0)
- ✅ Glassmorphism 스타일 적용

### 신규 파일

**백엔드:**
- `backend/services/slack.js` - Slack API 통합 서비스
- `api/slack/channels.js` - 채널 목록 조회 API
- `api/slack/process.js` - 메시지 수집 및 GPT 정리 API
- `api/slack/save.js` - Notion 저장 API

**프론트엔드:**
- `electron/slack.js` - Slack 관리자 클래스 (채널 로드, 처리, 저장)

### 수정된 파일

- `package.json` - 버전 2.1.0으로 업데이트, @slack/web-api 추가
- `electron/index.html` - Slack UI 섹션 추가, 버전 배지 v2.1.0
- `electron/styles.css` - Slack UI 스타일 및 버전 배지 스타일 추가

### 환경변수 추가

- `SLACK_BOT_TOKEN` - Slack Bot User OAuth Token
- `SLACK_WORKSPACE_ID` - Slack 워크스페이스 ID

### 배포 정보

**빌드 파일:**
- `dist/xspark Onboarding-2.1.0-arm64.dmg`
- `dist/xspark Onboarding-2.1.0-arm64-mac.zip`

**설치 위치:**
- `/Applications/xspark Onboarding.app` (v2.1.0)

### 기술 세부사항

**Slack 메시지 수집:**
- Unix timestamp 기반 일자별 필터링
- 스레드 답글 자동 포함
- 사용자 정보 자동 조회
- 파일 첨부 정보 포함

**GPT 정리 프롬프트:**
- Temperature: 0.3 (일관성)
- Max tokens: 3000
- 형식: 주요 논의 / 결정 사항 / 액션 아이템 / 공유 링크 / 참여자

### 다음 버전 계획

**v2.2.0 (예정):**
- 회의록 템플릿 커스터마이징
- 다국어 지원 (영어/한국어)

**v2.3.0 (예정):**
- 회의록 검색 기능
- 태그 및 카테고리 관리
- Slack 리포트 자동 스케줄링

---

## 다음 할 일
1. ✅ 프로젝트 초기 설정 완료
2. ✅ MVP 코드 구현 완료
3. ✅ 보안 강화 완료
4. ✅ Electron 데스크톱 앱 구현
5. ✅ 회의 녹음 및 자동 정리 기능
6. ✅ 배포 (Vercel)
7. ⏳ 사용자 피드백 수집 및 개선
