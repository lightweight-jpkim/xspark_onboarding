# 🔗 Notion Integration 설정 가이드

## ⚠️ 중요: Integration 연결 필수!

Notion API 키만으로는 **자동으로 모든 페이지에 접근할 수 없습니다.**
각 페이지/데이터베이스마다 **명시적으로 Integration을 연결**해야 합니다.

---

## 🔍 1단계: 현재 접근 가능한 페이지 확인

배포된 앱에서 다음 URL에 접속하여 현재 상태를 확인하세요:

```
https://xspark-onboarding.vercel.app/api/debug
```

**예상 결과:**

### ✅ Integration이 연결된 경우:
```json
{
  "status": "ok",
  "accessible": {
    "pages": {
      "count": 5,
      "list": [
        {
          "id": "abc123...",
          "title": "xspark 프로덕트 개요",
          "url": "https://notion.so/...",
          "lastEditedTime": "2025-10-30T..."
        }
      ]
    }
  },
  "summary": {
    "totalAccessible": 5,
    "message": "✅ 5개 페이지, 2개 데이터베이스 접근 가능"
  }
}
```

### ❌ Integration이 연결 안 된 경우:
```json
{
  "accessible": {
    "pages": {
      "count": 0,
      "list": []
    }
  },
  "summary": {
    "message": "⚠️ Integration이 어떤 페이지에도 연결되지 않았습니다!"
  }
}
```

---

## 🔗 2단계: xspark 관련 페이지에 Integration 연결

### 방법 1: 개별 페이지에 연결

xspark 프로덕트 관련 **모든 중요 페이지**에서:

```
1. Notion 페이지 열기
2. 우측 상단 ⋯ (더보기) 클릭
3. "Connections" 또는 "연결" 클릭
4. "xspark_onboarding" Integration 선택
5. "Confirm" 또는 "확인" 클릭
```

**연결해야 할 페이지 예시:**
- ✅ xspark 프로덕트 개요
- ✅ 기획 문서
- ✅ 기술 스펙
- ✅ 개발 로드맵
- ✅ 이슈 로그
- ✅ 회의록
- ✅ FAQ 데이터베이스

### 방법 2: 부모 페이지에 연결 (추천)

xspark 관련 페이지가 모두 한 부모 페이지 아래에 있다면:

```
1. 최상위 부모 페이지 열기 (예: "xspark 프로젝트")
2. ⋯ → Connections → xspark_onboarding 연결
3. 하위 모든 페이지가 자동으로 접근 가능!
```

---

## 📊 3단계: 연결 확인

Integration을 연결한 후:

```
1. https://xspark-onboarding.vercel.app/api/debug 다시 접속
2. "accessible.pages.count"가 증가했는지 확인
3. 연결한 페이지가 목록에 표시되는지 확인
```

---

## 🎯 4단계: AI 테스트

Integration이 제대로 연결되었다면:

```
1. https://xspark-onboarding.vercel.app 접속
2. 채팅: "xspark 프로덕트에 대해 알려줘"
3. AI가 Notion 문서를 찾아서 답변하는지 확인
4. 답변 하단에 "참조 문서" 링크가 표시되는지 확인
```

---

## 🔧 문제 해결

### Q1: /api/debug에서 "count": 0 이 나와요

**원인:** Integration이 어떤 페이지에도 연결되지 않음

**해결:**
1. Notion에서 xspark 관련 페이지 열기
2. ⋯ → Connections → xspark_onboarding 선택
3. 여러 페이지에 반복
4. /api/debug 다시 확인

### Q2: 특정 페이지만 보이고 다른 페이지는 안 보여요

**원인:** 각 페이지마다 개별적으로 연결해야 함

**해결:**
- 옵션 A: 각 페이지에 Integration 연결
- 옵션 B: 부모 페이지에 연결 (하위 자동 포함)

### Q3: AI가 "관련 문서를 찾지 못했습니다"라고 해요

**원인:**
1. Integration 연결 안 됨
2. 검색 키워드와 페이지 제목이 안 맞음

**해결:**
1. /api/debug로 연결된 페이지 목록 확인
2. 페이지 제목에 "xspark" 같은 키워드 포함
3. 더 많은 페이지에 Integration 연결

### Q4: 민감한 페이지는 어떻게 하나요?

**해결:**
- 공개해도 되는 페이지만 Integration 연결
- 민감한 개인 페이지는 연결하지 않으면 접근 불가
- Integration 권한은 "연결된 페이지만" 읽기 가능

---

## 📋 권장 Notion 구조

```
📁 xspark 프로젝트 (부모 페이지)
   ├─ ⚙️ Integration 연결 ← 여기에만 연결하면 아래 모두 접근!
   │
   ├── 📄 프로덕트 개요
   ├── 📄 기술 스펙
   ├── 📄 개발 로드맵
   ├── 📊 이슈 로그 (데이터베이스)
   ├── 💬 FAQ (데이터베이스)
   └── 📂 회의록
       ├── 2025-10-30 회의
       └── 2025-10-25 회의
```

**장점:**
- 부모 페이지 하나에만 Integration 연결
- 하위 모든 페이지 자동 접근 가능
- 새 페이지 추가 시 자동으로 포함

---

## ✅ 최종 체크리스트

배포 완료 후:

- [ ] /api/debug 접속하여 현재 상태 확인
- [ ] xspark 관련 부모 페이지에 Integration 연결
- [ ] /api/debug에서 페이지 목록 확인 (count > 0)
- [ ] 앱에서 "xspark가 뭐야?" 테스트
- [ ] 참조 문서 링크 확인
- [ ] Notion 페이지 제목에 검색 키워드 포함 확인

---

## 🎯 이상적인 결과

```json
{
  "accessible": {
    "pages": {
      "count": 10,
      "list": [
        "xspark 프로덕트 개요",
        "기술 스펙",
        "개발 로드맵",
        ...
      ]
    },
    "databases": {
      "count": 2,
      "list": [
        "FAQ",
        "이슈 로그"
      ]
    }
  },
  "summary": {
    "totalAccessible": 12,
    "message": "✅ 10개 페이지, 2개 데이터베이스 접근 가능"
  }
}
```

이 상태가 되면 AI가 xspark 프로덕트에 대해 정확하고 구체적인 답변을 제공할 수 있습니다!

---

**마지막 업데이트:** 2025-10-30
