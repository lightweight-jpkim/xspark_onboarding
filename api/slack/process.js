// Vercel Serverless Function - Slack 메시지 수집 및 GPT 정리
import { SlackService } from '../../backend/services/slack.js';
import { OpenAI } from 'openai';
import appConfig from '../../backend/config/index.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || appConfig.openai.apiKey });

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
    const { channelId, channelName, date, parentPageId } = req.body;

    if (!channelId || !date || !parentPageId) {
      return res.status(400).json({
        error: '필수 정보가 누락되었습니다',
        required: ['channelId', 'date', 'parentPageId']
      });
    }

    console.log(`📊 Slack 일일 리포트 처리 시작 - #${channelName || channelId} (${date})`);

    // 1. Slack에서 메시지 수집
    const slackToken = process.env.SLACK_BOT_TOKEN || appConfig.slack?.botToken;
    if (!slackToken) {
      throw new Error('Slack Bot Token이 설정되지 않았습니다');
    }

    const slackService = new SlackService(slackToken);
    const messages = await slackService.getChannelMessages(channelId, date);

    console.log(`✅ ${messages.length}개 메시지 수집 완료`);

    if (messages.length === 0) {
      return res.status(200).json({
        success: false,
        message: '해당 날짜에 메시지가 없습니다'
      });
    }

    // 2. GPT로 일일 리포트 정리
    console.log('🤖 GPT로 일일 리포트 정리 중...');
    const report = await formatDailyReport(messages, channelName || channelId, date);

    console.log('✅ 일일 리포트 정리 완료');

    // 3. 결과 반환 (미리보기)
    return res.status(200).json({
      success: true,
      title: report.title,
      content: report.content,
      summary: report.summary,
      messageCount: messages.length,
      parentPageId: parentPageId,
      channelInfo: {
        id: channelId,
        name: channelName || channelId,
        date: date
      },
      message: '일일 리포트가 준비되었습니다. 내용을 확인하고 Notion에 저장하세요.'
    });

  } catch (error) {
    console.error('❌ Slack 리포트 처리 오류:', error);
    return res.status(500).json({
      error: '일일 리포트 처리 실패',
      message: error.message
    });
  }
}

/**
 * GPT로 Slack 메시지를 일일 리포트로 정리
 */
async function formatDailyReport(messages, channelName, date) {
  try {
    // 메시지를 텍스트로 변환
    let conversationText = messages.map((msg, idx) => {
      let text = `[${msg.time}] ${msg.user}: ${msg.text}`;

      // 스레드 답글 포함
      if (msg.replies && msg.replies.length > 0) {
        const repliesText = msg.replies.map(r =>
          `  ↳ [${r.time}] ${r.user}: ${r.text}`
        ).join('\n');
        text += '\n' + repliesText;
      }

      // 파일 첨부 포함
      if (msg.hasFiles && msg.files.length > 0) {
        const filesText = msg.files.map(f => `  📎 ${f.name}`).join('\n');
        text += '\n' + filesText;
      }

      return text;
    }).join('\n\n');

    const systemPrompt = `당신은 Slack 채널의 일일 대화 내용을 정리하는 AI입니다.

## 정리 형식:

**날짜**: ${date}
**채널**: #${channelName}
**메시지 수**: ${messages.length}개

---

## 주요 논의 사항

### [주제 1]
- 핵심 내용 요약
- 주요 의견

### [주제 2]
- 핵심 내용 요약
- 주요 의견

---

## 결정 사항
- ✅ [구체적인 결정 1]
- ✅ [구체적인 결정 2]

---

## 액션 아이템
- [ ] @사용자: [할 일]
- [ ] @사용자: [할 일]

---

## 공유된 링크 및 파일
- [제목 또는 설명](링크)

---

## 참여자
@user1, @user2, @user3...

## 작성 가이드라인:
1. **주제별 그룹화**: 관련된 대화를 주제별로 묶어 정리
2. **핵심 요약**: 긴 대화는 핵심만 추출
3. **액션 아이템**: 명확한 할 일이 있으면 별도로 추출
4. **시간 순서**: 논의가 시간 순서대로 흘러가도록 정리
5. **간결함**: 불필요한 인사말이나 잡담은 생략

한국어로 명확하고 간결하게 정리하세요.`;

    const userPrompt = `다음 Slack 채널의 대화 내용을 위의 형식에 맞춰 일일 리포트로 정리해주세요.

${conversationText}`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || appConfig.openai.model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 3000
    });

    const formattedReport = response.choices[0].message.content;

    // 제목 생성
    const title = `[Slack] #${channelName} 일일 리포트 - ${date}`;

    // 요약 추출 (처음 200자)
    const summary = formattedReport.substring(0, 200) + '...';

    return {
      title,
      summary,
      content: formattedReport
    };

  } catch (error) {
    console.error('GPT 정리 오류:', error);
    throw new Error('일일 리포트 정리 실패: ' + error.message);
  }
}
