const { app, BrowserWindow, ipcMain, globalShortcut, Menu, Tray, dialog } = require('electron');
const path = require('path');
const WiFiManager = require('./wifi-manager');

let mainWindow;
let tray = null;
let wifiManager;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 500,
    minWidth: 350,
    minHeight: 400,
    show: false,
    frame: false,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.ico')
  });

  mainWindow.loadFile('index.html');

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 窗口关闭时隐藏到系统托盘而不是退出
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'icon.ico'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主界面',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: '刷新WiFi列表',
      click: async () => {
        if (mainWindow) {
          mainWindow.webContents.send('refresh-wifi-list');
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Smart WiFi Manager');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  // 初始化WiFi管理器，使用用户数据目录保存配置文件
  const userDataPath = app.getPath('userData');
  wifiManager = new WiFiManager(userDataPath);
  
  createWindow();
  createTray();
  
  // 开发模式下打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
  
  // 注册全局快捷键 Alt+W
  const ret = globalShortcut.register('Alt+W', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
  
  if (!ret) {
    console.log('快捷键注册失败');
  }
});

app.on('window-all-closed', () => {
  // 在macOS上保持应用运行
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  // 注销快捷键
  globalShortcut.unregisterAll();
});

// IPC处理程序
ipcMain.handle('get-wifi-list', async () => {
  try {
    return await wifiManager.getWiFiList();
  } catch (error) {
    console.error('获取WiFi列表失败:', error);
    return [];
  }
});

ipcMain.handle('get-current-wifi', async () => {
  try {
    return await wifiManager.getCurrentWiFi();
  } catch (error) {
    console.error('获取当前WiFi失败:', error);
    return null;
  }
});

ipcMain.handle('connect-wifi', async (event, ssid, password) => {
  try {
    return await wifiManager.connectToWiFi(ssid, password);
  } catch (error) {
    console.error('连接WiFi失败:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('disconnect-wifi', async () => {
  try {
    return await wifiManager.disconnectWiFi();
  } catch (error) {
    console.error('断开WiFi失败:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('get-saved-networks', async () => {
  try {
    return await wifiManager.getSavedNetworks();
  } catch (error) {
    console.error('获取已保存网络失败:', error);
    return [];
  }
});

ipcMain.handle('forget-network', async (event, ssid) => {
  try {
    return await wifiManager.forgetNetwork(ssid);
  } catch (error) {
    console.error('删除网络失败:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('get-favorites', async () => {
  try {
    return await wifiManager.getFavorites();
  } catch (error) {
    console.error('获取收藏夹失败:', error);
    return [];
  }
});

ipcMain.handle('add-to-favorites', async (event, ssid) => {
  try {
    return await wifiManager.addToFavorites(ssid);
  } catch (error) {
    console.error('添加到收藏夹失败:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('remove-from-favorites', async (event, ssid) => {
  try {
    return await wifiManager.removeFromFavorites(ssid);
  } catch (error) {
    console.error('从收藏夹移除失败:', error);
    return { success: false, message: error.message };
  }
});

// 窗口控制
ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle('show-error-dialog', async (event, title, content) => {
  return dialog.showErrorBox(title, content);
});

ipcMain.handle('show-info-dialog', async (event, title, content) => {
  return dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: title,
    message: content,
    buttons: ['确定']
  });
});

