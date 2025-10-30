// Vercel Serverless Function Entry Point
import express from 'express';
import cors from 'cors';
import config from '../backend/config/index.js';
import { logSafeEnvironment } from '../backend/utils/security.js';
import chatRouter from '../backend/routes/chat.js';

const app = express();

// 미들웨어 설정
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// API 라우트
app.use('/', chatRouter);

// 헬스체크
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'xspark_onboarding API is running',
    timestamp: new Date().toISOString()
  });
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

  const errorResponse = {
    error: 'Internal Server Error'
  };

  if (config.isDevelopment) {
    errorResponse.message = err.message;
    errorResponse.stack = err.stack;
  }

  res.status(err.status || 500).json(errorResponse);
});

// Vercel Serverless Function Export
export default app;
