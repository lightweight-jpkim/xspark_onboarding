// Vercel Serverless Function - Slack 채널 목록 조회
import { SlackService } from '../../backend/services/slack.js';
import appConfig from '../../backend/config/index.js';

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Slack 토큰 확인
    const slackToken = process.env.SLACK_BOT_TOKEN || appConfig.slack?.botToken;

    if (!slackToken) {
      throw new Error('Slack Bot Token이 설정되지 않았습니다');
    }

    console.log('📋 Slack 채널 목록 조회 시작...');

    const slackService = new SlackService(slackToken);
    const channels = await slackService.listChannels();

    console.log(`✅ ${channels.length}개 채널 조회 완료`);

    return res.status(200).json({
      success: true,
      channels: channels
    });

  } catch (error) {
    console.error('❌ 채널 목록 조회 오류:', error);
    return res.status(500).json({
      error: '채널 목록 조회 실패',
      message: error.message
    });
  }
}
