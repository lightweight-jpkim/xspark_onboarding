// Vercel Serverless Function for Chat
import config from '../backend/config/index.js';
import { chatRateLimiter, sanitizeLog } from '../backend/utils/security.js';
import { NotionService } from '../backend/services/notion.js';
import { OpenAIService } from '../backend/services/openai.js';

// 서비스 초기화
const notionService = new NotionService(config.notion.apiToken);
const openaiService = new OpenAIService(
  config.openai.apiKey,
  config.openai.model
);

/**
 * 전체 페이지에서 쿼리와 관련된 페이지 필터링
 */
function filterRelevantPages(allPages, query) {
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/).filter(k => k.length > 1);

  // 각 페이지에 점수 부여
  const scored = allPages.map(page => {
    let score = 0;
    const titleLower = page.title.toLowerCase();
    const contentLower = page.content?.toLowerCase() || '';

    // 제목에 키워드 포함 시 높은 점수
    keywords.forEach(keyword => {
      if (titleLower.includes(keyword)) {
        score += 10;
      }
      // 내용에 키워드 포함 시 낮은 점수
      if (contentLower.includes(keyword)) {
        score += 1;
      }
    });

    // xspark 관련 페이지 우선
    if (titleLower.includes('xspark') || contentLower.includes('xspark')) {
      score += 5;
    }

    // 최근 업데이트된 페이지 우선
    const daysSinceUpdate = (Date.now() - new Date(page.lastEditedTime)) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) {
      score += 2;
    }

    return { ...page, score };
  });

  // 점수로 정렬하고 상위 15개 선택
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .filter(p => p.score > 0); // 점수가 0보다 큰 것만
}

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', config.cors.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message, conversationId } = req.body;

    // 입력 검증
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: '유효한 메시지를 입력해주세요.'
      });
    }

    // Rate Limiting 체크
    const clientId = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
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

    // 1. 캐시 확인 및 전체 페이지 로드 (필요시)
    const cacheStatus = notionService.getCacheStatus();
    let allPages;

    if (!cacheStatus.cached) {
      console.log('⚠️ 캐시 없음, 전체 페이지 로딩 중...');
      allPages = await notionService.loadAllPages();
      console.log(`✅ ${allPages.length}개 페이지 로딩 완료`);
    } else {
      console.log(`✅ 캐시 사용 (${cacheStatus.pageCount}개 페이지)`);
      allPages = await notionService.loadAllPages(); // 캐시된 것 반환
    }

    // 2. 쿼리와 관련된 문서 필터링 (전체 페이지에서)
    const relevantDocs = filterRelevantPages(allPages, message);
    console.log(`📄 전체 ${allPages.length}개 중 ${relevantDocs.length}개 관련 문서 선택`);

    // 3. OpenAI로 답변 생성 (더 많은 컨텍스트 제공)
    if (config.logging.logApiCalls) {
      console.log('Generating AI response...');
    }
    const answer = await openaiService.generateAnswer(message, relevantDocs, allPages);
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
    return res.status(200).json({
      answer,
      references: relevantDocs.map(doc => ({
        title: doc.title,
        url: doc.url
      }))
    });

  } catch (error) {
    console.error('Chat error:', error);

    // 에러 타입에 따른 응답
    if (error.message && error.message.includes('Notion')) {
      return res.status(500).json({
        error: 'Notion 문서를 검색하는 중 오류가 발생했습니다.'
      });
    }

    if (error.message && error.message.includes('AI')) {
      return res.status(500).json({
        error: 'AI 답변 생성 중 오류가 발생했습니다.'
      });
    }

    return res.status(500).json({
      error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
}
