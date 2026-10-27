import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = Object.freeze({
  isDesktop: true,
  platform: process.platform,
  getDesktopSettings: () => ipcRenderer.invoke('desktop:get-settings'),
  setNativeNotificationsEnabled: (enabled: boolean) =>
    ipcRenderer.invoke('desktop:set-notifications-enabled', enabled),
  notifyStepCompleted: () => ipcRenderer.send('desktop:step-completed'),
});

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
