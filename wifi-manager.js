const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

class WiFiManager {
  constructor(dataDir = null) {
    // 如果提供了数据目录路径，使用它；否则使用当前目录（开发环境）
    const baseDir = dataDir || __dirname;
    this.favoritesFile = path.join(baseDir, 'favorites.json');
    this.currentConnectionFile = path.join(baseDir, 'current-connection.json');
    
    // 确保数据目录存在
    if (dataDir && !fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    this.loadFavorites();
    this.loadCurrentConnection();
  }

  // 加载当前连接记录
  loadCurrentConnection() {
    try {
      if (fs.existsSync(this.currentConnectionFile)) {
        const data = fs.readFileSync(this.currentConnectionFile, 'utf8');
        this.lastKnownConnection = JSON.parse(data);
      } else {
        this.lastKnownConnection = null;
      }
    } catch (error) {
      console.error('加载当前连接记录失败:', error);
      this.lastKnownConnection = null;
    }
  }

  // 保存当前连接记录
  saveCurrentConnection(connectionInfo) {
    try {
      fs.writeFileSync(this.currentConnectionFile, JSON.stringify(connectionInfo, null, 2));
      this.lastKnownConnection = connectionInfo;
    } catch (error) {
      console.error('保存当前连接记录失败:', error);
    }
  }

  // 加载收藏夹
  loadFavorites() {
    try {
      if (fs.existsSync(this.favoritesFile)) {
        const data = fs.readFileSync(this.favoritesFile, 'utf8');
        this.favorites = JSON.parse(data);
      } else {
        this.favorites = [];
      }
    } catch (error) {
      console.error('加载收藏夹失败:', error);
      this.favorites = [];
    }
  }

  // 保存收藏夹
  saveFavorites() {
    try {
      fs.writeFileSync(this.favoritesFile, JSON.stringify(this.favorites, null, 2));
    } catch (error) {
      console.error('保存收藏夹失败:', error);
    }
  }

  // 获取WiFi列表（无需位置权限版本）
  // 简化版WiFi列表获取（只返回已保存网络基本信息）
  async getWiFiList() {
    try {
      console.log('获取已保存的WiFi配置...');
      
      const { stdout } = await execAsync('netsh wlan show profiles');
      const profiles = this.parseProfiles(stdout);
      
      console.log('解析到', profiles.length, '个已保存网络');
      
      // 返回简化的网络列表（无信号强度等复杂信息）
      return profiles.map(profile => ({
        ssid: profile.ssid,
        saved: true
      }));
      
    } catch (error) {
      console.error('获取WiFi列表失败:', error);
      return [];
    }
  }

  // 解析已保存的配置文件
  parseProfiles(stdout) {
    const profiles = [];
    const lines = stdout.split('\n');
    
    for (const line of lines) {
      // 支持中英文系统
      const match = line.match(/(?:所有用户配置文件|All User Profile)\s*:\s*(.+)/) ||
                   line.match(/Profile\s*:\s*(.+)/);
      if (match) {
        const ssid = match[1].trim();
        if (ssid && ssid !== '' && ssid !== 'Profile') {
          profiles.push({
            ssid: ssid,
            saved: true
          });
        }
      }
    }
    
    return profiles;
  }


  // 获取当前连接的WiFi（使用PowerShell，无需位置权限）
  async getCurrentWiFi() {
    try {
      console.log('使用PowerShell获取当前WiFi连接状态（无需位置权限）...');
      
      // 使用优化的PowerShell命令获取当前网络连接（增加超时控制）
      const { stdout } = await execAsync('powershell -Command "Get-NetConnectionProfile | Where-Object {$_.InterfaceAlias -eq \'WLAN\' -or $_.InterfaceAlias -like \'*Wi-Fi*\'} | Select-Object Name,InterfaceAlias"', {
        timeout: 5000 // 5秒超时
      });
      console.log('PowerShell查询结果:', stdout);
      
      const lines = stdout.split('\n').map(line => line.trim()).filter(line => line);
      let currentSSID = null;
      
      // 解析PowerShell输出
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 跳过表头
        if (line.includes('Name') && line.includes('InterfaceAlias')) {
          continue;
        }
        if (line.includes('----')) {
          continue;
        }
        
        // 查找包含WLAN或Wi-Fi的行
        if (line.includes('WLAN') || line.includes('Wi-Fi')) {
          // 提取网络名称（在InterfaceAlias之前的部分）
          const parts = line.split(/\s+/);
          if (parts.length >= 2) {
            // 网络名称可能包含空格，所以要重新组合
            const interfaceIndex = parts.findIndex(p => p === 'WLAN' || p.includes('Wi-Fi'));
            if (interfaceIndex > 0) {
              currentSSID = parts.slice(0, interfaceIndex).join(' ');
              console.log('从PowerShell获取到的SSID:', currentSSID);
              break;
            }
          }
        }
      }
      
      // 如果PowerShell方法没有获取到SSID，尝试备用方法
      if (!currentSSID) {
        console.log('PowerShell方法未获取到SSID，尝试检查WiFi适配器状态...');
        
        // 检查WiFi适配器是否连接
        const wifiConnected = await this.checkWiFiAdapterConnected();
        if (!wifiConnected) {
          console.log('WiFi适配器未连接');
          return null;
        }
        
        // 使用保存的连接记录
        if (this.lastKnownConnection) {
          console.log('使用已保存的连接记录:', this.lastKnownConnection);
          
          const now = Date.now();
          const connectionTime = this.lastKnownConnection.timestamp || 0;
          const timeDiff = now - connectionTime;
          
          // 连接记录在10分钟内认为有效
          if (timeDiff < 10 * 60 * 1000) {
            return {
              ssid: this.lastKnownConnection.ssid,
              signal: this.lastKnownConnection.signal || 75,
              state: '已连接'
            };
          } else {
            console.log('连接记录过期，清除记录');
            this.lastKnownConnection = null;
            this.saveCurrentConnection(null);
          }
        }
        
        // 如果没有记录，返回通用状态
        return {
          ssid: '已连接网络',
          signal: 75,
          state: '已连接'
        };
      }
      
      // 清理SSID名称（移除数字后缀等）
      const cleanSSID = this.cleanSSIDName(currentSSID);
      
      // 获取信号强度（如果可能的话）
      let signalStrength = 75; // 默认值
      
      return {
        ssid: cleanSSID,
        signal: signalStrength,
        state: '已连接'
      };
      
    } catch (error) {
      console.error('获取当前WiFi失败:', error);
      
      // 发生错误时，仍然检查是否有WiFi连接
      try {
        const wifiConnected = await this.checkWiFiAdapterConnected();
        if (wifiConnected && this.lastKnownConnection) {
          console.log('错误时使用备用连接记录');
          return {
            ssid: this.lastKnownConnection.ssid,
            signal: this.lastKnownConnection.signal || 75,
            state: '已连接'
          };
        }
      } catch (backupError) {
        console.error('备用检查也失败:', backupError);
      }
      
      return null;
    }
  }

  // 简化的SSID名称清理
  cleanSSIDName(ssid) {
    if (!ssid) return ssid;
    return ssid.replace(/\s+\d+$/, '').trim();
  }

  // 简化的网络连通性验证
  async verifyNetworkConnectivity() {
    try {
      const { stdout } = await execAsync('ping -n 1 -w 2000 8.8.8.8', {
        timeout: 4000
      });
      return stdout.includes('TTL=') || stdout.includes('Reply from');
    } catch (error) {
      console.error('网络连通性测试失败:', error);
      return false;
    }
  }


  // 连接到指定WiFi
  async connectToWiFi(ssid, password = '') {
    try {
      console.log(`开始连接WiFi: ${ssid}`, password ? '(有密码)' : '(开放网络)');
      
      let command;
      if (password) {
        // 如果有密码，先创建配置文件
        console.log('创建WiFi配置文件...');
        const profileXml = this.createWiFiProfile(ssid, password);
        const tempProfile = path.join(__dirname, 'temp_profile.xml');
        fs.writeFileSync(tempProfile, profileXml);
        
        try {
          await execAsync(`netsh wlan add profile filename="${tempProfile}"`);
          console.log('配置文件创建成功');
        } catch (profileError) {
          console.log('配置文件创建失败，可能已存在:', profileError.message);
        } finally {
          // 删除临时文件
          if (fs.existsSync(tempProfile)) {
            fs.unlinkSync(tempProfile);
          }
        }
        
        command = `netsh wlan connect name="${ssid}"`;
      } else {
        // 开放网络直接连接
        command = `netsh wlan connect name="${ssid}"`;
      }
      
      console.log('执行连接命令:', command);
      const { stdout } = await execAsync(command);
      console.log('连接命令输出:', stdout);
      
      // 等待连接状态，优化等待时间
      console.log('等待连接完成...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // 从5秒减少到2秒
      
      // 简化的连接状态检查
      let connectionSuccess = false;
      
      // 保存连接记录
      this.saveCurrentConnection({
        ssid: ssid,
        signal: 75,
        timestamp: Date.now()
      });
      
      // 检查连接状态（最多3次）
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`第${attempt}次检查连接状态...`);
        
        const currentWifi = await this.getCurrentWiFi();
        
        if (currentWifi && currentWifi.ssid) {
          const cleanCurrent = this.cleanSSIDName(currentWifi.ssid);
          if (cleanCurrent === ssid || cleanCurrent.includes(ssid)) {
            connectionSuccess = true;
            console.log('连接验证成功!');
            break;
          }
        }
        
        // 如果不是最后一次尝试，等待一段时间
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      
      // 如果状态检查失败，使用网络连通性验证
      if (!connectionSuccess) {
        console.log('使用网络连通性验证...');
        connectionSuccess = await this.verifyNetworkConnectivity();
      }
      
      console.log('最终连接结果:', connectionSuccess);
      
      if (!connectionSuccess) {
        // 连接失败，清除连接记录
        this.saveCurrentConnection(null);
      }
      
      return {
        success: connectionSuccess,
        message: connectionSuccess ? '连接成功' : '连接失败，请检查密码或网络可用性'
      };
    } catch (error) {
      console.error('连接WiFi失败:', error);
      return {
        success: false,
        message: `连接失败: ${error.message}`
      };
    }
  }

  // 创建WiFi配置文件XML
  createWiFiProfile(ssid, password) {
    return `<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
  <name>${ssid}</name>
  <SSIDConfig>
    <SSID>
      <name>${ssid}</name>
    </SSID>
  </SSIDConfig>
  <connectionType>ESS</connectionType>
  <connectionMode>auto</connectionMode>
  <MSM>
    <security>
      <authEncryption>
        <authentication>WPA2PSK</authentication>
        <encryption>AES</encryption>
        <useOneX>false</useOneX>
      </authEncryption>
      <sharedKey>
        <keyType>passPhrase</keyType>
        <protected>false</protected>
        <keyMaterial>${password}</keyMaterial>
      </sharedKey>
    </security>
  </MSM>
</WLANProfile>`;
  }

  // 断开WiFi连接
  async disconnectWiFi() {
    try {
      await execAsync('netsh wlan disconnect');
      
      // 断开成功后清除连接记录
      this.saveCurrentConnection(null);
      console.log('已清除连接记录');
      
      return {
        success: true,
        message: '已断开连接'
      };
    } catch (error) {
      console.error('断开WiFi失败:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // 获取已保存的网络
  async getSavedNetworks() {
    try {
      const { stdout } = await execAsync('netsh wlan show profiles');
      return this.parseProfiles(stdout);
    } catch (error) {
      console.error('获取已保存网络失败:', error);
      return [];
    }
  }

  // 删除网络配置
  async forgetNetwork(ssid) {
    try {
      await execAsync(`netsh wlan delete profile name="${ssid}"`);
      return {
        success: true,
        message: '网络已删除'
      };
    } catch (error) {
      console.error('删除网络失败:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // 获取收藏夹
  async getFavorites() {
    return this.favorites;
  }

  // 添加到收藏夹
  async addToFavorites(ssid) {
    try {
      if (!this.favorites.includes(ssid)) {
        this.favorites.push(ssid);
        this.saveFavorites();
      }
      return {
        success: true,
        message: '已添加到收藏夹'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  // 从收藏夹移除
  async removeFromFavorites(ssid) {
    try {
      const index = this.favorites.indexOf(ssid);
      if (index > -1) {
        this.favorites.splice(index, 1);
        this.saveFavorites();
      }
      return {
        success: true,
        message: '已从收藏夹移除'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = WiFiManager;


