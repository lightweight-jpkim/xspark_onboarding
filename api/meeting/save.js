// Vercel Serverless Function - 회의록을 Notion에 저장
import { NotionService } from '../../backend/services/notion.js';
import appConfig from '../../backend/config/index.js';

const notionService = new NotionService(appConfig.notion.apiToken);

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { title, content, parentPageId } = req.body;

    if (!title || !content || !parentPageId) {
      return res.status(400).json({
        error: '필수 정보가 누락되었습니다',
        required: ['title', 'content', 'parentPageId']
      });
    }

    console.log('📝 Notion에 회의록 저장 시작...');
    console.log('  제목:', title);
    console.log('  부모 페이지 ID:', parentPageId);

    // Notion 페이지 생성
    const page = await notionService.client.pages.create({
      parent: {
        type: 'database_id',
        database_id: parentPageId
      },
      properties: {
        '회의 이름': {
          title: [
            {
              text: {
                content: title
              }
            }
          ]
        },
        '날짜': {
          date: {
            start: new Date().toISOString().split('T')[0]
          }
        }
      }
    });

    console.log('✅ Notion 페이지 생성 완료:', page.id);

    // 회의록 내용을 페이지에 추가
    const contentLines = content.split('\n');
    const blocks = [];

    for (const line of contentLines) {
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        continue; // 빈 줄 건너뛰기
      }

      // 헤더 감지
      if (trimmedLine.startsWith('###')) {
        blocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{
              type: 'text',
              text: { content: trimmedLine.replace(/^###\s*/, '') }
            }]
          }
        });
      } else if (trimmedLine.startsWith('##')) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{
              type: 'text',
              text: { content: trimmedLine.replace(/^##\s*/, '') }
            }]
          }
        });
      } else if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
        // 볼드 텍스트
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              text: { content: trimmedLine.replace(/\*\*/g, '') },
              annotations: { bold: true }
            }]
          }
        });
      } else if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
        // 불릿 포인트
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{
              type: 'text',
              text: { content: trimmedLine.replace(/^[-•]\s*/, '') }
            }]
          }
        });
      } else if (trimmedLine === '---') {
        // 구분선
        blocks.push({
          object: 'block',
          type: 'divider',
          divider: {}
        });
      } else {
        // 일반 텍스트
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              text: { content: trimmedLine }
            }]
          }
        });
      }
    }

    // 블록을 100개씩 나눠서 추가 (Notion API 제한)
    for (let i = 0; i < blocks.length; i += 100) {
      const chunk = blocks.slice(i, i + 100);
      await notionService.client.blocks.children.append({
        block_id: page.id,
        children: chunk
      });
    }

    console.log('✅ 회의록 내용 추가 완료');

    return res.status(200).json({
      success: true,
      notionUrl: page.url,
      notionPageId: page.id,
      message: 'Notion에 저장되었습니다'
    });

  } catch (error) {
    console.error('❌ Notion 저장 오류:', error);
    return res.status(500).json({
      error: 'Notion 저장 실패',
      message: error.message
    });
  }
}
