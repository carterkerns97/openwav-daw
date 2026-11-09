const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

const isDevelopment = Boolean(process.env.OPENWAVE_DEV_URL);
const recentProjectsPath = () =>
  path.join(app.getPath('userData'), 'recent-projects.json');
const recoveryPath = () =>
  path.join(app.getPath('userData'), 'recovery.openwave');
let mainWindow;

async function readRecentProjects() {
  try {
    return JSON.parse(await fs.readFile(recentProjectsPath(), 'utf8'));
  } catch {
    return [];
  }
}

async function rememberProject(filePath) {
  const recent = await readRecentProjects();
  const next = [filePath, ...recent.filter((item) => item !== filePath)].slice(
    0,
    10,
  );
  await fs.writeFile(recentProjectsPath(), JSON.stringify(next), 'utf8');
  return next;
}

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
  mainWindow = window;

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
  await rememberProject(filePath);
  return { filePath, contents: await fs.readFile(filePath, 'utf8') };
});

ipcMain.handle('project:save', async (_event, payload) => {
  let filePath = payload?.filePath;
  if (!filePath || payload?.saveAs) {
    const result = await dialog.showSaveDialog({
      title: 'Save Openwave Project',
      defaultPath: filePath || payload?.suggestedName || 'Untitled.openwave',
      filters: [{ name: 'Openwave Project', extensions: ['openwave'] }],
    });
    if (result.canceled || !result.filePath) return null;
    filePath = result.filePath;
  }
  await fs.writeFile(filePath, payload?.contents || '{}', 'utf8');
  await rememberProject(filePath);
  await fs.rm(recoveryPath(), { force: true });
  return { filePath };
});

ipcMain.handle('project:autosave', async (_event, contents) => {
  await fs.writeFile(recoveryPath(), contents || '{}', 'utf8');
  return true;
});

ipcMain.handle('project:recovery', async () => {
  try {
    return await fs.readFile(recoveryPath(), 'utf8');
  } catch {
    return null;
  }
});

ipcMain.handle('project:clear-recovery', async () => {
  await fs.rm(recoveryPath(), { force: true });
  return true;
});

ipcMain.handle('project:recent', readRecentProjects);

app.whenReady().then(() => {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'File',
        submenu: [
          {
            label: 'Open…',
            accelerator: 'CmdOrCtrl+O',
            click: () => mainWindow?.webContents.send('menu:open'),
          },
          {
            label: 'Save',
            accelerator: 'CmdOrCtrl+S',
            click: () => mainWindow?.webContents.send('menu:save'),
          },
          {
            label: 'Save As…',
            accelerator: 'CmdOrCtrl+Shift+S',
            click: () => mainWindow?.webContents.send('menu:save-as'),
          },
          { type: 'separator' },
          { role: 'close' },
          { role: 'quit' },
        ],
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
