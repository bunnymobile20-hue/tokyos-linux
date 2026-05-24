const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Tokio',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the local server
  mainWindow.loadURL('http://127.0.0.1:3002');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', () => {
  // Start backend
  const backendDir = path.join(__dirname, '../backend');
  
  backendProcess = spawn('npm', ['run', 'start'], {
    cwd: backendDir,
    shell: true,
    env: { ...process.env, PORT: '3002' }
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });

  // Wait 3 seconds for server to start before creating window
  setTimeout(createWindow, 3000);
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
