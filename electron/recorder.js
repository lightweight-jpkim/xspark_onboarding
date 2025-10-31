// API 엔드포인트는 메서드 내에서 window.API_BASE 또는 fallback 사용
console.log('🚀 [RECORDER] recorder.js 파일 로드 시작 - window.API_BASE:', window.API_BASE);

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
        this.analyser = null;
        this.animationId = null;

        console.log('🔧 [RECORDER] Constructor 시작');

        // DOM 요소
        this.startBtn = document.getElementById('startRecordingBtn');
        console.log('🔍 [RECORDER] startBtn:', this.startBtn);

        this.stopBtn = document.getElementById('stopRecordingBtn');
        this.recordingStatus = document.getElementById('recordingStatus');
        this.recordingTime = document.getElementById('recordingTime');
        this.recorderProgress = document.getElementById('recorderProgress');
        this.progressText = document.getElementById('progressText');
        this.progressFill = document.getElementById('progressFill');

        this.saveLocationSelect = document.getElementById('saveLocation');
        console.log('🔍 [RECORDER] saveLocationSelect:', this.saveLocationSelect);

        this.audioLevel = document.getElementById('audioLevel');
        this.audioVisualizer = document.getElementById('audioVisualizer');

        if (this.audioVisualizer) {
            this.canvasCtx = this.audioVisualizer.getContext('2d');
            console.log('✅ [RECORDER] Canvas context created');
        } else {
            console.error('❌ [RECORDER] audioVisualizer not found!');
        }

        // 이벤트 리스너
        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => this.startRecording());
            console.log('✅ [RECORDER] startBtn event listener attached');
        }

        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', () => this.stopRecording());
        }

        if (this.saveLocationSelect) {
            this.saveLocationSelect.addEventListener('change', (e) => this.onLocationChange(e));
            console.log('✅ [RECORDER] saveLocationSelect event listener attached');
        }

        console.log('🔧 [RECORDER] Constructor 완료 - 페이지 목록 로드 시작');
        // 페이지 목록 로드
        this.loadPageList();
    }

    /**
     * 데이터베이스 목록 로드 (회의록 저장은 데이터베이스에만)
     */
    async loadPageList() {
        try {
            const API_BASE = window.API_BASE || 'https://xspark-onboarding.vercel.app';
            console.log('🔄 [RECORDER] loadPageList 시작 - window.API_BASE:', window.API_BASE);
            console.log('🔄 [RECORDER] API_BASE:', API_BASE);
            console.log('🔄 [RECORDER] Fetching:', `${API_BASE}/api/debug`);

            const response = await fetch(`${API_BASE}/api/debug`);
            console.log('📡 [RECORDER] Response status:', response.status, response.statusText);

            const data = await response.json();
            console.log('📦 [RECORDER] Response data:', data);

            if (data.accessible) {
                // 데이터베이스만 사용 (페이지 항목은 제외)
                const databases = data.accessible.databases?.list || [];

                console.log('✅ [RECORDER] 데이터베이스 로드 완료:', databases.length, '개');
                console.log('📋 [RECORDER] 데이터베이스 목록:', databases);
                this.allPages = databases;

                // 드롭다운 채우기
                this.populateLocationSelect();
            } else {
                console.warn('⚠️ [RECORDER] data.accessible가 없습니다');
            }

        } catch (error) {
            console.error('❌ [RECORDER] 페이지 목록 로드 실패:', error);
            console.error('❌ [RECORDER] 에러 상세:', error.message, error.stack);
            if (this.saveLocationSelect) {
                this.saveLocationSelect.innerHTML = '<option value="">로드 실패</option>';
            }
        }
    }

    /**
     * 드롭다운에 페이지 목록 추가
     */
    populateLocationSelect() {
        console.log('📋 [RECORDER] populateLocationSelect 시작 - allPages.length:', this.allPages.length);

        this.saveLocationSelect.innerHTML = '<option value="">-- 선택하세요 --</option>';

        // 최근 수정된 순으로 정렬
        const sorted = [...this.allPages].sort((a, b) =>
            new Date(b.lastEditedTime) - new Date(a.lastEditedTime)
        );

        sorted.forEach(page => {
            console.log('📄 [RECORDER] 페이지 추가:', page.title, page.id);
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
            console.log('✅ [RECORDER] 기본 페이지 선택:', defaultPage.title);
            this.saveLocationSelect.value = defaultPage.id;
            this.selectedPageId = defaultPage.id;
        } else {
            console.log('⚠️ [RECORDER] 기본 페이지를 찾을 수 없습니다. 첫 번째 페이지를 기본으로 선택합니다.');
            // 기본 페이지가 없으면 첫 번째 페이지를 선택
            if (sorted.length > 0) {
                this.saveLocationSelect.value = sorted[0].id;
                this.selectedPageId = sorted[0].id;
            }
        }

        console.log('✅ [RECORDER] 드롭다운 채우기 완료, 버튼 활성화');
        // 페이지가 로드되면 버튼 활성화 (사용자가 선택 가능하도록)
        this.startBtn.disabled = false;
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
            // Electron 환경 감지
            const isElectron = window.electronAPI && window.electronAPI.isElectron;

            // 1. 마이크 스트림
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // 2. 시스템 오디오 스트림
            let systemStream = null;

            if (isElectron) {
                // Electron: desktopCapturer 사용 (진짜 시스템 오디오!)
                try {
                    console.log('🖥️ Electron 모드: 시스템 오디오 캡처');
                    const sources = await window.electronAPI.getSystemAudioSources();

                    if (sources.length > 0) {
                        // 첫 번째 화면 선택 (나중에 UI로 개선 가능)
                        const selectedSource = sources[0];
                        console.log(`✅ 선택된 소스: ${selectedSource.name}`);

                        systemStream = await navigator.mediaDevices.getUserMedia({
                            audio: {
                                mandatory: {
                                    chromeMediaSource: 'desktop',
                                    chromeMediaSourceId: selectedSource.id
                                }
                            },
                            video: {
                                mandatory: {
                                    chromeMediaSource: 'desktop',
                                    chromeMediaSourceId: selectedSource.id
                                }
                            }
                        });

                        // 비디오 트랙 제거 (오디오만 필요)
                        systemStream.getVideoTracks().forEach(track => track.stop());
                    }
                } catch (e) {
                    console.error('Electron 시스템 오디오 캡처 실패:', e);
                }
            } else {
                // 브라우저: getDisplayMedia (탭 오디오만)
                try {
                    console.log('🌐 브라우저 모드: 탭 오디오 캡처');
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
            }

            // 3. 오디오 믹싱 (마이크 + 시스템 오디오)
            const audioContext = new AudioContext();
            const destination = audioContext.createMediaStreamDestination();

            // 오디오 분석기 추가
            this.analyser = audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;

            // 마이크 추가
            const micSource = audioContext.createMediaStreamSource(micStream);
            micSource.connect(destination);
            micSource.connect(this.analyser); // 분석기에 연결

            // 시스템 오디오 추가 (있으면)
            if (systemStream) {
                const systemSource = audioContext.createMediaStreamSource(systemStream);
                systemSource.connect(destination);
                systemSource.connect(this.analyser); // 분석기에도 연결
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
            this.audioVisualizer.style.display = 'block';

            // 타이머 시작
            this.timerInterval = setInterval(() => this.updateTimer(), 1000);

            // 오디오 모니터링 시작
            this.startAudioMonitoring();

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

            // 오디오 모니터링 중지
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }

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

    startAudioMonitoring() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const WIDTH = this.audioVisualizer.width;
        const HEIGHT = this.audioVisualizer.height;

        const draw = () => {
            this.animationId = requestAnimationFrame(draw);

            this.analyser.getByteTimeDomainData(dataArray);

            // 배경 지우기
            this.canvasCtx.fillStyle = '#f5f5f5';
            this.canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

            // 파형 그리기
            this.canvasCtx.lineWidth = 2;
            this.canvasCtx.strokeStyle = '#667eea';
            this.canvasCtx.beginPath();

            const sliceWidth = WIDTH / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * HEIGHT) / 2;

                if (i === 0) {
                    this.canvasCtx.moveTo(x, y);
                } else {
                    this.canvasCtx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            this.canvasCtx.lineTo(WIDTH, HEIGHT / 2);
            this.canvasCtx.stroke();

            // 오디오 레벨 계산
            const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
            const deviation = Math.abs(average - 128);
            const db = Math.round(20 * Math.log10(deviation / 128 + 0.01));

            // 레벨 표시 업데이트
            if (deviation < 1) {
                this.audioLevel.textContent = '🔇 0dB (너무 조용함!)';
                this.audioLevel.style.color = '#f44336';
            } else if (deviation < 5) {
                this.audioLevel.textContent = `🔉 ${db}dB`;
                this.audioLevel.style.color = '#ff9800';
            } else {
                this.audioLevel.textContent = `🔊 ${db}dB`;
                this.audioLevel.style.color = '#4caf50';
            }
        };

        draw();
    }

    async processRecording() {
        try {
            const API_BASE = window.API_BASE || 'https://xspark-onboarding.vercel.app';

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
            console.log('📤 [RECORDER] 서버 업로드:', `${API_BASE}/api/meeting/process`);
            const response = await fetch(`${API_BASE}/api/meeting/process`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || '서버 오류');
            }

            this.progressFill.style.width = '100%';
            this.progressText.textContent = '회의록 준비 완료!';

            const result = await response.json();
            console.log('✅ 처리 완료:', result);

            // 결과 표시
            this.showResult(result);

            // 진행 표시줄 숨기기 (2초 후)
            setTimeout(() => {
                this.recorderProgress.style.display = 'none';
                this.startBtn.style.display = 'flex';
            }, 2000);

        } catch (error) {
            console.error('❌ 처리 중 오류:', error);
            this.progressText.textContent = `오류: ${error.message}`;
            this.progressText.style.color = '#f44336';

            // UI 리셋 (5초 후)
            setTimeout(() => this.resetUI(), 5000);
        }
    }

    showResult(result) {
        // 채팅 창에 회의록 미리보기 추가
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.style.maxWidth = '100%';

        // 회의록 내용을 마크다운 형식으로 표시
        const formattedContent = result.content
            .split('\n')
            .map(line => {
                line = line.trim();
                if (line.startsWith('##')) {
                    return `<h3 style="margin-top: 20px; margin-bottom: 10px; color: #667eea;">${line.replace(/^##\s*/, '')}</h3>`;
                } else if (line.startsWith('###')) {
                    return `<h4 style="margin-top: 15px; margin-bottom: 8px; color: #764ba2;">${line.replace(/^###\s*/, '')}</h4>`;
                } else if (line.startsWith('**') && line.endsWith('**')) {
                    return `<p style="margin: 8px 0;"><strong>${line.replace(/\*\*/g, '')}</strong></p>`;
                } else if (line.startsWith('-') || line.startsWith('•')) {
                    return `<li style="margin-left: 20px;">${line.replace(/^[-•]\s*/, '')}</li>`;
                } else if (line === '---') {
                    return '<hr style="margin: 15px 0; border: none; border-top: 1px solid #e0e0e0;">';
                } else if (line) {
                    return `<p style="margin: 8px 0;">${line}</p>`;
                }
                return '';
            })
            .join('');

        let htmlContent = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 20px; border-radius: 10px; color: white; margin-bottom: 20px;">
                <h2 style="margin: 0 0 10px 0;">📝 회의록이 준비되었습니다!</h2>
                <p style="margin: 0; opacity: 0.9;">내용을 확인하고 Notion에 저장하세요.</p>
            </div>

            <div style="background: #f5f7fa; padding: 20px; border-radius: 10px; margin-bottom: 20px; max-height: 500px; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 2px solid #ddd;">
                    <div>
                        <h3 style="margin: 0; color: #333;">${result.title}</h3>
                        <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">녹음 시간: ${result.duration}</p>
                    </div>
                </div>

                <div style="color: #333; line-height: 1.8;">
                    ${formattedContent}
                </div>
            </div>

            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="saveToNotion_${Date.now()}"
                        style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                               color: white; border: none; padding: 15px 40px;
                               border-radius: 8px; font-size: 16px; font-weight: bold;
                               cursor: pointer; transition: transform 0.2s;"
                        onmouseover="this.style.transform='scale(1.05)'"
                        onmouseout="this.style.transform='scale(1)'">
                    📤 Notion에 저장
                </button>
                <button id="editContent_${Date.now()}"
                        style="background: #f5f7fa; color: #667eea; border: 2px solid #667eea;
                               padding: 15px 40px; border-radius: 8px; font-size: 16px;
                               font-weight: bold; cursor: pointer; transition: all 0.2s;"
                        onmouseover="this.style.background='#667eea'; this.style.color='white'"
                        onmouseout="this.style.background='#f5f7fa'; this.style.color='#667eea'">
                    ✏️ 수정하기
                </button>
            </div>
        `;

        contentDiv.innerHTML = htmlContent;
        messageDiv.appendChild(contentDiv);

        const chatContainer = document.getElementById('chatContainer');
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // 저장 버튼 이벤트 리스너
        const saveBtn = contentDiv.querySelector('[id^="saveToNotion_"]');
        const editBtn = contentDiv.querySelector('[id^="editContent_"]');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveToNotion(result, saveBtn));
        }

        if (editBtn) {
            editBtn.addEventListener('click', () => this.enableEdit(contentDiv, result));
        }
    }

    async saveToNotion(result, button) {
        try {
            button.disabled = true;
            button.textContent = '💾 저장 중...';

            const API_BASE = window.API_BASE || 'https://xspark-onboarding.vercel.app';

            const response = await fetch(`${API_BASE}/api/meeting/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: result.title,
                    content: result.content,
                    parentPageId: result.parentPageId
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Notion 저장 실패');
            }

            const saveResult = await response.json();
            console.log('✅ Notion 저장 완료:', saveResult);

            button.textContent = '✅ 저장 완료!';
            button.style.background = '#4CAF50';

            // 성공 메시지 추가
            const successMsg = document.createElement('div');
            successMsg.style.cssText = 'margin-top: 15px; padding: 15px; background: #e8f5e9; border-radius: 8px; color: #2e7d32;';
            successMsg.innerHTML = `
                <p style="margin: 0;"><strong>✅ Notion에 저장되었습니다!</strong></p>
                <p style="margin: 5px 0 0 0;">
                    <a href="${saveResult.notionUrl}" target="_blank"
                       style="color: #1976d2; text-decoration: underline;">
                        Notion에서 보기 →
                    </a>
                </p>
            `;
            button.parentElement.parentElement.appendChild(successMsg);

        } catch (error) {
            console.error('❌ Notion 저장 오류:', error);
            button.textContent = `❌ 오류: ${error.message}`;
            button.style.background = '#f44336';
            button.disabled = false;
        }
    }

    enableEdit(contentDiv, result) {
        const contentArea = contentDiv.querySelector('div[style*="max-height"]');
        const currentContent = result.content;

        contentArea.innerHTML = `
            <textarea id="editableContent"
                      style="width: 100%; min-height: 400px; padding: 15px;
                             border: 2px solid #667eea; border-radius: 8px;
                             font-family: inherit; font-size: 14px; line-height: 1.6;">${currentContent}</textarea>
        `;

        // 버튼 텍스트 변경
        const buttons = contentDiv.querySelectorAll('button');
        buttons.forEach(btn => {
            if (btn.textContent.includes('수정하기')) {
                btn.textContent = '💾 수정 완료';
                btn.onclick = () => {
                    result.content = document.getElementById('editableContent').value;
                    this.showResult(result);
                };
            }
        });
    }

    resetUI() {
        this.startBtn.style.display = 'flex';
        this.stopBtn.style.display = 'none';
        this.stopBtn.disabled = false;
        this.stopBtn.querySelector('.btn-text').textContent = '녹음 중지';
        this.recordingStatus.style.display = 'none';
        this.audioVisualizer.style.display = 'none';
        this.recorderProgress.style.display = 'none';
        this.progressText.style.color = '#666';
        this.progressFill.style.width = '0%';
        this.recordingTime.textContent = '00:00';
        this.audioLevel.textContent = '🔇 0dB';
        this.audioLevel.style.color = '#666';
    }
}

// 녹음기 초기화
let meetingRecorder;

// DOM이 이미 로드되었는지 확인
if (document.readyState === 'loading') {
    // DOM이 아직 로딩 중이면 이벤트 대기
    document.addEventListener('DOMContentLoaded', initRecorder);
} else {
    // DOM이 이미 로드되었으면 즉시 초기화
    initRecorder();
}

function initRecorder() {
    console.log('🔧 [RECORDER] 초기화 시작 - document.readyState:', document.readyState);
    try {
        meetingRecorder = new MeetingRecorder();
        console.log('✅ [RECORDER] 회의 녹음 기능 준비 완료');
    } catch (error) {
        console.error('❌ [RECORDER] 초기화 실패:', error);
        console.error('❌ [RECORDER] 에러 스택:', error.stack);
    }
}
