import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import { logSafeEnvironment } from './utils/security.js';
import chatRouter from './routes/chat.js';

// ES 모듈에서 __dirname 사용을 위한 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express 앱 생성
const app = express();
const PORT = config.port;

// 미들웨어 설정
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 요청 로깅 (개발 환경)
if (config.isDevelopment) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// 정적 파일 제공 (프론트엔드)
app.use(express.static(path.join(__dirname, '../public')));

// API 라우트
app.use('/api', chatRouter);

// 루트 경로
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);

  // 프로덕션에서는 상세 에러 숨김
  const errorResponse = {
    error: 'Internal Server Error'
  };

  if (config.isDevelopment) {
    errorResponse.message = err.message;
    errorResponse.stack = err.stack;
  }

  res.status(err.status || 500).json(errorResponse);
});

// 서버 시작
function startServer() {
  try {
    // 크레덴셜 상태 로깅
    logSafeEnvironment();

    app.listen(PORT, () => {
      console.log('\n=================================');
      console.log('🚀 xspark_onboarding 서버 시작!');
      console.log('=================================');
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 환경: ${config.env}`);
      console.log(`🤖 AI 모델: ${config.openai.model}`);
      console.log(`🔒 CORS: ${config.cors.origin}`);
      console.log('=================================\n');
    });
  } catch (error) {
    console.error('서버 시작 실패:', error.message);
    process.exit(1);
  }
}

startServer();
