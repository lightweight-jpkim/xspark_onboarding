// Electron 메인 프로세스
const { app, BrowserWindow, ipcMain, desktopCapturer, systemPreferences } = require('electron');
const path = require('path');

let mainWindow;

// macOS 권한 요청
async function requestPermissions() {
  if (process.platform === 'darwin') {
    // 마이크 권한
    const micStatus = await systemPreferences.askForMediaAccess('microphone');
    console.log('🎤 마이크 권한:', micStatus);

    // 화면 녹화 권한 (시스템 오디오 포함)
    const screenStatus = await systemPreferences.getMediaAccessStatus('screen');
    console.log('🖥️ 화면 녹화 권한:', screenStatus);

    if (screenStatus !== 'granted') {
      console.warn('⚠️ 시스템 환경설정 > 보안 및 개인 정보 보호 > 화면 녹화에서 권한을 허용해주세요.');
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'xspark Onboarding - Desktop'
  });

  // 로컬 HTML 로드 (preload가 제대로 작동)
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // 개발 모드에서 DevTools 열기
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 시스템 오디오 소스 가져오기
ipcMain.handle('get-system-audio-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      fetchWindowIcons: false
    });

    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  } catch (error) {
    console.error('시스템 오디오 소스 가져오기 실패:', error);
    return [];
  }
});

// 앱 준비
app.whenReady().then(async () => {
  await requestPermissions();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
