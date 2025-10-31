// Vercel Serverless Function for Meeting Processing
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';
import appConfig from '../../backend/config/index.js';
import { NotionService } from '../../backend/services/notion.js';

// Vercel에서 body parser 비활성화 (raw request 처리)
export const config = {
  api: {
    bodyParser: false
  }
};

const openai = new OpenAI({ apiKey: appConfig.openai.apiKey });
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

  let audioFilePath = null;

  try {
    console.log('🎙️ 회의 처리 시작...');

    // 1. FormData 파싱
    const { fields, files } = await parseForm(req);

    if (!files.audio || files.audio.length === 0) {
      throw new Error('오디오 파일이 없습니다');
    }

    // 부모 페이지 ID 확인
    const parentPageId = Array.isArray(fields.parentPageId)
      ? fields.parentPageId[0]
      : fields.parentPageId;

    if (!parentPageId) {
      throw new Error('저장 위치가 선택되지 않았습니다');
    }

    console.log('📁 저장 위치:', parentPageId);

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

    // 2-1. 변환된 텍스트 품질 검증
    const transcriptLength = transcript.trim().length;
    const wordCount = transcript.trim().split(/\s+/).length;

    console.log(`📊 변환 품질 체크: 길이=${transcriptLength}자, 단어수=${wordCount}개`);

    if (transcriptLength < 50) {
      throw new Error('녹음된 내용이 너무 짧습니다. 최소 50자 이상의 음성이 필요합니다.');
    }

    if (wordCount < 10) {
      throw new Error('녹음된 단어가 너무 적습니다. 실제 회의 내용이 녹음되었는지 확인해주세요.');
    }

    // 의미없는 반복이나 노이즈 감지 (같은 단어가 80% 이상 반복)
    const words = transcript.trim().split(/\s+/);
    const uniqueWords = new Set(words);
    const uniqueRatio = uniqueWords.size / words.length;

    if (uniqueRatio < 0.2) {
      throw new Error('녹음 품질이 낮거나 의미있는 대화가 감지되지 않았습니다. 다시 녹음해주세요.');
    }

    console.log('✅ 녹음 품질 검증 통과');

    // 3. GPT-4o로 회의록 정리
    console.log('🤖 GPT-4o로 회의록 정리 중...');
    const meetingNotes = await formatMeetingNotes(transcript);
    console.log('✅ 회의록 정리 완료');

    // 4. 결과 반환 (Notion 저장은 사용자 확인 후 별도로 수행)
    console.log('✅ 회의록 처리 완료 - 사용자 확인 대기');

    return res.status(200).json({
      success: true,
      title: meetingNotes.title,
      content: meetingNotes.fullContent,
      summary: meetingNotes.summary,
      transcript: meetingNotes.transcript,
      duration: calculateDuration(transcript),
      parentPageId: parentPageId,
      message: '회의록이 준비되었습니다. 내용을 확인하고 Notion에 저장하세요.'
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
 * GPT-4o로 회의록 정리 (기존 회의록 참조)
 */
async function formatMeetingNotes(transcript) {
  try {
    // 1. 기존 회의록 샘플 가져오기 (문맥 이해를 위해)
    let previousMeetingsContext = '';
    try {
      const examplesResponse = await fetch('https://xspark-onboarding.vercel.app/api/meeting/examples');
      const examplesData = await examplesResponse.json();

      if (examplesData.success && examplesData.examples && examplesData.examples.length > 0) {
        // 내용이 있는 회의록만 선택 (최대 10개)
        const validExamples = examplesData.examples
          .filter(ex => ex.content && ex.content.trim().length > 50)
          .slice(0, 10);

        if (validExamples.length > 0) {
          previousMeetingsContext = '\n\n## 이전 회의록 참고 (스타일 및 문맥 이해용):\n\n';
          validExamples.forEach((ex, idx) => {
            // 더 많은 회의록을 포함하므로 각 회의록당 더 적은 텍스트만 포함
            const contentPreview = ex.content.substring(0, 500);
            previousMeetingsContext += `### 예시 ${idx + 1}: ${ex.title}\n${contentPreview}\n\n`;
          });
          console.log(`✅ ${validExamples.length}개 이전 회의록을 컨텍스트로 추가`);
        }
      }
    } catch (error) {
      console.warn('⚠️ 이전 회의록 가져오기 실패 (계속 진행):', error.message);
    }

    const systemPrompt = `당신은 xspark 프로젝트 전문 회의록 작성 AI입니다.

## 역할:
- xspark 제품 개발 회의록을 작성합니다
- 이전 회의록들의 스타일과 문맥을 참고하여 일관성 있게 작성합니다
- 제품/기능에 대한 문맥을 이해하고 논의 내용을 구조화합니다

## 회의록 작성 형식:

**제목**: [회의 주제를 명확하고 간결하게] (예: "XSpark Live 모델 변경 회의")

**날짜**: [회의 날짜]

**참석자**: [참석자 목록] (언급된 경우)

**회의 내용**: [전체 요약 2-3문장]

---

## 주요 논의 사항

### [주제 1: 질문 형식 또는 기능명]
- 논의 내용 정리
- 핵심 포인트

### [주제 2: 질문 형식 또는 기능명]
- 논의 내용 정리
- 핵심 포인트

### [주제 3: ...]
...

---

## 결정 사항
- ✅ [구체적인 결정 사항 1]
- ✅ [구체적인 결정 사항 2]

---

## 액션 아이템
- [ ] [담당자]: [할 일] (기한: [날짜])
- [ ] [담당자]: [할 일]

---

## 추후 검토 사항
- [나중에 다시 논의할 주제]

---

## 기술적 세부사항 (해당 시)
- API 엔드포인트, 데이터 모델, 기술 스택 등

## 작성 가이드라인:
1. **문맥 파악**: 이전 회의록들을 참고하여 제품/기능의 문맥을 이해하고 작성
2. **질문 중심**: 논의 주제를 질문 형태로 정리 (예: "페르소나란?", "정산은 어떻게?")
3. **명확성**: 기술 용어는 명확하게, 결정사항은 구체적으로
4. **일관성**: 기존 회의록 스타일을 유지
5. **구조화**: 관련 주제끼리 묶어서 정리

한국어로 작성하고, 전문적이면서도 명확하게 정리하세요.`;

    const userPrompt = `다음 회의 녹취록을 위의 형식에 맞춰 정리해주세요.${previousMeetingsContext}

## 새로운 회의 녹취록:

${transcript}`;

    const response = await openai.chat.completions.create({
      model: appConfig.openai.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.3, // 더 일관성 있는 출력을 위해 낮춤
      max_tokens: 3000  // 더 자세한 회의록을 위해 증가
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
async function saveMeetingToNotion(meetingNotes, databaseId) {
  try {
    if (!databaseId) {
      throw new Error('저장 위치 (databaseId)가 지정되지 않았습니다');
    }

    // Notion 데이터베이스에 항목 생성
    const page = await notionService.client.pages.create({
      parent: {
        type: 'database_id',
        database_id: databaseId
      },
      properties: {
        '회의 이름': {
          title: [
            {
              text: {
                content: meetingNotes.title
              }
            }
          ]
        },
        '날짜': {
          date: {
            start: new Date().toISOString().split('T')[0]
          }
        },
        '요약': {
          rich_text: [
            {
              text: {
                content: meetingNotes.summary.substring(0, 2000) // Notion 제한
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
