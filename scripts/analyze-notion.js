// Notion 워크스페이스 구조 분석 스크립트
import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const NOTION_TOKEN = process.env.NOTION_API_TOKEN;

const notion = new Client({ auth: NOTION_TOKEN });

async function analyzeNotionStructure() {
  console.log('🔍 Notion 워크스페이스 분석 시작...\n');

  try {
    // 1. 모든 페이지 검색
    console.log('📄 접근 가능한 페이지 조회 중...');
    const pagesResponse = await notion.search({
      filter: {
        property: 'object',
        value: 'page'
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      },
      page_size: 100
    });

    console.log(`✅ 총 ${pagesResponse.results.length}개 페이지 발견\n`);

    // 2. 데이터베이스 검색
    console.log('📊 접근 가능한 데이터베이스 조회 중...');
    const dbResponse = await notion.search({
      filter: {
        property: 'object',
        value: 'database'
      },
      page_size: 100
    });

    console.log(`✅ 총 ${dbResponse.results.length}개 데이터베이스 발견\n`);

    // 3. 페이지 목록 출력
    console.log('━'.repeat(80));
    console.log('📋 페이지 목록 (최근 수정 순)');
    console.log('━'.repeat(80));

    pagesResponse.results.forEach((page, index) => {
      const title = extractTitle(page);
      const lastEdited = new Date(page.last_edited_time).toLocaleString('ko-KR');
      const created = new Date(page.created_time).toLocaleString('ko-KR');

      console.log(`\n${index + 1}. ${title}`);
      console.log(`   ID: ${page.id}`);
      console.log(`   URL: ${page.url}`);
      console.log(`   최종 수정: ${lastEdited}`);
      console.log(`   생성일: ${created}`);

      // 회의록 관련 페이지 강조
      if (title.toLowerCase().includes('회의') ||
          title.toLowerCase().includes('meeting') ||
          title.toLowerCase().includes('회의록')) {
        console.log(`   ⭐ 회의록 저장에 적합한 페이지!`);
      }

      // xspark 관련 페이지 강조
      if (title.toLowerCase().includes('xspark') ||
          title.toLowerCase().includes('xstudio') ||
          title.toLowerCase().includes('xbrush')) {
        console.log(`   🎯 xspark 관련 페이지!`);
      }
    });

    // 4. 데이터베이스 목록 출력
    if (dbResponse.results.length > 0) {
      console.log('\n' + '━'.repeat(80));
      console.log('📊 데이터베이스 목록');
      console.log('━'.repeat(80));

      dbResponse.results.forEach((db, index) => {
        const title = extractTitle(db);
        const lastEdited = new Date(db.last_edited_time).toLocaleString('ko-KR');

        console.log(`\n${index + 1}. ${title}`);
        console.log(`   ID: ${db.id}`);
        console.log(`   URL: ${db.url}`);
        console.log(`   최종 수정: ${lastEdited}`);
      });
    }

    // 5. 추천 정리
    console.log('\n' + '━'.repeat(80));
    console.log('💡 회의록 저장 위치 추천');
    console.log('━'.repeat(80));

    const meetingPages = pagesResponse.results.filter(page => {
      const title = extractTitle(page).toLowerCase();
      return title.includes('회의') || title.includes('meeting') || title.includes('회의록');
    });

    if (meetingPages.length > 0) {
      console.log('\n회의록 관련 페이지를 발견했습니다:');
      meetingPages.forEach((page, index) => {
        console.log(`${index + 1}. ${extractTitle(page)}`);
        console.log(`   ID: ${page.id}`);
        console.log(`   👉 이 페이지를 선택하는 것을 추천합니다!`);
      });
    } else {
      console.log('\n⚠️ "회의록" 또는 "meeting" 관련 페이지를 찾지 못했습니다.');
      console.log('📌 Notion에 "회의록" 또는 "Meeting Notes" 페이지를 새로 만드는 것을 추천합니다.');
      console.log('📌 또는 기존 프로젝트 페이지(예: xspark) 아래에 저장할 수 있습니다.');
    }

    // 6. 구조 이해를 위한 요약
    console.log('\n' + '━'.repeat(80));
    console.log('📚 워크스페이스 구조 요약');
    console.log('━'.repeat(80));

    const xsparkPages = pagesResponse.results.filter(page => {
      const title = extractTitle(page).toLowerCase();
      return title.includes('xspark') || title.includes('xstudio') || title.includes('xbrush');
    });

    console.log(`\n📊 전체 통계:`);
    console.log(`   - 전체 페이지: ${pagesResponse.results.length}개`);
    console.log(`   - 전체 데이터베이스: ${dbResponse.results.length}개`);
    console.log(`   - xspark 관련 페이지: ${xsparkPages.length}개`);
    console.log(`   - 회의록 관련 페이지: ${meetingPages.length}개`);

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    if (error.code === 'unauthorized') {
      console.error('\n💡 Notion API 토큰이 유효하지 않거나, Integration이 어떤 페이지에도 연결되지 않았습니다.');
      console.error('Notion에서 Integration을 페이지에 공유(Share)해주세요.');
    }
  }
}

function extractTitle(page) {
  try {
    if (page.properties?.title?.title?.[0]?.plain_text) {
      return page.properties.title.title[0].plain_text;
    }
    if (page.properties?.Name?.title?.[0]?.plain_text) {
      return page.properties.Name.title[0].plain_text;
    }
    return 'Untitled';
  } catch (error) {
    return 'Untitled';
  }
}

// 실행
analyzeNotionStructure();
