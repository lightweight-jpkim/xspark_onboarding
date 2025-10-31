// Untitled 페이지들의 parent 확인
import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_TOKEN });

async function checkUntitledParents() {
  console.log('🔍 Untitled 페이지들의 부모 확인 중...\n');

  // 모든 페이지 검색
  const pagesResponse = await notion.search({
    filter: {
      property: 'object',
      value: 'page'
    },
    page_size: 100
  });

  // 데이터베이스 ID들
  const databaseIds = [
    '23a53778-0f61-8026-bab8-f0785fe9f301',  // 회의록
    '23a53778-0f61-80ee-87ce-f73060ef1d87',  // 문서 허브
    '23a53778-0f61-80e7-9a82-e8a0cd707811'   // 엔지니어링 위키
  ];

  let dbPageCount = 0;
  let standalonePage = 0;

  for (const page of pagesResponse.results) {
    const title = extractTitle(page);

    if (title === 'Untitled') {
      const parentType = page.parent?.type;
      const parentId = page.parent?.database_id || page.parent?.page_id;

      // 데이터베이스의 항목인지 확인
      const isDbPage = parentType === 'database_id';
      const whichDb = databaseIds.includes(parentId)
        ? (parentId === '23a53778-0f61-8026-bab8-f0785fe9f301' ? '회의록' :
           parentId === '23a53778-0f61-80ee-87ce-f73060ef1d87' ? '문서 허브' : '엔지니어링 위키')
        : 'Unknown DB';

      if (isDbPage) {
        dbPageCount++;
        console.log(`📄 ${title} - 데이터베이스 항목 (${whichDb})`);
      } else {
        standalonePage++;
        console.log(`📄 ${title} - 독립 페이지 (parent: ${parentType})`);
      }
    }
  }

  console.log('\n━'.repeat(40));
  console.log(`\n📊 요약:`);
  console.log(`   - 데이터베이스 항목: ${dbPageCount}개`);
  console.log(`   - 독립 페이지: ${standalonePage}개`);
  console.log(`\n✅ 데이터베이스 항목들은 드롭다운에 표시하지 않는 것이 맞습니다!`);
}

function extractTitle(page) {
  try {
    if (page.properties?.title?.title?.[0]?.plain_text) {
      return page.properties.title.title[0].plain_text;
    }
    if (page.properties?.Name?.title?.[0]?.plain_text) {
      return page.properties.Name.title[0].plain_text;
    }
    if (page.properties?.['회의 이름']?.title?.[0]?.plain_text) {
      return page.properties['회의 이름'].title[0].plain_text;
    }
    return 'Untitled';
  } catch (error) {
    return 'Untitled';
  }
}

checkUntitledParents().catch(console.error);
