// 최근 회의록 확인
import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_TOKEN });
const DATABASE_ID = '23a53778-0f61-8026-bab8-f0785fe9f301';

async function checkRecentMeeting() {
  console.log('🔍 최근 회의록 확인 중...\n');

  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    page_size: 5,
    sorts: [
      {
        timestamp: 'last_edited_time',
        direction: 'descending'
      }
    ]
  });

  console.log(`총 ${response.results.length}개 항목 발견\n`);

  for (const page of response.results) {
    const title = page.properties['회의 이름']?.title?.[0]?.plain_text || 'Untitled';
    const date = page.properties['날짜']?.date?.start || 'N/A';
    const summary = page.properties['요약']?.rich_text?.[0]?.plain_text || 'N/A';

    console.log('━'.repeat(80));
    console.log(`📋 제목: ${title}`);
    console.log(`📅 날짜: ${date}`);
    console.log(`📝 요약: ${summary.substring(0, 200)}`);
    console.log(`🔗 URL: ${page.url}`);

    // 페이지 내용도 가져오기
    if (title.includes('운동') || title.includes('자세')) {
      console.log('\n📄 전체 내용:');
      const blocks = await notion.blocks.children.list({ block_id: page.id });

      blocks.results.forEach(block => {
        if (block.type === 'paragraph' && block.paragraph.rich_text.length > 0) {
          const text = block.paragraph.rich_text.map(t => t.plain_text).join('');
          console.log(`   ${text}`);
        }
        if (block.type === 'heading_2' && block.heading_2.rich_text.length > 0) {
          const text = block.heading_2.rich_text.map(t => t.plain_text).join('');
          console.log(`\n   ${text}`);
        }
      });
    }
  }
}

checkRecentMeeting().catch(console.error);
