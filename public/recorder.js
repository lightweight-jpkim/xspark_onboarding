// 회의 녹음 기능
class MeetingRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.startTime = null;
        this.timerInterval = null;
        this.selectedPageId = null;
        this.allPages = [];
        this.micStream = null;
        this.systemStream = null;
        this.audioContext = null;

        // DOM 요소
        this.startBtn = document.getElementById('startRecordingBtn');
        this.stopBtn = document.getElementById('stopRecordingBtn');
        this.recordingStatus = document.getElementById('recordingStatus');
        this.recordingTime = document.getElementById('recordingTime');
        this.recorderProgress = document.getElementById('recorderProgress');
        this.progressText = document.getElementById('progressText');
        this.progressFill = document.getElementById('progressFill');
        this.saveLocationSelect = document.getElementById('saveLocation');

        // 이벤트 리스너
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.saveLocationSelect.addEventListener('change', (e) => this.onLocationChange(e));

        // 페이지 목록 로드
        this.loadPageList();
    }

    /**
     * 데이터베이스 목록 로드 (회의록 저장은 데이터베이스에만)
     */
    async loadPageList() {
        try {
            const response = await fetch('/api/debug');
            const data = await response.json();

            if (data.accessible) {
                // 데이터베이스만 사용 (페이지 항목은 제외)
                const databases = data.accessible.databases?.list || [];

                console.log('✅ [RECORDER v1761876704] 데이터베이스만 로드:', databases.length);
                this.allPages = databases;

                // 드롭다운 채우기
                this.populateLocationSelect();
            }

        } catch (error) {
            console.error('페이지 목록 로드 실패:', error);
            this.saveLocationSelect.innerHTML = '<option value="">로드 실패</option>';
        }
    }

    /**
     * 드롭다운에 페이지 목록 추가
     */
    populateLocationSelect() {
        this.saveLocationSelect.innerHTML = '<option value="">-- 선택하세요 --</option>';

        // 최근 수정된 순으로 정렬
        const sorted = [...this.allPages].sort((a, b) =>
            new Date(b.lastEditedTime) - new Date(a.lastEditedTime)
        );

        sorted.forEach(page => {
            const option = document.createElement('option');
            option.value = page.id;

            // 제목이 "Untitled"인 경우 URL로 표시
            let displayName = page.title;
            if (displayName === 'Untitled' || !displayName.trim()) {
                displayName = `(제목 없음 - ${new Date(page.lastEditedTime).toLocaleDateString('ko-KR')})`;
            }

            option.textContent = displayName;
            option.title = `최종 수정: ${new Date(page.lastEditedTime).toLocaleString('ko-KR')}`;

            this.saveLocationSelect.appendChild(option);
        });

        // 기본 선택: "회의록" 또는 "meeting" 키워드가 있는 페이지
        const defaultPage = sorted.find(p =>
            p.title.toLowerCase().includes('회의록') ||
            p.title.toLowerCase().includes('meeting')
        );

        if (defaultPage) {
            this.saveLocationSelect.value = defaultPage.id;
            this.selectedPageId = defaultPage.id;
            this.startBtn.disabled = false;
        }
    }

    /**
     * 저장 위치 선택 이벤트
     */
    onLocationChange(event) {
        this.selectedPageId = event.target.value;
        this.startBtn.disabled = !this.selectedPageId;
    }

    async startRecording() {
        try {
            // 1. 마이크 스트림
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // 2. 시스템 오디오 스트림 (화상회의 소리)
            let systemStream = null;
            try {
                // Chrome: 탭 오디오 캡처
                systemStream = await navigator.mediaDevices.getDisplayMedia({
                    video: false,
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        sampleRate: 44100
                    }
                });
            } catch (e) {
                console.warn('시스템 오디오 캡처 실패 (마이크만 사용):', e.message);
            }

            // 3. 오디오 믹싱 (마이크 + 시스템 오디오)
            const audioContext = new AudioContext();
            const destination = audioContext.createMediaStreamDestination();

            // 마이크 추가
            const micSource = audioContext.createMediaStreamSource(micStream);
            micSource.connect(destination);

            // 시스템 오디오 추가 (있으면)
            if (systemStream) {
                const systemSource = audioContext.createMediaStreamSource(systemStream);
                systemSource.connect(destination);
                console.log('✅ 마이크 + 시스템 오디오 믹싱');
            } else {
                console.log('ℹ️ 마이크만 녹음');
            }

            // MediaRecorder 설정 (믹싱된 스트림 사용)
            this.mediaRecorder = new MediaRecorder(destination.stream);
            this.audioChunks = [];
            this.micStream = micStream;
            this.systemStream = systemStream;
            this.audioContext = audioContext;

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
                await this.processRecording();
            };

            // 녹음 시작
            this.mediaRecorder.start();
            this.startTime = Date.now();

            // UI 업데이트
            this.startBtn.style.display = 'none';
            this.stopBtn.style.display = 'flex';
            this.recordingStatus.style.display = 'flex';

            // 타이머 시작
            this.timerInterval = setInterval(() => this.updateTimer(), 1000);

            console.log('🎤 녹음 시작');

        } catch (error) {
            console.error('녹음 시작 실패:', error);
            alert('마이크 권한이 필요합니다. 브라우저 설정에서 마이크 접근을 허용해주세요.');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();

            // 모든 스트림 정지
            if (this.micStream) {
                this.micStream.getTracks().forEach(track => track.stop());
            }
            if (this.systemStream) {
                this.systemStream.getTracks().forEach(track => track.stop());
            }
            if (this.audioContext) {
                this.audioContext.close();
            }

            // 타이머 정지
            clearInterval(this.timerInterval);

            // UI 업데이트
            this.stopBtn.disabled = true;
            this.stopBtn.querySelector('.btn-text').textContent = '처리 중...';

            console.log('⏹️ 녹음 중지');
        }
    }

    updateTimer() {
        const elapsed = Date.now() - this.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        this.recordingTime.textContent =
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    async processRecording() {
        try {
            // UI: 진행 상황 표시
            this.recordingStatus.style.display = 'none';
            this.recorderProgress.style.display = 'block';
            this.progressText.textContent = '오디오 파일 준비 중...';
            this.progressFill.style.width = '10%';

            // Blob 생성
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            console.log('📦 오디오 파일 크기:', (audioBlob.size / 1024 / 1024).toFixed(2), 'MB');

            // 파일 크기 체크 (Whisper API 제한: 25MB)
            if (audioBlob.size > 25 * 1024 * 1024) {
                throw new Error('파일이 너무 큽니다 (최대 25MB). 더 짧은 회의를 녹음해주세요.');
            }

            // FormData 생성
            const formData = new FormData();
            formData.append('audio', audioBlob, 'meeting.webm');
            formData.append('parentPageId', this.selectedPageId); // 선택된 페이지 ID 추가

            this.progressText.textContent = '서버로 업로드 중...';
            this.progressFill.style.width = '30%';

            // 서버로 업로드
            const response = await fetch('/api/meeting/process', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || '서버 오류');
            }

            this.progressFill.style.width = '100%';
            this.progressText.textContent = '완료!';

            const result = await response.json();
            console.log('✅ 처리 완료:', result);

            // 결과 표시
            this.showResult(result);

            // UI 리셋 (2초 후)
            setTimeout(() => this.resetUI(), 2000);

        } catch (error) {
            console.error('❌ 처리 중 오류:', error);
            this.progressText.textContent = `오류: ${error.message}`;
            this.progressText.style.color = '#f44336';

            // UI 리셋 (5초 후)
            setTimeout(() => this.resetUI(), 5000);
        }
    }

    showResult(result) {
        // 채팅 창에 결과 메시지 추가
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        let htmlContent = `
            <h3>🎉 회의록이 Notion에 저장되었습니다!</h3>
            <p><strong>제목:</strong> ${result.title}</p>
            <p><strong>녹음 시간:</strong> ${result.duration}</p>
        `;

        if (result.notionUrl) {
            htmlContent += `
                <p>
                    <a href="${result.notionUrl}" target="_blank" style="color: #667eea; text-decoration: underline;">
                        Notion에서 보기 →
                    </a>
                </p>
            `;
        }

        if (result.summary) {
            htmlContent += `<hr style="margin: 15px 0; border: none; border-top: 1px solid #e0e0e0;">`;
            htmlContent += `<p><strong>요약:</strong></p>`;
            htmlContent += `<p style="font-size: 14px; line-height: 1.6;">${result.summary}</p>`;
        }

        contentDiv.innerHTML = htmlContent;
        messageDiv.appendChild(contentDiv);

        const chatContainer = document.getElementById('chatContainer');
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    resetUI() {
        this.startBtn.style.display = 'flex';
        this.stopBtn.style.display = 'none';
        this.stopBtn.disabled = false;
        this.stopBtn.querySelector('.btn-text').textContent = '녹음 중지';
        this.recordingStatus.style.display = 'none';
        this.recorderProgress.style.display = 'none';
        this.progressText.style.color = '#666';
        this.progressFill.style.width = '0%';
        this.recordingTime.textContent = '00:00';
    }
}

// 녹음기 초기화
let meetingRecorder;
window.addEventListener('DOMContentLoaded', () => {
    meetingRecorder = new MeetingRecorder();
    console.log('📝 회의 녹음 기능 준비 완료');
});
