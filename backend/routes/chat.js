import express from 'express';
import config from '../config/index.js';
import { chatRateLimiter, sanitizeLog } from '../utils/security.js';
import { NotionService } from '../services/notion.js';
import { OpenAIService } from '../services/openai.js';

const router = express.Router();

// 서비스 초기화
const notionService = new NotionService(config.notion.apiToken);
const openaiService = new OpenAIService(
  config.openai.apiKey,
  config.openai.model
);

/**
 * POST /api/chat
 * 채팅 메시지 처리
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    // 입력 검증
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: '유효한 메시지를 입력해주세요.'
      });
    }

    // Rate Limiting 체크
    const clientId = req.ip || 'unknown';
    const rateLimit = chatRateLimiter.check(clientId);

    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
      });
    }

    // Rate Limit 헤더 추가
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimit.resetAt.toISOString());

    if (config.logging.logApiCalls) {
      console.log(`[${conversationId}] User: ${sanitizeLog(message)}`);
    }

    // 1. Notion에서 관련 문서 검색
    console.log('Searching Notion documents...');
    const relevantDocs = await notionService.searchDocuments(message);
    console.log(`Found ${relevantDocs.length} relevant documents`);

    // 2. OpenAI로 답변 생성
    if (config.logging.logApiCalls) {
      console.log('Generating AI response...');
    }
    const answer = await openaiService.generateAnswer(message, relevantDocs);
    if (config.logging.logApiCalls) {
      console.log(`AI: ${sanitizeLog(answer.substring(0, 100))}...`);
    }

    // 3. 대화 로그 Notion에 저장 (비동기로 실행, 실패해도 응답은 반환)
    notionService.logConversation({
      conversationId,
      userMessage: message,
      aiResponse: answer,
      referencedDocs: relevantDocs.map(doc => doc.id)
    }).catch(err => {
      console.error('Failed to log conversation:', err);
    });

    // 4. 응답 반환
    res.json({
      answer,
      references: relevantDocs.map(doc => ({
        title: doc.title,
        url: doc.url
      }))
    });

  } catch (error) {
    console.error('Chat error:', error);

    // 에러 타입에 따른 응답
    if (error.message.includes('Notion')) {
      return res.status(500).json({
        error: 'Notion 문서를 검색하는 중 오류가 발생했습니다.'
      });
    }

    if (error.message.includes('AI')) {
      return res.status(500).json({
        error: 'AI 답변 생성 중 오류가 발생했습니다.'
      });
    }

    res.status(500).json({
      error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
});

/**
 * GET /api/health
 * 헬스체크 엔드포인트
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      notion: !!process.env.NOTION_API_TOKEN,
      openai: !!process.env.OPENAI_API_KEY
    }
  });
});

export default router;
