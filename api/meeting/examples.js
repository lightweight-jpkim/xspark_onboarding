// Vercel Serverless Function - 기존 회의록 샘플 가져오기
import { NotionService } from '../../backend/services/notion.js';
import appConfig from '../../backend/config/index.js';

const notionService = new NotionService(appConfig.notion.apiToken);
const MEETING_DB_ID = '23a53778-0f61-8026-bab8-f0785fe9f301';

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
    console.log('📋 회의록 샘플 가져오기 시작...');

    // 회의록 데이터베이스에서 페이지 목록 가져오기
    const response = await notionService.client.databases.query({
      database_id: MEETING_DB_ID,
      page_size: 10, // 최대 10개
      sorts: [
        {
          timestamp: 'last_edited_time',
          direction: 'descending'
        }
      ]
    });

    console.log(`✅ ${response.results.length}개 페이지 발견`);

    // 각 페이지의 내용 가져오기
    const examples = [];
    for (const page of response.results) {
      try {
        // 페이지 제목 추출
        const titleProperty = page.properties['제목'] || page.properties['Name'] || page.properties['title'];
        let title = 'Untitled';

        if (titleProperty && titleProperty.title && titleProperty.title.length > 0) {
          title = titleProperty.title.map(t => t.plain_text).join('');
        }

        console.log(`📄 페이지 읽기: ${title}`);

        // 페이지 블록 내용 가져오기
        const blocks = await notionService.getPageBlocks(page.id);
        const content = notionService.blocksToText(blocks);

        examples.push({
          id: page.id,
          title,
          content,
          created_time: page.created_time,
          last_edited_time: page.last_edited_time,
          url: page.url
        });

      } catch (error) {
        console.error(`페이지 읽기 실패 (${page.id}):`, error.message);
      }
    }

    console.log(`✅ 총 ${examples.length}개 회의록 샘플 수집 완료`);

    return res.status(200).json({
      success: true,
      count: examples.length,
      examples
    });

  } catch (error) {
    console.error('❌ 회의록 샘플 가져오기 실패:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
