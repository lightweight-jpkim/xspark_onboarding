// Electron용 회의 녹음 기능 (시스템 오디오 캡처)
class MeetingRecorderElectron extends MeetingRecorder {
    async startRecording() {
        try {
            // Electron 환경 확인
            if (!window.electronAPI || !window.electronAPI.isElectron) {
                console.warn('⚠️ Electron 환경이 아닙니다. 일반 녹음 모드로 전환합니다.');
                return super.startRecording();
            }

            console.log('✅ Electron 환경 감지 - 시스템 오디오 캡처 모드');

            // 1. 마이크 스트림
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // 2. 시스템 오디오 소스 목록 가져오기
            const sources = await window.electronAPI.getSystemAudioSources();
            console.log(`📺 ${sources.length}개의 오디오 소스 발견`);

            if (sources.length === 0) {
                throw new Error('캡처 가능한 오디오 소스가 없습니다');
            }

            // 3. 사용자에게 소스 선택하도록 UI 표시 (간단 버전: 첫 번째 화면 자동 선택)
            // TODO: 나중에 모달 UI로 개선
            const selectedSource = sources[0]; // 첫 번째 화면 선택
            console.log(`🎯 선택된 소스: ${selectedSource.name}`);

            // 4. desktopCapturer constraint 생성
            const systemStream = await navigator.mediaDevices.getUserMedia({
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

            // 5. 오디오 믹싱
            const audioContext = new AudioContext();
            const destination = audioContext.createMediaStreamDestination();

            // 오디오 분석기
            this.analyser = audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;

            // 마이크 소스
            const micSource = audioContext.createMediaStreamSource(micStream);
            const micGain = audioContext.createGain();
            micGain.gain.value = 1.0;
            micSource.connect(micGain);
            micGain.connect(destination);
            micGain.connect(this.analyser);

            // 시스템 오디오 소스
            const systemSource = audioContext.createMediaStreamSource(systemStream);
            const systemGain = audioContext.createGain();
            systemGain.gain.value = 1.0;
            systemSource.connect(systemGain);
            systemGain.connect(destination);
            systemGain.connect(this.analyser);

            console.log('🎵 마이크 + 시스템 오디오 믹싱 완료');

            // 6. MediaRecorder 설정
            this.mediaRecorder = new MediaRecorder(destination.stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            this.audioChunks = [];
            this.micStream = micStream;
            this.systemStream = systemStream;
            this.audioContext = audioContext;

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                await this.processRecording();
            };

            // 7. 녹음 시작
            this.mediaRecorder.start(1000); // 1초마다 데이터 수집
            this.startTime = Date.now();

            // 8. UI 업데이트
            this.startBtn.style.display = 'none';
            this.stopBtn.style.display = 'flex';
            this.recordingStatus.style.display = 'flex';
            this.audioVisualizer.style.display = 'block';

            // 타이머 및 모니터링 시작
            this.timerInterval = setInterval(() => this.updateTimer(), 1000);
            this.startAudioMonitoring();

            console.log('🎤 Electron 녹음 시작 (시스템 오디오 포함)');

        } catch (error) {
            console.error('Electron 녹음 시작 실패:', error);
            alert(`녹음 시작 실패: ${error.message}\n\n시스템 환경설정에서 화면 녹화 및 마이크 권한을 확인해주세요.`);
        }
    }
}

// Electron 환경이면 Electron 버전 사용
let meetingRecorder;
window.addEventListener('DOMContentLoaded', () => {
    if (window.electronAPI && window.electronAPI.isElectron) {
        console.log('🖥️ Electron 환경: 시스템 오디오 캡처 활성화');
        meetingRecorder = new MeetingRecorderElectron();
    } else {
        console.log('🌐 브라우저 환경: 일반 녹음 모드');
        meetingRecorder = new MeetingRecorder();
    }
    console.log('📝 회의 녹음 기능 준비 완료');
});
