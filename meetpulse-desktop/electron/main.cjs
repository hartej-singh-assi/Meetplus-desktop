const { app, BrowserWindow, Menu, nativeImage, ipcMain, screen } = require('electron');
const path = require('path');

app.setName('meetpulse-desktop');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');

let mainWindow;

function createWindow() {
  const iconPath = path.resolve(__dirname, '../public/logo.png');
  const appIcon = nativeImage.createFromPath(iconPath);

  // Register default application menu with standard Edit actions so input text editing works
  const template = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'MeetPulse Desktop',
    backgroundColor: '#020617',
    icon: appIcon,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true,
  });

  // Set dock icon explicitly if API available
  if (app.dock && typeof app.dock.setIcon === 'function') {
    app.dock.setIcon(appIcon);
  }

  // Load the built desktop application directly from local file
  const indexPath = path.join(__dirname, '../dist/index.html');
  mainWindow.loadFile(indexPath);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Window Mode handler for floating mini card widget vs full desktop view
ipcMain.on('set-window-mode', (event, mode) => {
  if (!mainWindow) return;

  if (mode === 'mini-pill') {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { workArea } = primaryDisplay;
    mainWindow.setMinimumSize(270, 70);
    mainWindow.setSize(300, 82);
    // Position at top-right corner of the screen
    const x = workArea.x + workArea.width - 320;
    const y = workArea.y + 20;
    mainWindow.setPosition(x, y);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  } else if (mode === 'normal') {
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setMinimumSize(1024, 700);
    mainWindow.setSize(1280, 850);
    mainWindow.center();
  }
});


app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

