const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function createWin() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 开发环境：加载 HBuilderX 输出目录
  const devIndex = path.join(
    __dirname,
    '..', 'hello', 'HelloWorld', 'unpackage', 'dist', 'build', 'web', 'index.html'
  );

  if (fs.existsSync(devIndex)) {
    win.loadFile(devIndex);             // 开发期
    // win.webContents.openDevTools();  // 需要可打开调试
  } else {
    const prodIndex = path.join(__dirname, 'app', 'index.html');
    win.loadFile(prodIndex);            // 打包后
  }

  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(createWin);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWin(); });
