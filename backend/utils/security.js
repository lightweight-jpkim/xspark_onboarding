/**
 * 보안 관련 유틸리티
 */

/**
 * API Key 마스킹 (로그 출력 시 안전하게)
 */
export function maskApiKey(key) {
  if (!key || typeof key !== 'string') {
    return '[MISSING]';
  }

  if (key.length < 8) {
    return '***';
  }

  // 앞 4자, 뒤 4자만 표시
  const prefix = key.substring(0, 4);
  const suffix = key.substring(key.length - 4);
  const masked = '*'.repeat(Math.min(key.length - 8, 20));

  return `${prefix}${masked}${suffix}`;
}

/**
 * 크레덴셜 검증
 */
export function validateCredentials() {
  const credentials = {
    notion: process.env.NOTION_API_TOKEN,
    openai: process.env.OPENAI_API_KEY
  };

  const status = {};

  for (const [service, key] of Object.entries(credentials)) {
    if (!key) {
      status[service] = { valid: false, error: 'Missing' };
    } else if (key.includes('your_') || key.includes('xxxxx')) {
      status[service] = { valid: false, error: 'Invalid placeholder' };
    } else {
      status[service] = { valid: true, masked: maskApiKey(key) };
    }
  }

  return status;
}

/**
 * 안전한 환경변수 로깅
 */
export function logSafeEnvironment() {
  const credentials = validateCredentials();

  console.log('\n🔐 크레덴셜 상태:');
  console.log('==================');

  for (const [service, info] of Object.entries(credentials)) {
    const icon = info.valid ? '✅' : '❌';
    const detail = info.valid ? info.masked : info.error;
    console.log(`${icon} ${service.toUpperCase()}: ${detail}`);
  }

  console.log('==================\n');
}

/**
 * 로그에서 민감한 정보 제거
 */
export function sanitizeLog(message) {
  if (typeof message !== 'string') {
    return message;
  }

  // API Key 패턴 감지 및 마스킹
  const patterns = [
    /sk-[a-zA-Z0-9]{20,}/g,      // OpenAI API Key
    /secret_[a-zA-Z0-9]{40,}/g,   // Notion API Token
    /Bearer [a-zA-Z0-9_-]+/g      // Bearer Token
  ];

  let sanitized = message;
  patterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });

  return sanitized;
}

/**
 * Rate Limiting을 위한 간단한 메모리 기반 카운터
 */
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  check(identifier) {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];

    // 시간 윈도우 밖의 요청 제거
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.windowMs
    );

    if (validRequests.length >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(validRequests[0] + this.windowMs)
      };
    }

    // 새 요청 추가
    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    return {
      allowed: true,
      remaining: this.maxRequests - validRequests.length,
      resetAt: new Date(now + this.windowMs)
    };
  }

  reset(identifier) {
    this.requests.delete(identifier);
  }

  cleanup() {
    const now = Date.now();
    for (const [identifier, timestamps] of this.requests.entries()) {
      const valid = timestamps.filter(t => now - t < this.windowMs);
      if (valid.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, valid);
      }
    }
  }
}

// Rate Limiter 인스턴스 (1분에 최대 30회 요청)
export const chatRateLimiter = new RateLimiter(30, 60000);

// 주기적으로 오래된 데이터 정리 (10분마다)
setInterval(() => {
  chatRateLimiter.cleanup();
}, 10 * 60 * 1000);

/**
 * IP 화이트리스트 검증 (선택적)
 */
export function checkIpWhitelist(ip) {
  const whitelist = process.env.IP_WHITELIST;

  // 화이트리스트 미설정 시 모두 허용
  if (!whitelist) {
    return true;
  }

  const allowedIps = whitelist.split(',').map(ip => ip.trim());
  return allowedIps.includes(ip) || allowedIps.includes('*');
}
