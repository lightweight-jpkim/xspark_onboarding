// Vercel Serverless Function for Indexing all Notion pages
import config from '../backend/config/index.js';
import { NotionService } from '../backend/services/notion.js';

const notionService = new NotionService(config.notion.apiToken);

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 모든 페이지 조회
    const searchResponse = await notionService.client.search({
      filter: {
        property: 'object',
        value: 'page'
      },
      page_size: 100,
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      }
    });

    // 모든 데이터베이스 조회
    const dbSearchResponse = await notionService.client.search({
      filter: {
        property: 'object',
        value: 'database'
      },
      page_size: 100
    });

    // 페이지 상세 정보 추출 (첫 몇 줄의 내용 포함)
    const pagesWithContent = await Promise.all(
      searchResponse.results.slice(0, 50).map(async (page) => {
        try {
          // 페이지 내용 일부 가져오기 (처음 500자)
          const content = await notionService.getPageContent(page.id);
          const preview = content.substring(0, 500);

          return {
            id: page.id,
            title: notionService.extractTitle(page),
            url: page.url,
            lastEditedTime: page.last_edited_time,
            createdTime: page.created_time,
            preview: preview,
            contentLength: content.length
          };
        } catch (error) {
          console.error(`Failed to get content for page ${page.id}:`, error.message);
          return {
            id: page.id,
            title: notionService.extractTitle(page),
            url: page.url,
            lastEditedTime: page.last_edited_time,
            createdTime: page.created_time,
            preview: '',
            contentLength: 0
          };
        }
      })
    );

    const databases = dbSearchResponse.results.map(db => ({
      id: db.id,
      title: notionService.extractTitle(db),
      url: db.url,
      lastEditedTime: db.last_edited_time
    }));

    // 워크스페이스 구조 맵 생성
    const workspaceMap = {
      totalPages: searchResponse.results.length,
      totalDatabases: dbSearchResponse.results.length,
      pages: pagesWithContent,
      databases: databases,
      summary: {
        recentlyUpdated: pagesWithContent.slice(0, 10).map(p => ({
          title: p.title,
          lastEdited: p.lastEditedTime
        })),
        topics: extractTopics(pagesWithContent)
      }
    };

    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      workspace: workspaceMap,
      message: `✅ ${workspaceMap.totalPages}개 페이지, ${workspaceMap.totalDatabases}개 데이터베이스 인덱싱 완료`
    });

  } catch (error) {
    console.error('Workspace Index API error:', error);

    return res.status(500).json({
      error: 'Notion 인덱싱 중 오류 발생',
      message: error.message
    });
  }
}

// 페이지 제목에서 주요 토픽 추출
function extractTopics(pages) {
  const topics = {};

  pages.forEach(page => {
    const title = page.title.toLowerCase();

    // 주요 키워드 추출
    const keywords = ['xspark', 'product', 'api', 'design', 'spec', 'roadmap', 'issue', 'meeting', 'faq'];

    keywords.forEach(keyword => {
      if (title.includes(keyword)) {
        if (!topics[keyword]) {
          topics[keyword] = [];
        }
        topics[keyword].push({
          title: page.title,
          url: page.url
        });
      }
    });
  });

  return topics;
}
