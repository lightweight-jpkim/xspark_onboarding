/**
 * 환경별 설정 관리
 * 배포 플랫폼의 환경변수를 자동으로 로드
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 로컬 개발 환경에서만 .env 파일 로드
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
}

/**
 * 필수 환경변수 검증
 */
function validateEnv() {
  const required = {
    NOTION_API_TOKEN: '(Notion Integration Token)',
    OPENAI_API_KEY: '(OpenAI API Key)'
  };

  const missing = [];
  const invalid = [];

  for (const [key, description] of Object.entries(required)) {
    const value = process.env[key];

    if (!value) {
      missing.push(`${key} ${description}`);
    } else if (value.includes('your_') || value.includes('xxxxx')) {
      invalid.push(`${key} - 실제 값으로 교체 필요`);
    }
  }

  if (missing.length > 0 || invalid.length > 0) {
    console.error('\n❌ 환경변수 설정 오류\n');

    if (missing.length > 0) {
      console.error('누락된 환경변수:');
      missing.forEach(item => console.error(`  - ${item}`));
    }

    if (invalid.length > 0) {
      console.error('\n잘못된 환경변수:');
      invalid.forEach(item => console.error(`  - ${item}`));
    }

    console.error('\n📖 설정 가이드: README.md 참고\n');

    if (process.env.NODE_ENV === 'production') {
      throw new Error('환경변수 설정이 올바르지 않습니다.');
    }
  }
}

/**
 * 설정 객체
 */
export const config = {
  // 환경
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',

  // 서버
  port: parseInt(process.env.PORT || '3000', 10),

  // Notion
  notion: {
    apiToken: process.env.NOTION_API_TOKEN,
    onboardingPageId: process.env.NOTION_ONBOARDING_PAGE_ID,
    faqDatabaseId: process.env.NOTION_FAQ_DATABASE_ID
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7')
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },

  // 로깅
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    logApiCalls: process.env.LOG_API_CALLS === 'true'
  }
};

// 환경변수 검증 실행
validateEnv();

export default config;
