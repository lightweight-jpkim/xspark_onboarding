// Electron Preload 스크립트 (보안 브리지)
const { contextBridge, ipcRenderer } = require('electron');

// 안전하게 렌더러 프로세스에 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 시스템 오디오 소스 가져오기
  getSystemAudioSources: () => ipcRenderer.invoke('get-system-audio-sources'),

  // Electron 환경 확인
  isElectron: true,

  // 플랫폼 정보
  platform: process.platform
});

console.log('✅ Electron preload 로드 완료');
