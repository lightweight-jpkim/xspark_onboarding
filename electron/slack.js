/**
 * Slack 일일 리포트 관리자
 * - Slack 채널 메시지를 일자별로 가져와 GPT로 정리
 * - 미리보기 후 Notion에 저장
 */

class SlackManager {
  constructor() {
    console.log('SlackManager 초기화 시작...');

    // API Base URL
    this.API_BASE = window.API_BASE || 'https://xspark-onboarding.vercel.app';

    // DOM 요소
    this.slackChannel = document.getElementById('slackChannel');
    this.slackDate = document.getElementById('slackDate');
    this.slackSaveLocation = document.getElementById('slackSaveLocation');
    this.processSlackBtn = document.getElementById('processSlackBtn');
    this.slackProgress = document.getElementById('slackProgress');
    this.slackProgressText = document.getElementById('slackProgressText');
    this.slackProgressFill = document.getElementById('slackProgressFill');
    this.chatContainer = document.getElementById('chatContainer');

    // 상태
    this.channels = [];
    this.databases = [];
    this.isProcessing = false;

    // 초기화
    this.init();
  }

  async init() {
    try {
      console.log('Slack 관리자 초기화 중...');

      // 오늘 날짜를 기본값으로 설정
      this.setDefaultDate();

      // 이벤트 리스너 설정
      this.setupEventListeners();

      // 데이터 로드
      await Promise.all([
        this.loadChannels(),
        this.loadSaveLocations()
      ]);

      console.log('✅ Slack 관리자 초기화 완료');
    } catch (error) {
      console.error('❌ Slack 관리자 초기화 실패:', error);
      this.showError('초기화 중 오류가 발생했습니다: ' + error.message);
    }
  }

  /**
   * 오늘 날짜를 기본값으로 설정
   */
  setDefaultDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.slackDate.value = `${yyyy}-${mm}-${dd}`;
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 채널 선택 변경
    this.slackChannel.addEventListener('change', () => this.validateForm());

    // 날짜 선택 변경
    this.slackDate.addEventListener('change', () => this.validateForm());

    // 저장 위치 선택 변경
    this.slackSaveLocation.addEventListener('change', () => this.validateForm());

    // 처리 버튼 클릭
    this.processSlackBtn.addEventListener('click', () => this.processChannel());
  }

  /**
   * Slack 채널 목록 로드
   */
  async loadChannels() {
    try {
      console.log('📋 Slack 채널 목록 로드 중...');

      const response = await fetch(`${this.API_BASE}/api/slack/channels`);
      const data = await response.json();

      if (!data.success || !data.channels) {
        throw new Error(data.message || '채널 목록을 불러올 수 없습니다');
      }

      this.channels = data.channels;

      // 드롭다운 채우기
      this.slackChannel.innerHTML = '<option value="">채널 선택...</option>';
      data.channels.forEach(channel => {
        const option = document.createElement('option');
        option.value = channel.id;
        option.textContent = `#${channel.name}${channel.isPrivate ? ' 🔒' : ''} (${channel.memberCount}명)`;
        this.slackChannel.appendChild(option);
      });

      console.log(`✅ ${data.channels.length}개 채널 로드 완료`);
    } catch (error) {
      console.error('❌ 채널 로드 실패:', error);
      this.slackChannel.innerHTML = '<option value="">채널 로드 실패</option>';
      this.showError('Slack 채널 목록을 불러오는 데 실패했습니다: ' + error.message);
    }
  }

  /**
   * Notion 저장 위치 로드
   */
  async loadSaveLocations() {
    try {
      console.log('📁 Notion 저장 위치 로드 중...');

      const response = await fetch(`${this.API_BASE}/api/debug`);
      const data = await response.json();

      if (data.status !== 'ok' || !data.accessible || !data.accessible.databases) {
        throw new Error('저장 위치를 불러올 수 없습니다');
      }

      this.databases = data.accessible.databases;

      // 드롭다운 채우기
      this.slackSaveLocation.innerHTML = '<option value="">저장 위치 선택...</option>';
      this.databases.forEach(db => {
        const option = document.createElement('option');
        option.value = db.id;
        option.textContent = db.title;
        this.slackSaveLocation.appendChild(option);
      });

      console.log(`✅ ${this.databases.length}개 저장 위치 로드 완료`);
    } catch (error) {
      console.error('❌ 저장 위치 로드 실패:', error);
      this.slackSaveLocation.innerHTML = '<option value="">저장 위치 로드 실패</option>';
      this.showError('Notion 저장 위치를 불러오는 데 실패했습니다: ' + error.message);
    }
  }

  /**
   * 폼 유효성 검사 및 버튼 활성화
   */
  validateForm() {
    const isValid =
      this.slackChannel.value !== '' &&
      this.slackDate.value !== '' &&
      this.slackSaveLocation.value !== '';

    this.processSlackBtn.disabled = !isValid;
  }

  /**
   * Slack 채널 처리 (메시지 가져오기 + GPT 정리)
   */
  async processChannel() {
    if (this.isProcessing) {
      console.log('⚠️ 이미 처리 중입니다');
      return;
    }

    try {
      this.isProcessing = true;
      this.processSlackBtn.disabled = true;

      // 선택된 값 가져오기
      const channelId = this.slackChannel.value;
      const channelName = this.slackChannel.options[this.slackChannel.selectedIndex].text.replace(/^#/, '').split(' ')[0];
      const date = this.slackDate.value;
      const parentPageId = this.slackSaveLocation.value;

      console.log('🔄 Slack 채널 처리 시작:', { channelId, channelName, date, parentPageId });

      // 진행 상태 표시
      this.showProgress('Slack 메시지 수집 중...', 30);

      // API 호출
      const response = await fetch(`${this.API_BASE}/api/slack/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channelId,
          channelName,
          date,
          parentPageId
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '채널 처리 실패');
      }

      console.log('✅ 채널 처리 완료:', data);

      // 진행 상태 업데이트
      this.showProgress('리포트 생성 완료!', 100);

      // 잠시 후 진행 상태 숨기기
      setTimeout(() => {
        this.hideProgress();
      }, 1000);

      // 미리보기 표시
      this.showPreview(data);

    } catch (error) {
      console.error('❌ Slack 채널 처리 실패:', error);
      this.hideProgress();
      this.showError('채널 처리 중 오류가 발생했습니다: ' + error.message);
    } finally {
      this.isProcessing = false;
      this.validateForm(); // 버튼 상태 복원
    }
  }

  /**
   * 리포트 미리보기 표시
   */
  showPreview(result) {
    console.log('📝 리포트 미리보기 표시');

    // 미리보기 HTML 생성
    const previewHTML = `
      <div class="message bot-message" style="max-width: 800px; margin: 20px auto;">
        <div class="message-content">
          <h3 style="color: #667eea; margin-bottom: 10px;">📊 Slack 일일 리포트</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <p style="margin: 5px 0;"><strong>제목:</strong> ${result.title}</p>
            <p style="margin: 5px 0;"><strong>채널:</strong> #${result.channelInfo.name}</p>
            <p style="margin: 5px 0;"><strong>날짜:</strong> ${result.channelInfo.date}</p>
            <p style="margin: 5px 0;"><strong>메시지 수:</strong> ${result.messageCount}개</p>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0; margin-bottom: 15px; max-height: 500px; overflow-y: auto;">
            <div class="slack-content" style="white-space: pre-wrap; line-height: 1.6; font-size: 14px;">${this.escapeHtml(result.content)}</div>
          </div>

          <div style="display: flex; gap: 10px; justify-content: center;">
            <button class="preview-action-btn edit-btn" style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
              <span>✏️</span>
              <span>수정하기</span>
            </button>
            <button class="preview-action-btn save-btn" style="background: #28a745; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
              <span>📤</span>
              <span>Notion에 저장</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // 채팅 컨테이너에 추가
    this.chatContainer.insertAdjacentHTML('beforeend', previewHTML);

    // 스크롤 맨 아래로
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;

    // 버튼 이벤트 리스너 추가
    const lastMessage = this.chatContainer.lastElementChild;
    const editBtn = lastMessage.querySelector('.edit-btn');
    const saveBtn = lastMessage.querySelector('.save-btn');

    editBtn.addEventListener('click', () => this.enableEdit(lastMessage, result));
    saveBtn.addEventListener('click', () => this.saveToNotion(result, saveBtn));
  }

  /**
   * 인라인 편집 활성화
   */
  enableEdit(messageElement, result) {
    const contentDiv = messageElement.querySelector('.slack-content');
    const originalContent = contentDiv.textContent;

    // Textarea로 변경
    const textarea = document.createElement('textarea');
    textarea.value = originalContent;
    textarea.style.cssText = `
      width: 100%;
      min-height: 400px;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.6;
      padding: 15px;
      border: 2px solid #667eea;
      border-radius: 8px;
      resize: vertical;
      outline: none;
    `;

    contentDiv.replaceWith(textarea);

    // 수정 완료 버튼으로 변경
    const editBtn = messageElement.querySelector('.edit-btn');
    editBtn.innerHTML = '<span>✅</span><span>수정 완료</span>';
    editBtn.style.background = '#28a745';

    editBtn.onclick = () => {
      result.content = textarea.value;

      const newContentDiv = document.createElement('div');
      newContentDiv.className = 'slack-content';
      newContentDiv.style.cssText = 'white-space: pre-wrap; line-height: 1.6; font-size: 14px;';
      newContentDiv.textContent = textarea.value;

      textarea.replaceWith(newContentDiv);

      editBtn.innerHTML = '<span>✏️</span><span>수정하기</span>';
      editBtn.style.background = '#667eea';
      editBtn.onclick = () => this.enableEdit(messageElement, result);
    };
  }

  /**
   * Notion에 저장
   */
  async saveToNotion(result, saveButton) {
    try {
      console.log('💾 Notion 저장 시작...');

      // 버튼 비활성화
      saveButton.disabled = true;
      saveButton.innerHTML = '<span>⏳</span><span>저장 중...</span>';

      const response = await fetch(`${this.API_BASE}/api/slack/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: result.title,
          content: result.content,
          parentPageId: result.parentPageId,
          channelInfo: result.channelInfo
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Notion 저장 실패');
      }

      console.log('✅ Notion 저장 완료:', data.notionUrl);

      // 성공 메시지 표시
      saveButton.innerHTML = '<span>✅</span><span>저장 완료!</span>';
      saveButton.style.background = '#28a745';

      // 저장 완료 메시지 추가
      const successMessage = `
        <div class="message bot-message" style="max-width: 800px; margin: 20px auto;">
          <div class="message-content">
            <p style="color: #28a745; font-weight: 600;">✅ Slack 일일 리포트가 Notion에 저장되었습니다!</p>
            <a href="${data.notionUrl}" target="_blank" style="color: #667eea; text-decoration: underline;">
              📝 Notion에서 확인하기
            </a>
          </div>
        </div>
      `;

      this.chatContainer.insertAdjacentHTML('beforeend', successMessage);
      this.chatContainer.scrollTop = this.chatContainer.scrollHeight;

    } catch (error) {
      console.error('❌ Notion 저장 실패:', error);
      saveButton.disabled = false;
      saveButton.innerHTML = '<span>📤</span><span>Notion에 저장</span>';
      this.showError('Notion 저장 중 오류가 발생했습니다: ' + error.message);
    }
  }

  /**
   * 진행 상태 표시
   */
  showProgress(text, percentage) {
    this.slackProgress.style.display = 'block';
    this.slackProgressText.textContent = text;
    this.slackProgressFill.style.width = `${percentage}%`;
  }

  /**
   * 진행 상태 숨기기
   */
  hideProgress() {
    this.slackProgress.style.display = 'none';
    this.slackProgressText.textContent = '처리 중...';
    this.slackProgressFill.style.width = '0%';
  }

  /**
   * 에러 메시지 표시
   */
  showError(message) {
    const errorHTML = `
      <div class="message bot-message" style="max-width: 800px; margin: 20px auto;">
        <div class="message-content">
          <p style="color: #dc3545; font-weight: 600;">❌ ${this.escapeHtml(message)}</p>
        </div>
      </div>
    `;

    this.chatContainer.insertAdjacentHTML('beforeend', errorHTML);
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }

  /**
   * HTML 이스케이프
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  new SlackManager();
});
