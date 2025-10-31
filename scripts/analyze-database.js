// Notion 데이터베이스 상세 분석 스크립트
import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const NOTION_TOKEN = process.env.NOTION_API_TOKEN;

const notion = new Client({ auth: NOTION_TOKEN });

async function analyzeDatabases() {
  console.log('🔍 Notion 데이터베이스 상세 분석...\n');

  const databaseIds = [
    '23a53778-0f61-8026-bab8-f0785fe9f301',  // 최근 (10월 31일)
    '23a53778-0f61-80ee-87ce-f73060ef1d87',  // 9월 22일
    '23a53778-0f61-80e7-9a82-e8a0cd707811'   // 9월 3일
  ];

  for (const dbId of databaseIds) {
    try {
      console.log('━'.repeat(80));

      // 데이터베이스 메타데이터 조회
      const database = await notion.databases.retrieve({ database_id: dbId });

      const title = extractDatabaseTitle(database);
      console.log(`\n📊 데이터베이스: ${title}`);
      console.log(`   ID: ${dbId}`);
      console.log(`   URL: ${database.url}`);
      console.log(`   생성: ${new Date(database.created_time).toLocaleString('ko-KR')}`);
      console.log(`   수정: ${new Date(database.last_edited_time).toLocaleString('ko-KR')}`);

      // 속성(properties) 목록
      console.log(`\n   📋 속성 (Properties):`);
      for (const [key, prop] of Object.entries(database.properties)) {
        console.log(`      - ${key}: ${prop.type}`);
      }

      // 데이터베이스 항목(rows) 조회
      console.log(`\n   📄 항목 (최근 10개):`);
      const queryResponse = await notion.databases.query({
        database_id: dbId,
        page_size: 10,
        sorts: [
          {
            timestamp: 'last_edited_time',
            direction: 'descending'
          }
        ]
      });

      if (queryResponse.results.length === 0) {
        console.log(`      (항목 없음)`);
      } else {
        queryResponse.results.forEach((item, index) => {
          const itemTitle = extractPageTitle(item);
          const date = new Date(item.last_edited_time).toLocaleDateString('ko-KR');
          console.log(`      ${index + 1}. ${itemTitle} (${date})`);
        });
      }

      console.log();

    } catch (error) {
      console.error(`❌ 데이터베이스 ${dbId} 조회 실패:`, error.message);
    }
  }

  console.log('━'.repeat(80));
  console.log('\n✅ 분석 완료!\n');
}

function extractDatabaseTitle(database) {
  try {
    if (database.title && database.title.length > 0) {
      return database.title[0].plain_text || 'Untitled';
    }
    return 'Untitled';
  } catch (error) {
    return 'Untitled';
  }
}

function extractPageTitle(page) {
  try {
    // Name 속성 시도
    if (page.properties?.Name?.title?.[0]?.plain_text) {
      return page.properties.Name.title[0].plain_text;
    }
    // 이름 속성 시도
    if (page.properties?.이름?.title?.[0]?.plain_text) {
      return page.properties.이름.title[0].plain_text;
    }
    // title 속성 시도
    if (page.properties?.title?.title?.[0]?.plain_text) {
      return page.properties.title.title[0].plain_text;
    }
    // 제목 속성 시도
    if (page.properties?.제목?.title?.[0]?.plain_text) {
      return page.properties.제목.title[0].plain_text;
    }

    // 모든 속성 중 title 타입 찾기
    for (const [key, value] of Object.entries(page.properties)) {
      if (value.type === 'title' && value.title?.[0]?.plain_text) {
        return value.title[0].plain_text;
      }
    }

    return 'Untitled';
  } catch (error) {
    return 'Untitled';
  }
}

// 실행
analyzeDatabases();
