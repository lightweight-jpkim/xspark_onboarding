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

    const examples = [];

    // 방법 1: 데이터베이스에서 항목 가져오기 시도
    try {
      console.log('📊 방법 1: 데이터베이스 쿼리 시도...');
      const dbResponse = await notionService.client.databases.query({
        database_id: MEETING_DB_ID,
        page_size: 10,
        sorts: [
          {
            timestamp: 'last_edited_time',
            direction: 'descending'
          }
        ]
      });

      console.log(`  ✅ 데이터베이스에서 ${dbResponse.results.length}개 항목 발견`);

      for (const page of dbResponse.results) {
        const title = notionService.extractTitle(page);
        console.log(`  📄 데이터베이스 항목: ${title}`);

        const content = await notionService.getPageContent(page.id);

        examples.push({
          id: page.id,
          title,
          content,
          source: 'database',
          created_time: page.created_time,
          last_edited_time: page.last_edited_time,
          url: page.url
        });
      }
    } catch (dbError) {
      console.log('  ⚠️ 데이터베이스 쿼리 실패:', dbError.message);
    }

    // 방법 2: 페이지의 하위 블록(child pages) 가져오기
    try {
      console.log('📄 방법 2: 페이지의 하위 페이지 가져오기 시도...');
      const blocks = await notionService.client.blocks.children.list({
        block_id: MEETING_DB_ID,
        page_size: 100
      });

      console.log(`  ✅ ${blocks.results.length}개 하위 블록 발견`);

      // child_page 타입인 블록들만 필터링
      const childPages = blocks.results.filter(block => block.type === 'child_page');
      console.log(`  ✅ ${childPages.length}개 하위 페이지 발견`);

      for (const childPage of childPages) {
        const title = childPage.child_page?.title || 'Untitled';
        console.log(`  📄 하위 페이지: ${title}`);

        try {
          const content = await notionService.getPageContent(childPage.id);

          examples.push({
            id: childPage.id,
            title,
            content,
            source: 'child_page',
            created_time: childPage.created_time,
            last_edited_time: childPage.last_edited_time
          });
        } catch (error) {
          console.error(`  ❌ 하위 페이지 내용 가져오기 실패 (${childPage.id}):`, error.message);
        }
      }
    } catch (blockError) {
      console.log('  ⚠️ 하위 페이지 가져오기 실패:', blockError.message);
    }

    // 방법 3: 전체 검색으로 "회의록" 관련 페이지 찾기
    if (examples.length === 0) {
      console.log('🔍 방법 3: 전체 검색으로 회의록 찾기...');
      const searchResponse = await notionService.client.search({
        query: '회의록',
        filter: {
          property: 'object',
          value: 'page'
        },
        page_size: 10,
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        }
      });

      console.log(`  ✅ 검색 결과 ${searchResponse.results.length}개 페이지 발견`);

      for (const page of searchResponse.results) {
        const title = notionService.extractTitle(page);
        console.log(`  📄 검색 결과: ${title}`);

        const content = await notionService.getPageContent(page.id);

        examples.push({
          id: page.id,
          title,
          content,
          source: 'search',
          created_time: page.created_time,
          last_edited_time: page.last_edited_time,
          url: page.url
        });
      }
    }

    console.log(`✅ 총 ${examples.length}개 회의록 샘플 수집 완료`);

    // 회의 날짜 기준으로 정렬 (최신순)
    const sortedExamples = examples.sort((a, b) => {
      // created_time을 날짜로 파싱하여 비교 (최신이 먼저)
      const dateA = new Date(a.created_time || a.last_edited_time);
      const dateB = new Date(b.created_time || b.last_edited_time);
      return dateB - dateA; // 내림차순 (최신순)
    });

    console.log(`✅ 회의 날짜 기준으로 정렬 완료`);

    return res.status(200).json({
      success: true,
      count: sortedExamples.length,
      examples: sortedExamples
    });

  } catch (error) {
    console.error('❌ 회의록 샘플 가져오기 실패:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
