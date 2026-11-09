const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

const isDevelopment = Boolean(process.env.OPENWAVE_DEV_URL);

function createWindow() {
  const window = new BrowserWindow({
    title: 'Openwave',
    width: 1500,
    height: 940,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#111416',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => window.show());

  if (isDevelopment) {
    void window.loadURL(process.env.OPENWAVE_DEV_URL);
  } else {
    void window.loadFile(
      path.join(
        __dirname,
        '..',
        '..',
        'desktop-dist',
        'renderer',
        'index.html',
      ),
    );
  }

  return window;
}

ipcMain.handle('project:open', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Open Openwave Project',
    properties: ['openFile'],
    filters: [{ name: 'Openwave Project', extensions: ['openwave'] }],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  return { filePath, contents: await fs.readFile(filePath, 'utf8') };
});

ipcMain.handle('project:save', async (_event, payload) => {
  const result = await dialog.showSaveDialog({
    title: 'Save Openwave Project',
    defaultPath: payload?.suggestedName || 'Untitled.openwave',
    filters: [{ name: 'Openwave Project', extensions: ['openwave'] }],
  });
  if (result.canceled || !result.filePath) return null;
  await fs.writeFile(result.filePath, payload?.contents || '{}', 'utf8');
  return { filePath: result.filePath };
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'File',
        submenu: [{ role: 'close' }, { type: 'separator' }, { role: 'quit' }],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { role: 'togglefullscreen' },
        ],
      },
    ]),
  );
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
