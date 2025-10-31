/**
 * Slack 채널 정리 관리자 (v2 - 일일/전체 히스토리)
 */

class SlackManager {
  constructor() {
    console.log('SlackManager 초기화 시작...');

    this.API_BASE = window.API_BASE || 'https://xspark-onboarding.vercel.app';

    // DOM 요소
    this.slackChannel = document.getElementById('slackChannel');
    this.slackSaveLocation = document.getElementById('slackSaveLocation');
    this.dailySummaryBtn = document.getElementById('dailySummaryBtn');
    this.fullHistoryBtn = document.getElementById('fullHistoryBtn');
    this.dateModal = document.getElementById('dateModal');
    this.slackDate = document.getElementById('slackDate');
    this.confirmDateBtn = document.getElementById('confirmDateBtn');
    this.cancelDateBtn = document.getElementById('cancelDateBtn');
    this.slackProgress = document.getElementById('slackProgress');
    this.slackProgressText = document.getElementById('slackProgressText');
    this.slackProgressFill = document.getElementById('slackProgressFill');
    this.chatContainer = document.getElementById('chatContainer');

    this.channels = [];
    this.databases = [];
    this.isProcessing = false;

    this.init();
  }

  async init() {
    try {
      console.log('Slack 관리자 초기화 중...');

      // 오늘 날짜 기본값
      const today = new Date();
      this.slackDate.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // 이벤트 리스너
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

  setupEventListeners() {
    this.slackChannel.addEventListener('change', () => this.validateForm());
    this.slackSaveLocation.addEventListener('change', () => this.validateForm());

    this.dailySummaryBtn.addEventListener('click', () => this.showDateModal());
    this.fullHistoryBtn.addEventListener('click', () => this.processFullHistory());

    this.confirmDateBtn.addEventListener('click', () => this.processDailySummary());
    this.cancelDateBtn.addEventListener('click', () => this.hideDateModal());

    // 모달 배경 클릭 시 닫기
    this.dateModal.addEventListener('click', (e) => {
      if (e.target === this.dateModal) this.hideDateModal();
    });
  }

  async loadChannels() {
    try {
      console.log('📋 Slack 채널 목록 로드 중...');

      const response = await fetch(`${this.API_BASE}/api/slack/channels`);
      const data = await response.json();

      if (!data.success || !data.channels) {
        throw new Error('채널 목록을 불러올 수 없습니다');
      }

      this.channels = data.channels;

      this.slackChannel.innerHTML = '<option value="">채널 선택...</option>';
      data.channels.forEach(channel => {
        const option = document.createElement('option');
        option.value = channel.id;
        option.textContent = `#${channel.name}${channel.isPrivate ? ' 🔒' : ''}`;
        this.slackChannel.appendChild(option);
      });

      console.log(`✅ ${data.channels.length}개 채널 로드 완료`);
    } catch (error) {
      console.error('❌ 채널 로드 실패:', error);
      this.slackChannel.innerHTML = '<option value="">채널 로드 실패</option>';
      this.showError('Slack 채널 목록을 불러오는 데 실패했습니다: ' + error.message);
    }
  }

  async loadSaveLocations() {
    try {
      console.log('📁 Notion 저장 위치 로드 중...');

      const response = await fetch(`${this.API_BASE}/api/debug`);
      const data = await response.json();

      if (data.status !== 'ok' || !data.accessible || !data.accessible.databases) {
        throw new Error('저장 위치를 불러올 수 없습니다');
      }

      this.databases = data.accessible.databases;

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

  validateForm() {
    const isValid =
      this.slackChannel.value !== '' &&
      this.slackSaveLocation.value !== '';

    this.dailySummaryBtn.disabled = !isValid;
    this.fullHistoryBtn.disabled = !isValid;
  }

  showDateModal() {
    this.dateModal.style.display = 'flex';
  }

  hideDateModal() {
    this.dateModal.style.display = 'none';
  }

  async processDailySummary() {
    const date = this.slackDate.value;
    if (!date) {
      alert('날짜를 선택해주세요');
      return;
    }

    this.hideDateModal();
    await this.processChannel(date, 'daily');
  }

  async processFullHistory() {
    const confirmed = confirm('채널의 전체 히스토리를 정리합니다. 시간이 오래 걸릴 수 있습니다. 계속하시겠습니까?');
    if (!confirmed) return;

    await this.processChannel(null, 'full');
  }

  async processChannel(date, mode) {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;
      this.dailySummaryBtn.disabled = true;
      this.fullHistoryBtn.disabled = true;

      const channelId = this.slackChannel.value;
      const channelName = this.slackChannel.options[this.slackChannel.selectedIndex].text.replace(/^#/, '').split(' ')[0];
      const parentPageId = this.slackSaveLocation.value;

      console.log(`🔄 Slack 채널 처리 시작 (${mode})`, { channelId, channelName, date, parentPageId });

      this.showProgress(mode === 'daily' ? 'Slack 메시지 수집 중...' : 'Slack 전체 히스토리 수집 중...', 30);

      const response = await fetch(`${this.API_BASE}/api/slack/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          channelName,
          date, // null이면 전체 히스토리
          parentPageId
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '채널 처리 실패');
      }

      console.log('✅ 채널 처리 완료:', data);

      this.showProgress('리포트 생성 완료!', 100);
      setTimeout(() => this.hideProgress(), 1000);

      this.showPreview(data);

    } catch (error) {
      console.error('❌ Slack 채널 처리 실패:', error);
      this.hideProgress();
      this.showError('채널 처리 중 오류가 발생했습니다: ' + error.message);
    } finally {
      this.isProcessing = false;
      this.validateForm();
    }
  }

  showPreview(result) {
    const previewHTML = `
      <div class="message bot-message" style="max-width: 800px; margin: 20px auto;">
        <div class="message-content">
          <h3 style="color: #667eea; margin-bottom: 10px;">📊 Slack 리포트</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <p style="margin: 5px 0;"><strong>제목:</strong> ${result.title}</p>
            <p style="margin: 5px 0;"><strong>채널:</strong> #${result.channelInfo.name}</p>
            <p style="margin: 5px 0;"><strong>날짜:</strong> ${result.channelInfo.date || '전체 히스토리'}</p>
            <p style="margin: 5px 0;"><strong>메시지 수:</strong> ${result.messageCount}개</p>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0; margin-bottom: 15px; max-height: 500px; overflow-y: auto;">
            <div class="slack-content" style="white-space: pre-wrap; line-height: 1.6; font-size: 14px;">${this.escapeHtml(result.content)}</div>
          </div>

          <div style="display: flex; gap: 10px; justify-content: center;">
            <button class="preview-action-btn edit-btn" style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
              <span>✏️</span><span>수정하기</span>
            </button>
            <button class="preview-action-btn save-btn" style="background: #28a745; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
              <span>📤</span><span>Notion에 저장</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.chatContainer.insertAdjacentHTML('beforeend', previewHTML);
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;

    const lastMessage = this.chatContainer.lastElementChild;
    lastMessage.querySelector('.edit-btn').addEventListener('click', () => this.enableEdit(lastMessage, result));
    lastMessage.querySelector('.save-btn').addEventListener('click', () => this.saveToNotion(result, lastMessage.querySelector('.save-btn')));
  }

  enableEdit(messageElement, result) {
    const contentDiv = messageElement.querySelector('.slack-content');
    const originalContent = contentDiv.textContent;

    const textarea = document.createElement('textarea');
    textarea.value = originalContent;
    textarea.style.cssText = 'width: 100%; min-height: 400px; font-family: inherit; font-size: 14px; line-height: 1.6; padding: 15px; border: 2px solid #667eea; border-radius: 8px; resize: vertical; outline: none;';

    contentDiv.replaceWith(textarea);

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

  async saveToNotion(result, saveButton) {
    try {
      console.log('💾 Notion 저장 시작...');

      saveButton.disabled = true;
      saveButton.innerHTML = '<span>⏳</span><span>저장 중...</span>';

      const response = await fetch(`${this.API_BASE}/api/slack/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      saveButton.innerHTML = '<span>✅</span><span>저장 완료!</span>';
      saveButton.style.background = '#28a745';

      const successMessage = `
        <div class="message bot-message" style="max-width: 800px; margin: 20px auto;">
          <div class="message-content">
            <p style="color: #28a745; font-weight: 600;">✅ Slack 리포트가 Notion에 저장되었습니다!</p>
            <a href="${data.notionUrl}" target="_blank" style="color: #667eea; text-decoration: underline;">📝 Notion에서 확인하기</a>
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

  showProgress(text, percentage) {
    this.slackProgress.style.display = 'block';
    this.slackProgressText.textContent = text;
    this.slackProgressFill.style.width = `${percentage}%`;
  }

  hideProgress() {
    this.slackProgress.style.display = 'none';
    this.slackProgressText.textContent = '처리 중...';
    this.slackProgressFill.style.width = '0%';
  }

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

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SlackManager();
});
