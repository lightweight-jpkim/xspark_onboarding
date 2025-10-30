// Vercel Serverless Function for Debug
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
    // Notion Search API로 접근 가능한 모든 페이지 조회
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

    const pages = searchResponse.results.map(page => ({
      id: page.id,
      title: notionService.extractTitle(page),
      url: page.url,
      lastEditedTime: page.last_edited_time,
      createdTime: page.created_time
    }));

    // 데이터베이스도 조회
    const dbSearchResponse = await notionService.client.search({
      filter: {
        property: 'object',
        value: 'database'
      },
      page_size: 100
    });

    const databases = dbSearchResponse.results.map(db => ({
      id: db.id,
      title: notionService.extractTitle(db),
      url: db.url,
      lastEditedTime: db.last_edited_time
    }));

    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      integration: {
        name: 'xspark_onboarding',
        hasToken: !!config.notion.apiToken
      },
      accessible: {
        pages: {
          count: pages.length,
          list: pages
        },
        databases: {
          count: databases.length,
          list: databases
        }
      },
      summary: {
        totalAccessible: pages.length + databases.length,
        message: pages.length === 0
          ? '⚠️ Integration이 어떤 페이지에도 연결되지 않았습니다!'
          : `✅ ${pages.length}개 페이지, ${databases.length}개 데이터베이스 접근 가능`
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);

    return res.status(500).json({
      error: 'Notion API 호출 중 오류 발생',
      message: error.message,
      hint: 'Notion Integration Token이 올바른지 확인하세요'
    });
  }
}
