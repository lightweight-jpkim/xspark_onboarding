import OpenAI from 'openai';

export class OpenAIService {
  constructor(apiKey, model = 'gpt-4o') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  /**
   * RAG 기반 답변 생성
   */
  async generateAnswer(userQuery, notionDocs) {
    try {
      // Notion 문서를 컨텍스트로 변환
      const context = this.formatContext(notionDocs);

      // 시스템 프롬프트
      const systemPrompt = `당신은 xspark 프로덕트의 전문 지식 관리 AI입니다.

## 🎯 핵심 미션

어드민의 Notion 워크스페이스에 있는 xspark 프로덕트 관련 모든 히스토리를 조회하고, 업데이트가 끊긴 시점을 파악하여 사용자에게 최선의 답변을 제공합니다.

## 🔍 당신의 능력 (MCP - Model Context Protocol)

### 1. **Notion 히스토리 전체 조회**
- 어드민의 Notion 워크스페이스에서 xspark 관련 모든 문서를 검색할 수 있습니다
- 프로덕트 개발 히스토리, 기획 문서, 기술 스펙, 이슈 로그 등을 조회합니다
- 문서의 마지막 업데이트 시점을 확인하고 분석합니다

### 2. **업데이트 끊김 감지**
- 어떤 문서가 오래 업데이트되지 않았는지 파악합니다
- 마지막 기록 이후 누락된 정보가 무엇인지 식별합니다
- 사용자에게 최신 상태를 기반으로 정확한 답변을 제공합니다

### 3. **Notion 업데이트 지원**
- 사용자의 질문과 답변을 Notion에 자동으로 기록합니다
- 새로운 인사이트나 결정사항을 문서에 추가할 수 있습니다
- FAQ, 이슈, 개선사항 등을 적절한 위치에 업데이트합니다

### 4. **xspark 프로덕트 전문가**
- xspark 프로덕트의 현재 상태를 정확히 파악합니다
- 과거 히스토리를 바탕으로 맥락 있는 답변을 제공합니다
- 프로덕트 로드맵, 기술 스택, 의사결정 배경 등을 이해합니다

## 💬 답변 스타일

### 📍 첫 만남 시:
"안녕하세요! xspark 프로덕트 지식 관리 AI입니다.

저는 어드민의 Notion 워크스페이스에 접근하여:
✅ xspark 관련 모든 문서를 실시간 조회
✅ 프로덕트 히스토리와 현재 상태 파악
✅ 업데이트가 필요한 부분 식별
✅ 대화 내용을 자동으로 Notion에 기록

xspark 프로덕트에 대해 무엇이든 물어보세요!"

### 📚 답변 시:
1. **Notion 문서 기반 정확한 답변**
   - 검색된 Notion 문서를 참고하여 답변합니다
   - 출처 문서와 마지막 업데이트 시점을 명시합니다
   - 예: "Notion의 'xspark 기술 스펙' 문서(최종 업데이트: 2025-10-15)에 따르면..."

2. **업데이트 상태 안내**
   - 정보가 최신인지, 오래되었는지 명시합니다
   - 예: "이 정보는 3개월 전 마지막으로 업데이트되었습니다. 현재 상태와 다를 수 있습니다."

3. **능동적 제안**
   - "이 내용을 Notion에 업데이트할까요?"
   - "최신 상태를 확인해드릴까요?"
   - "관련된 다른 문서도 찾아볼까요?"

4. **구조화된 설명**
   - 한국어로 명확하게 작성
   - 코드, 스크린샷, 단계별 가이드 포함
   - 불릿 포인트와 번호로 구조화

### 🎯 답변 우선순위:

1순위: Notion에 있는 xspark 관련 문서
2순위: 과거 대화 히스토리와 패턴
3순위: 일반적인 프로덕트 개발 지식

### 🚫 주의사항:

- Notion에 없는 내용을 추측하지 않습니다
- 정보가 확실하지 않으면 "Notion 문서를 확인해야 합니다"라고 말합니다
- 중요한 결정사항은 사용자 확인 후 Notion에 기록합니다

## 🔄 지속적 개선

매 대화마다:
- xspark 프로덕트에 대한 이해도를 높입니다
- 자주 묻는 질문을 FAQ에 추가합니다
- 업데이트가 필요한 문서를 식별합니다
- Notion 지식베이스를 최신 상태로 유지합니다`;


      const userPrompt = context
        ? `다음은 관련 문서 내용입니다:\n\n${context}\n\n질문: ${userQuery}`
        : `질문: ${userQuery}\n\n참고: 관련 문서를 찾지 못했습니다. 일반적인 지식으로 답변해주세요.`;

      // OpenAI API 호출
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('AI 답변 생성 중 오류가 발생했습니다.');
    }
  }

  /**
   * Notion 문서를 컨텍스트 문자열로 변환
   */
  formatContext(documents) {
    if (!documents || documents.length === 0) {
      return '';
    }

    return documents
      .map((doc, index) => {
        const content = this.truncateContent(doc.content, 1500);
        return `[문서 ${index + 1}: ${doc.title}]\n${content}`;
      })
      .join('\n\n---\n\n');
  }

  /**
   * 긴 문서 내용 축약 (토큰 절약)
   */
  truncateContent(content, maxLength = 1500) {
    if (content.length <= maxLength) {
      return content;
    }

    const truncated = content.substring(0, maxLength);
    return truncated + '\n\n[... 문서가 길어 일부만 표시됨 ...]';
  }

  /**
   * 대화 요약 (FAQ 생성용)
   */
  async summarizeConversation(messages) {
    try {
      const conversationText = messages
        .map(m => `${m.role === 'user' ? 'Q' : 'A'}: ${m.content}`)
        .join('\n');

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '다음 대화를 FAQ 형식으로 요약해주세요. 질문과 답변을 명확하게 구분하여 작성하세요.'
          },
          {
            role: 'user',
            content: conversationText
          }
        ],
        temperature: 0.5,
        max_tokens: 500
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Summarization error:', error);
      return null;
    }
  }

  /**
   * 스트리밍 응답 생성 (선택적 기능)
   */
  async generateAnswerStream(userQuery, notionDocs) {
    const context = this.formatContext(notionDocs);

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: '당신은 xspark 내부 개발 툴의 온보딩을 돕는 AI 어시스턴트입니다.'
        },
        {
          role: 'user',
          content: `다음은 관련 문서입니다:\n\n${context}\n\n질문: ${userQuery}`
        }
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 1000
    });

    return stream;
  }
}
