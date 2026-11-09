const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('openwaveDesktop', {
  isDesktop: true,
  platform: process.platform,
  openProject: () => ipcRenderer.invoke('project:open'),
  saveProject: (payload) => ipcRenderer.invoke('project:save', payload),
  autosaveProject: (contents) =>
    ipcRenderer.invoke('project:autosave', contents),
  getRecovery: () => ipcRenderer.invoke('project:recovery'),
  clearRecovery: () => ipcRenderer.invoke('project:clear-recovery'),
  getRecentProjects: () => ipcRenderer.invoke('project:recent'),
  onMenuAction: (callback) => {
    const channels = ['menu:open', 'menu:save', 'menu:save-as'];
    const listeners = channels.map((channel) => {
      const listener = () => callback(channel.replace('menu:', ''));
      ipcRenderer.on(channel, listener);
      return [channel, listener];
    });
    return () =>
      listeners.forEach(([channel, listener]) =>
        ipcRenderer.removeListener(channel, listener),
      );
  },
});
