// API 엔드포인트
const API_URL = '/api/chat';

// DOM 요소
const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const chatContainer = document.getElementById('chatContainer');
const loadingIndicator = document.getElementById('loadingIndicator');

// 대화 ID 생성 (세션 관리용)
const conversationId = generateConversationId();

// 이벤트 리스너
chatForm.addEventListener('submit', handleSubmit);

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

// 초기 포커스
userInput.focus();
