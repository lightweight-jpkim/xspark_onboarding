// Vercel Serverless Function - Slack 메시지 수집 및 GPT 정리
import { SlackService } from '../_lib/slack.js';
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

    if (!channelId || !parentPageId) {
      return res.status(400).json({
        error: '필수 정보가 누락되었습니다',
        required: ['channelId', 'parentPageId']
      });
    }

    const mode = date ? `일일 리포트 (${date})` : '전체 히스토리';
    console.log(`📊 Slack ${mode} 처리 시작 - #${channelName || channelId}`);

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

    const reportType = date ? '일일 대화 내용' : '채널 히스토리';
    const dateInfo = date ? `**날짜**: ${date}` : `**기간**: 최근 메시지`;

    const systemPrompt = `당신은 Slack 채널의 ${reportType}을 정리하는 AI입니다.

## 문서 형식:

### 🧭 프로젝트 히스토리 - #${channelName}

#### 1️⃣ 문서 개요
- **채널**: #${channelName}
- **기간**: ${dateInfo.replace('**날짜**: ', '').replace('**기간**: ', '')}
- **메시지 수**: ${messages.length}개
- **작성일**: ${new Date().toISOString().split('T')[0]}
- **참여자**: @참여자1, @참여자2, @참여자3...

#### 2️⃣ 주요 타임라인

${date ? '📅 **날짜별 타임라인**' : '📅 **전체 타임라인 (주차별 구분)**'}

**[시간대/주차]**
- **🔥 이슈 / 논의**
  - 논의된 문제 또는 안건
  - 주요 의견 및 토론 내용

- **📎 공유 자료**
  - 링크, 문서, 파일 등

- **✅ 결정 사항**
  - 확정된 결정 내용

- **👤 담당자 / 액션**
  - @담당자: 구체적인 액션 아이템

*(다음 시간대/주차 반복)*

---

#### 3️⃣ 결정사항 요약 (Decision Log)

| 날짜/시간 | 결정 내용 | 관련자 | 후속 조치 |
|----------|----------|--------|----------|
| [시간] | [결정 내용 상세] | @담당자 | 진행 중/완료/대기 |
| [시간] | [결정 내용 상세] | @담당자 | 진행 중/완료/대기 |

---

#### 4️⃣ 액션 아이템 목록 (담당자별)

**👤 @담당자1**
- [ ] [업무 내용 상세] - 마감: [날짜] - 상태: 진행 중
- [ ] [업무 내용 상세] - 마감: [날짜] - 상태: 대기

**👤 @담당자2**
- [ ] [업무 내용 상세] - 마감: [날짜] - 상태: 완료

---

#### 5️⃣ 참고 자료 및 링크

- [자료 제목 또는 설명](링크 URL)
- [문서명](링크 URL)

---

#### 6️⃣ 종합 요약

**핵심 논의**:
- 주요 논의 주제 및 흐름 요약

**주요 결정사항**:
- 중요한 결정사항 1-3개 요약

**다음 스텝**:
- 향후 진행 방향 및 다음 회의/논의 일정

---

## 작성 가이드라인:

1. **타임라인 중심**: 대화 흐름을 시간/주차 순서대로 정리
2. **안건 기반 구조화**: 각 시간대마다 이슈 → 논의 → 결정 → 액션 순서로 정리
3. **담당자 명시**: 모든 결정사항과 액션 아이템에 담당자(@) 포함
4. **상세하게 기록**: 요약보다는 원문의 내용을 최대한 유지 (문맥 보존)
5. **주차 구분**: 전체 히스토리의 경우 주차별로 세그먼트 구분
6. **테이블 활용**: Decision Log는 반드시 표 형식으로 작성
7. **상태 추적**: 각 액션 아이템의 진행 상태 명시 (진행 중/완료/대기)

**중요**: 불필요한 인사말은 생략하되, 중요한 논의 내용은 절대 누락하지 말 것. 특히 기술적 세부사항, 일정, 담당자 정보는 정확하게 기록할 것.

한국어로 상세하고 체계적으로 정리하세요.`;

    const userPrompt = `다음 Slack 채널의 대화 내용을 위의 형식에 맞춰 ${date ? '일일 리포트' : '히스토리 리포트'}로 정리해주세요.

${conversationText}`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || appConfig.openai.model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_completion_tokens: 8000
    });

    const formattedReport = response.choices[0].message.content;

    // 제목 생성
    const title = date
      ? `[Slack] #${channelName} 일일 리포트 - ${date}`
      : `[Slack] #${channelName} 히스토리 정리`;

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
