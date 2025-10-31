# 🎤 회의 녹음 기능 설정 가이드

## 필수 환경변수 설정

회의 녹음 기능을 사용하려면 Notion에서 회의록을 저장할 부모 페이지 ID를 설정해야 합니다.

---

## 1️⃣ Notion 부모 페이지 ID 찾기

### 방법 1: Notion 페이지 URL에서 추출

1. Notion에서 회의록을 저장할 페이지를 엽니다 (예: "xspark 회의록" 페이지)

2. 페이지 URL을 확인합니다:
   ```
   https://www.notion.so/xspark-회의록-29a537780f618008b0a8e9f902f20ce8
   ```

3. 마지막 32자리가 페이지 ID입니다:
   ```
   29a537780f618008b0a8e9f902f20ce8
   ```

4. 하이픈을 추가하여 정규 형식으로 변환:
   ```
   29a53778-0f61-8008-b0a8-e9f902f20ce8
   ```

### 방법 2: /api/debug에서 찾기

1. 앱의 `/api/debug` 엔드포인트에 접속:
   ```
   https://xspark-onboarding.vercel.app/api/debug
   ```

2. `accessible.pages.list`에서 회의록 페이지를 찾아 `id` 복사

---

## 2️⃣ Vercel 환경변수 설정

1. Vercel 프로젝트 설정 페이지 접속:
   ```
   https://vercel.com/jjkks-projects-adac4402/xspark-onboarding/settings/environment-variables
   ```

2. 새 환경변수 추가:
   - **Key**: `NOTION_MEETING_PARENT_ID`
   - **Value**: (위에서 찾은 페이지 ID)
   - **Environment**: Production, Preview, Development 모두 체크

3. "Save" 클릭

4. 앱 재배포:
   - Settings → Deployments
   - 최신 배포의 "..." 메뉴 → "Redeploy"

---

## 3️⃣ Notion Integration 권한 확인

회의록 페이지에 Integration이 연결되어 있는지 확인:

1. Notion에서 회의록 부모 페이지 열기

2. 우측 상단 "Share" 버튼 클릭

3. "Invite" 입력창에 "xspark_onboarding" 입력

4. Integration 선택 후 "Invite" 클릭

---

## 4️⃣ 테스트

1. 앱 접속:
   ```
   https://xspark-onboarding.vercel.app
   ```

2. "🎤 회의 녹음 시작" 버튼 클릭

3. 마이크 권한 허용

4. 짧게 테스트 음성 녹음 (예: "이것은 테스트입니다")

5. "⏹️ 녹음 중지" 버튼 클릭

6. 처리 완료 후 Notion 링크 확인

---

## 🔧 문제 해결

### Q1: "NOTION_MEETING_PARENT_ID 환경변수가 설정되지 않았습니다" 오류

**원인**: 환경변수 미설정

**해결**:
1. Vercel 환경변수 설정 확인
2. 앱 재배포

### Q2: "Notion 저장 실패" 오류

**원인**: Integration이 부모 페이지에 연결되지 않음

**해결**:
1. Notion에서 부모 페이지 열기
2. Share → xspark_onboarding Integration 연결
3. 다시 시도

### Q3: 마이크 권한 오류

**원인**: 브라우저에서 마이크 접근 차단

**해결**:
- Chrome: 주소창 왼쪽 자물쇠 → 사이트 설정 → 마이크 허용
- HTTPS 필수 (localhost 또는 배포된 사이트에서만 작동)

### Q4: 파일이 너무 큼 (25MB 초과)

**원인**: OpenAI Whisper API 제한

**해결**:
- 더 짧은 회의 녹음 (약 2시간 이하)
- 또는 회의를 여러 번으로 나누어 녹음

---

## 📊 예상 비용 (1시간 회의 기준)

- OpenAI Whisper: $0.006/분 × 60분 = **$0.36**
- GPT-4o 회의록 정리: 약 **$0.03**
- **총: 약 $0.40/회의**

---

## ✅ 권장 Notion 구조

```
📁 xspark 워크스페이스
   └── 📂 xspark 회의록 ← NOTION_MEETING_PARENT_ID
       ├── 회의록 2025-10-30 - xspark 제품 개발 회의
       ├── 회의록 2025-10-29 - 주간 스프린트 리뷰
       └── 회의록 2025-10-28 - 기획 회의
```

부모 페이지에 Integration을 연결하면 하위 모든 회의록 페이지에 자동으로 접근 가능합니다.

---

**마지막 업데이트**: 2025-10-30
