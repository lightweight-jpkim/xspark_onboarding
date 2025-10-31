// API 엔드포인트 (Electron에서는 Vercel API 사용)
window.API_BASE = 'https://xspark-onboarding.vercel.app';
const API_BASE = window.API_BASE;  // backward compatibility
const API_URL = `${API_BASE}/api/chat`;
const INIT_URL = `${API_BASE}/api/init`;

console.log('✅ [APP.JS] API_BASE 설정 완료:', window.API_BASE);

// DOM 요소
const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const chatContainer = document.getElementById('chatContainer');
const loadingIndicator = document.getElementById('loadingIndicator');

// 대화 ID 생성 (세션 관리용)
const conversationId = generateConversationId();

// 초기화 상태
let isInitialized = false;
let initializationError = null;

// 이벤트 리스너
chatForm.addEventListener('submit', handleSubmit);

// 앱 로드 시 초기화
window.addEventListener('DOMContentLoaded', initializeApp);

// 폼 제출 핸들러
async function handleSubmit(e) {
    e.preventDefault();

    const message = userInput.value.trim();
    if (!message) return;

    // 사용자 메시지 표시
    addMessage(message, 'user');

    // 입력 필드 초기화
    userInput.value = '';

    // 버튼 비활성화 및 로딩 표시
    setLoading(true);

    try {
        // API 호출
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                conversationId
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // AI 응답 표시
        addMessage(data.answer, 'bot', data.references);

    } catch (error) {
        console.error('Error:', error);
        addMessage(
            '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
            'bot',
            null,
            true
        );
    } finally {
        setLoading(false);
    }
}

// 메시지 추가 함수
function addMessage(text, type, references = null, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // 에러 메시지 스타일링
    if (isError) {
        contentDiv.style.background = '#ffebee';
        contentDiv.style.color = '#c62828';
        contentDiv.style.borderColor = '#ef5350';
    }

    // 텍스트를 문단으로 분리
    const paragraphs = text.split('\n').filter(p => p.trim());
    paragraphs.forEach(paragraph => {
        const p = document.createElement('p');
        p.textContent = paragraph;
        contentDiv.appendChild(p);
    });

    // 참조 문서 링크 추가 (봇 메시지인 경우)
    if (references && references.length > 0 && type === 'bot') {
        const referencesDiv = document.createElement('div');
        referencesDiv.className = 'references';

        const heading = document.createElement('h4');
        heading.textContent = '📚 참고 문서';
        referencesDiv.appendChild(heading);

        references.forEach(ref => {
            const link = document.createElement('a');
            link.href = ref.url;
            link.textContent = ref.title;
            link.className = 'reference-link';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            referencesDiv.appendChild(link);
        });

        contentDiv.appendChild(referencesDiv);
    }

    messageDiv.appendChild(contentDiv);
    chatContainer.appendChild(messageDiv);

    // 스크롤을 최하단으로
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 로딩 상태 관리
function setLoading(isLoading) {
    sendButton.disabled = isLoading;
    userInput.disabled = isLoading;

    if (isLoading) {
        loadingIndicator.style.display = 'block';
        sendButton.querySelector('span').textContent = '전송 중...';
    } else {
        loadingIndicator.style.display = 'none';
        sendButton.querySelector('span').textContent = '전송';
        userInput.focus();
    }
}

// 대화 ID 생성
function generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 앱 초기화 함수
async function initializeApp() {
    console.log('🚀 앱 초기화 시작...');

    // 초기화 메시지 표시
    showInitMessage('Notion 워크스페이스 로딩 중... (최대 20초 소요)');

    try {
        const response = await fetch(INIT_URL, {
            method: 'GET'
        });

        if (!response.ok) {
            throw new Error(`초기화 실패: HTTP ${response.status}`);
        }

        const data = await response.json();

        isInitialized = true;
        console.log('✅ 초기화 완료:', data);
        console.log('Response structure:', {
            status: data.status,
            hasStats: !!data.stats,
            hasTotalPages: !!data.totalPages,
            hasCache: !!data.cache
        });

        // 초기화 성공 메시지 (모든 응답 형태 안전하게 처리)
        hideInitMessage();

        let welcomeMessage = `안녕하세요! xspark 프로덕트 지식 관리 AI입니다.\n\n`;

        // 페이지 수 추출 (여러 소스 시도)
        let pageCount =
            data.totalPages ||
            (data.stats && data.stats.totalPages) ||
            (data.cache && data.cache.pageCount) ||
            0;

        if (pageCount > 0) {
            if (data.status === 'already_cached') {
                // 이미 캐시된 경우
                welcomeMessage += `✅ ${pageCount}개 페이지가 이미 로딩되어 있습니다.\n`;
                welcomeMessage += `⚡ 즉시 사용 가능합니다!\n\n`;
            } else {
                // 새로 로딩한 경우
                welcomeMessage += `✅ ${pageCount}개 페이지를 성공적으로 로딩했습니다.\n`;
                if (data.stats && data.stats.loadTimeSeconds) {
                    welcomeMessage += `⏱️ 로딩 시간: ${data.stats.loadTimeSeconds}초\n`;
                }
                welcomeMessage += `\n`;
            }
        } else {
            // 페이지 수를 알 수 없는 경우
            welcomeMessage += `✅ 초기화 완료!\n\n`;
        }

        welcomeMessage += `xspark 프로덕트에 대해 무엇이든 물어보세요!`;

        addMessage(welcomeMessage, 'bot');

        // 입력 필드 활성화
        userInput.disabled = false;
        userInput.focus();

    } catch (error) {
        console.error('❌ 초기화 오류:', error);
        initializationError = error;
        isInitialized = false;

        // 오류 메시지
        hideInitMessage();
        addMessage(
            `초기화 중 오류가 발생했습니다: ${error.message}\\n\\n` +
            `하지만 질문을 하시면 자동으로 재시도됩니다.`,
            'bot',
            null,
            true
        );

        // 입력 필드는 활성화 (질문 시 자동으로 초기화 재시도)
        userInput.disabled = false;
        userInput.focus();
    }
}

// 초기화 메시지 표시
function showInitMessage(message) {
    const initDiv = document.createElement('div');
    initDiv.id = 'initMessage';
    initDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 30px 50px;
        border-radius: 15px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        font-size: 18px;
        z-index: 1000;
        text-align: center;
    `;

    initDiv.innerHTML = `
        <div style="margin-bottom: 15px;">⏳</div>
        <div>${message}</div>
        <div style="margin-top: 15px; font-size: 14px; opacity: 0.9;">잠시만 기다려주세요...</div>
    `;

    document.body.appendChild(initDiv);
}

// 초기화 메시지 숨김
function hideInitMessage() {
    const initDiv = document.getElementById('initMessage');
    if (initDiv) {
        initDiv.style.opacity = '0';
        initDiv.style.transition = 'opacity 0.3s';
        setTimeout(() => initDiv.remove(), 300);
    }
}

// 초기 상태: 입력 필드 비활성화
userInput.disabled = true;
userInput.placeholder = '초기화 중...';
