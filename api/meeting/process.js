// Vercel Serverless Function for Meeting Processing
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';
import config from '../../backend/config/index.js';
import { NotionService } from '../../backend/services/notion.js';

// Vercel에서 body parser 비활성화 (raw request 처리)
export const config = {
  api: {
    bodyParser: false
  }
};

const openai = new OpenAI({ apiKey: config.openai.apiKey });
const notionService = new NotionService(config.notion.apiToken);

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

  let audioFilePath = null;

  try {
    console.log('🎙️ 회의 처리 시작...');

    // 1. FormData 파싱
    const { fields, files } = await parseForm(req);

    if (!files.audio || files.audio.length === 0) {
      throw new Error('오디오 파일이 없습니다');
    }

    const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
    audioFilePath = audioFile.filepath;

    console.log('📦 오디오 파일:', {
      size: (audioFile.size / 1024 / 1024).toFixed(2) + ' MB',
      type: audioFile.mimetype,
      path: audioFilePath
    });

    // 2. OpenAI Whisper로 음성 → 텍스트 변환
    console.log('🔄 Whisper API 호출 중...');
    const transcript = await transcribeAudio(audioFilePath);
    console.log('✅ 텍스트 변환 완료:', transcript.substring(0, 100) + '...');

    // 3. GPT-4o로 회의록 정리
    console.log('🤖 GPT-4o로 회의록 정리 중...');
    const meetingNotes = await formatMeetingNotes(transcript);
    console.log('✅ 회의록 정리 완료');

    // 4. Notion에 회의록 저장
    console.log('📝 Notion에 저장 중...');
    const notionPage = await saveMeetingToNotion(meetingNotes);
    console.log('✅ Notion 저장 완료:', notionPage.url);

    // 5. 결과 반환
    return res.status(200).json({
      success: true,
      title: meetingNotes.title,
      duration: calculateDuration(transcript),
      summary: meetingNotes.summary,
      notionUrl: notionPage.url,
      notionPageId: notionPage.id
    });

  } catch (error) {
    console.error('❌ 회의 처리 오류:', error);

    return res.status(500).json({
      error: '회의 처리 중 오류 발생',
      message: error.message
    });

  } finally {
    // 임시 파일 삭제
    if (audioFilePath && fs.existsSync(audioFilePath)) {
      fs.unlinkSync(audioFilePath);
      console.log('🗑️ 임시 파일 삭제됨');
    }
  }
}

/**
 * FormData 파싱
 */
function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 25 * 1024 * 1024, // 25MB (Whisper 제한)
      keepExtensions: true,
      uploadDir: '/tmp'
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

/**
 * OpenAI Whisper로 음성 → 텍스트 변환
 */
async function transcribeAudio(filePath) {
  try {
    const audioStream = fs.createReadStream(filePath);

    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: 'whisper-1',
      language: 'ko', // 한국어 우선
      response_format: 'text'
    });

    return transcription;

  } catch (error) {
    console.error('Whisper API 오류:', error);
    throw new Error('음성 변환 실패: ' + error.message);
  }
}

/**
 * GPT-4o로 회의록 정리
 */
async function formatMeetingNotes(transcript) {
  try {
    const systemPrompt = `당신은 전문 회의록 작성 AI입니다.

회의 녹취록을 받아 다음 형식으로 구조화된 회의록을 작성하세요:

## 형식:
1. **제목**: 회의 주제를 간결하게 요약 (예: "xspark 제품 개발 회의")
2. **요약**: 3-4문장으로 회의 전체 내용 요약
3. **주요 논의사항**: 불릿 포인트로 나열
4. **결정된 사항**: 구체적인 결정사항 나열
5. **액션 아이템**: 담당자와 할 일 (있는 경우만)
6. **다음 회의 안건**: 다음에 논의할 주제 (있는 경우만)

한국어로 작성하고, 명확하고 간결하게 정리하세요.`;

    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `다음 회의 녹취록을 정리해주세요:\n\n${transcript}`
        }
      ],
      temperature: 0.5,
      max_tokens: 2000
    });

    const formattedNotes = response.choices[0].message.content;

    // 제목 추출
    const titleMatch = formattedNotes.match(/\*\*제목\*\*:\s*(.+)/);
    const title = titleMatch ? titleMatch[1].trim() : generateDefaultTitle();

    // 요약 추출
    const summaryMatch = formattedNotes.match(/\*\*요약\*\*:\s*(.+?)(?=\n\*\*|$)/s);
    const summary = summaryMatch ? summaryMatch[1].trim() : formattedNotes.substring(0, 200) + '...';

    return {
      title,
      summary,
      fullContent: formattedNotes,
      transcript
    };

  } catch (error) {
    console.error('GPT 정리 오류:', error);
    throw new Error('회의록 정리 실패: ' + error.message);
  }
}

/**
 * Notion에 회의록 저장
 */
async function saveMeetingToNotion(meetingNotes) {
  try {
    // 회의록 저장할 부모 페이지 ID (환경변수 또는 기본값)
    const parentPageId = process.env.NOTION_MEETING_PARENT_ID || process.env.NOTION_ONBOARDING_PAGE_ID;

    if (!parentPageId) {
      throw new Error('NOTION_MEETING_PARENT_ID 환경변수가 설정되지 않았습니다');
    }

    // Notion 페이지 생성
    const page = await notionService.client.pages.create({
      parent: {
        type: 'page_id',
        page_id: parentPageId
      },
      properties: {
        title: {
          title: [
            {
              text: {
                content: `${meetingNotes.title} - ${new Date().toLocaleDateString('ko-KR')}`
              }
            }
          ]
        }
      },
      children: [
        // 요약
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ text: { content: '📋 요약' } }]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: meetingNotes.summary } }]
          }
        },
        // 전체 회의록
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ text: { content: '📝 상세 내용' } }]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: meetingNotes.fullContent } }]
          }
        },
        // 원본 녹취록 (토글)
        {
          object: 'block',
          type: 'toggle',
          toggle: {
            rich_text: [{ text: { content: '🎤 원본 녹취록' } }],
            children: [
              {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                  rich_text: [{ text: { content: meetingNotes.transcript } }]
                }
              }
            ]
          }
        }
      ]
    });

    return page;

  } catch (error) {
    console.error('Notion 저장 오류:', error);
    throw new Error('Notion 저장 실패: ' + error.message);
  }
}

/**
 * 녹음 시간 계산 (추정)
 */
function calculateDuration(transcript) {
  // 평균 말하기 속도: 분당 150 단어
  const words = transcript.split(/\s+/).length;
  const minutes = Math.ceil(words / 150);
  return `약 ${minutes}분`;
}

/**
 * 기본 제목 생성
 */
function generateDefaultTitle() {
  const date = new Date();
  return `회의록 ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
