// Vercel Serverless Function for Initialization
import config from '../backend/config/index.js';
import { NotionService } from '../backend/services/notion.js';

const notionService = new NotionService(config.notion.apiToken);

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const forceRefresh = req.query.refresh === 'true' || req.body?.refresh === true;

    console.log(`🚀 초기화 요청 (forceRefresh: ${forceRefresh})`);

    // 캐시 상태 확인
    const cacheStatus = notionService.getCacheStatus();

    // 이미 캐시되어 있고 강제 새로고침이 아니면 바로 반환
    if (cacheStatus.cached && !forceRefresh) {
      return res.status(200).json({
        status: 'already_cached',
        message: '이미 초기화되어 있습니다',
        cache: cacheStatus,
        totalPages: cacheStatus.pageCount
      });
    }

    // 모든 페이지 로드
    const startTime = Date.now();
    const allPages = await notionService.loadAllPages(forceRefresh);
    const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // 통계 계산
    const stats = {
      totalPages: allPages.length,
      totalCharacters: allPages.reduce((sum, p) => sum + (p.content?.length || 0), 0),
      avgCharactersPerPage: Math.floor(
        allPages.reduce((sum, p) => sum + (p.content?.length || 0), 0) / allPages.length
      ),
      pagesWithContent: allPages.filter(p => p.content && p.content.length > 0).length,
      pagesWithErrors: allPages.filter(p => p.error).length,
      loadTimeSeconds: loadTime
    };

    // 페이지 목록 (제목과 미리보기만)
    const pageList = allPages.map(p => ({
      id: p.id,
      title: p.title,
      url: p.url,
      preview: p.content ? p.content.substring(0, 200) + '...' : '(내용 없음)',
      lastEdited: p.lastEditedTime,
      hasError: !!p.error
    }));

    return res.status(200).json({
      status: 'success',
      message: `✅ ${stats.totalPages}개 페이지 초기화 완료 (${loadTime}초)`,
      stats,
      pages: pageList,
      cache: notionService.getCacheStatus()
    });

  } catch (error) {
    console.error('Init API error:', error);

    return res.status(500).json({
      error: 'Notion 초기화 중 오류 발생',
      message: error.message
    });
  }
}
