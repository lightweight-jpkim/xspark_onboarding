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

## 다음 할 일
1. ✅ 프로젝트 초기 설정 완료
2. ✅ MVP 코드 구현 완료
3. ✅ 보안 강화 완료
4. ⏳ 환경변수 설정 및 테스트
5. ⏳ 배포
