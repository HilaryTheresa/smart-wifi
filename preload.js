const { contextBridge, ipcRenderer } = require('electron');

// 向渲染进程暴露安全的API
contextBridge.exposeInMainWorld('electronAPI', {
  // WiFi相关操作
  getWiFiList: () => ipcRenderer.invoke('get-wifi-list'),
  getCurrentWiFi: () => ipcRenderer.invoke('get-current-wifi'),
  connectWiFi: (ssid, password) => ipcRenderer.invoke('connect-wifi', ssid, password),
  disconnectWiFi: () => ipcRenderer.invoke('disconnect-wifi'),
  getSavedNetworks: () => ipcRenderer.invoke('get-saved-networks'),
  forgetNetwork: (ssid) => ipcRenderer.invoke('forget-network', ssid),
  
  // 收藏夹操作
  getFavorites: () => ipcRenderer.invoke('get-favorites'),
  addToFavorites: (ssid) => ipcRenderer.invoke('add-to-favorites', ssid),
  removeFromFavorites: (ssid) => ipcRenderer.invoke('remove-from-favorites', ssid),
  
  // 窗口控制
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // 对话框
  showErrorDialog: (title, content) => ipcRenderer.invoke('show-error-dialog', title, content),
  showInfoDialog: (title, content) => ipcRenderer.invoke('show-info-dialog', title, content),
  
  // 事件监听
  onRefreshWiFiList: (callback) => {
    ipcRenderer.on('refresh-wifi-list', callback);
  },
  
  // 移除监听器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

