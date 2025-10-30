import { Client } from '@notionhq/client';

export class NotionService {
  constructor(apiToken) {
    this.client = new Client({ auth: apiToken });
  }

  /**
   * Notion에서 관련 문서 검색 (개선된 버전 - 더 많은 문서 검색)
   */
  async searchDocuments(query) {
    try {
      // 1. 쿼리로 직접 검색 (더 많은 결과)
      const response = await this.client.search({
        query: query,
        filter: {
          property: 'object',
          value: 'page'
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        },
        page_size: 20  // 5에서 20으로 증가
      });

      // 2. 만약 검색 결과가 적다면, 전체 페이지도 조회 (xspark 관련)
      let allPages = response.results;

      if (response.results.length < 5) {
        console.log('검색 결과가 적어서 전체 페이지 조회 시도...');
        const allPagesResponse = await this.client.search({
          filter: {
            property: 'object',
            value: 'page'
          },
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time'
          },
          page_size: 50
        });

        // xspark 관련 페이지 필터링
        const xsparkPages = allPagesResponse.results.filter(page => {
          const title = this.extractTitle(page).toLowerCase();
          return title.includes('xspark') ||
                 title.includes('product') ||
                 title.includes('프로덕트') ||
                 title.includes('개발');
        });

        // 중복 제거하고 병합
        const existingIds = new Set(allPages.map(p => p.id));
        const newPages = xsparkPages.filter(p => !existingIds.has(p.id));
        allPages = [...allPages, ...newPages].slice(0, 20);
      }

      // 각 페이지의 내용 가져오기 (더 많은 내용)
      const documents = await Promise.all(
        allPages.map(async (page) => {
          const content = await this.getPageContent(page.id);
          return {
            id: page.id,
            title: this.extractTitle(page),
            content: content,  // 제한 해제 - 전체 내용
            url: page.url,
            lastEditedTime: page.last_edited_time
          };
        })
      );

      console.log(`✅ 총 ${documents.length}개 문서 검색됨`);
      return documents;
    } catch (error) {
      console.error('Notion search error:', error);
      throw new Error('Notion 문서 검색 중 오류가 발생했습니다.');
    }
  }

  /**
   * 페이지 내용 가져오기
   */
  async getPageContent(pageId) {
    try {
      const blocks = await this.getBlocks(pageId);
      return this.blocksToText(blocks);
    } catch (error) {
      console.error('Error getting page content:', error);
      return '';
    }
  }

  /**
   * 페이지의 모든 블록 가져오기
   */
  async getBlocks(blockId) {
    const blocks = [];
    let cursor;

    try {
      while (true) {
        const response = await this.client.blocks.children.list({
          block_id: blockId,
          start_cursor: cursor,
          page_size: 100
        });

        blocks.push(...response.results);

        if (!response.has_more) {
          break;
        }

        cursor = response.next_cursor;
      }

      return blocks;
    } catch (error) {
      console.error('Error getting blocks:', error);
      return blocks;
    }
  }

  /**
   * 블록을 텍스트로 변환
   */
  blocksToText(blocks) {
    return blocks
      .map(block => {
        const type = block.type;
        const content = block[type];

        if (!content) return '';

        // 텍스트 추출
        if (content.rich_text) {
          const text = content.rich_text
            .map(t => t.plain_text)
            .join('');

          // 헤딩 처리
          if (type.includes('heading')) {
            return `\n${text}\n`;
          }

          return text;
        }

        return '';
      })
      .filter(text => text.trim())
      .join('\n');
  }

  /**
   * 페이지 제목 추출
   */
  extractTitle(page) {
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

  /**
   * 대화 로그를 Notion에 저장
   */
  async logConversation({ conversationId, userMessage, aiResponse, referencedDocs }) {
    try {
      const logPageId = process.env.NOTION_FAQ_DATABASE_ID;

      if (!logPageId) {
        console.warn('NOTION_FAQ_DATABASE_ID not set, skipping log');
        return;
      }

      // 데이터베이스에 항목 생성
      await this.client.pages.create({
        parent: {
          database_id: logPageId
        },
        properties: {
          'Name': {
            title: [
              {
                text: {
                  content: `[${conversationId}] ${userMessage.substring(0, 50)}...`
                }
              }
            ]
          },
          'Question': {
            rich_text: [
              {
                text: {
                  content: userMessage
                }
              }
            ]
          },
          'Answer': {
            rich_text: [
              {
                text: {
                  content: aiResponse.substring(0, 2000) // Notion 제한
                }
              }
            ]
          },
          'Date': {
            date: {
              start: new Date().toISOString()
            }
          }
        }
      });

      console.log('Conversation logged to Notion');
    } catch (error) {
      console.error('Error logging to Notion:', error);
      // 로깅 실패해도 앱은 계속 동작
    }
  }

  /**
   * FAQ 데이터베이스 생성 (초기 설정용)
   */
  async createFAQDatabase() {
    try {
      const parentPageId = process.env.NOTION_ONBOARDING_PAGE_ID;

      if (!parentPageId) {
        throw new Error('NOTION_ONBOARDING_PAGE_ID not set');
      }

      const response = await this.client.databases.create({
        parent: {
          type: 'page_id',
          page_id: parentPageId
        },
        title: [
          {
            text: {
              content: 'Onboarding Logs'
            }
          }
        ],
        properties: {
          'Name': {
            title: {}
          },
          'Question': {
            rich_text: {}
          },
          'Answer': {
            rich_text: {}
          },
          'Date': {
            date: {}
          }
        }
      });

      console.log('FAQ Database created:', response.id);
      return response.id;
    } catch (error) {
      console.error('Error creating FAQ database:', error);
      throw error;
    }
  }
}
