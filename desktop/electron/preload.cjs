const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('openwaveDesktop', {
  isDesktop: true,
  platform: process.platform,
  openProject: () => ipcRenderer.invoke('project:open'),
  saveProject: (payload) => ipcRenderer.invoke('project:save', payload),
});
