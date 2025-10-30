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
      const systemPrompt = `당신은 xspark 내부 개발 툴의 온보딩을 돕는 친절한 AI 어시스턴트입니다.

역할:
- 제공된 Notion 문서를 참고하여 정확하게 답변합니다
- 답변은 한국어로 제공합니다
- 친절하고 이해하기 쉽게 설명합니다
- 코드 예시나 단계별 가이드를 포함할 수 있습니다
- 문서에 없는 내용은 추측하지 않고 솔직히 모른다고 답합니다

답변 형식:
- 간결하고 명확하게 작성합니다
- 필요시 번호나 불릿 포인트를 사용합니다
- 문서 제목을 언급하여 출처를 명확히 합니다`;

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
