// 应用数据
let savedNetworks = [];
let favorites = [];
let currentSSID = '';

// DOM元素
const elements = {
    favoritesContainer: document.getElementById('favoritesContainer'),
    networksList: document.getElementById('networksList'),
    refreshBtn: document.getElementById('refreshBtn'),
    minimizeBtn: document.getElementById('minimizeBtn'),
    closeBtn: document.getElementById('closeBtn'),
    connectModal: document.getElementById('connectModal'),
    connectSSID: document.getElementById('connectSSID'),
    passwordInput: document.getElementById('passwordInput'),
    confirmConnect: document.getElementById('confirmConnect'),
    cancelConnect: document.getElementById('cancelConnect'),
    toastContainer: document.getElementById('toastContainer')
};

// 初始化应用
async function initApp() {
    setupEventListeners();
    await loadData();
}

// 设置事件监听器
function setupEventListeners() {
    elements.refreshBtn.addEventListener('click', handleRefresh);
    elements.minimizeBtn.addEventListener('click', handleMinimize);
    elements.closeBtn.addEventListener('click', handleClose);
    elements.confirmConnect.addEventListener('click', handleConnect);
    elements.cancelConnect.addEventListener('click', closeModal);
    
    // 模态框背景点击关闭
    elements.connectModal.addEventListener('click', (e) => {
        if (e.target === elements.connectModal) {
            closeModal();
        }
    });
    
    // 键盘事件
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
        if (e.key === 'Enter' && elements.connectModal.classList.contains('show')) {
            handleConnect();
        }
        if (e.key === 'F5') {
            e.preventDefault();
            handleRefresh();
        }
    });
    
    // 监听主进程事件
    window.electronAPI.onRefreshWiFiList(() => {
        loadData();
    });
}

// 加载数据
async function loadData() {
    try {
        showLoading('正在加载...');
        
        // 并行加载数据
        const [wifiData, favoritesData, currentWifi] = await Promise.all([
            window.electronAPI.getWiFiList(),
            window.electronAPI.getFavorites(),
            window.electronAPI.getCurrentWiFi()
        ]);
        
        savedNetworks = wifiData.filter(wifi => wifi.saved);
        favorites = favoritesData || [];
        // 清理当前WiFi的SSID名称，确保与收藏列表匹配
        currentSSID = currentWifi ? cleanSSIDName(currentWifi.ssid) : '';
        
        updateUI();
        hideLoading();
        
    } catch (error) {
        console.error('加载数据失败:', error);
        showToast('加载数据失败', 'error');
        hideLoading();
    }
}

// 更新界面
function updateUI() {
    updateFavorites();
    updateNetworksList();
}

// 更新收藏栏
function updateFavorites() {
    const container = elements.favoritesContainer;
    
    if (favorites.length === 0) {
        container.innerHTML = '<div class="empty-message">暂无收藏</div>';
        return;
    }
    
    container.innerHTML = favorites.map(ssid => `
        <div class="favorite-item ${ssid === currentSSID ? 'current' : ''}" 
             data-ssid="${ssid}" onclick="connectToNetwork('${ssid}')">
            ${ssid}
            <button class="remove-btn" onclick="removeFavorite('${ssid}', event)">×</button>
        </div>
    `).join('');
}

// 更新网络列表
function updateNetworksList() {
    const container = elements.networksList;
    
    if (savedNetworks.length === 0) {
        container.innerHTML = '<div class="empty-message">无已保存网络</div>';
        return;
    }
    
    container.innerHTML = savedNetworks.map(network => `
        <div class="network-item ${network.ssid === currentSSID ? 'current' : ''}" 
             onclick="connectToNetwork('${network.ssid}')">
            <div class="network-info">
                <span class="network-name">${network.ssid}</span>
            </div>
            <div class="network-actions">
                ${favorites.includes(network.ssid) ? 
                    `<button class="btn-small favorite" onclick="removeFavorite('${network.ssid}', event)">★</button>` :
                    `<button class="btn-small" onclick="addToFavorites('${network.ssid}', event)">☆</button>`
                }
                <button class="btn-small danger" onclick="forgetNetwork('${network.ssid}', event)">删除</button>
            </div>
        </div>
    `).join('');
}

// 连接到网络（已保存的网络直接连接，无需输入密码）
function connectToNetwork(ssid) {
    if (ssid === currentSSID) {
        showToast('已连接到该网络', 'info');
        return;
    }
    
    // 直接连接已保存的网络
    connectDirectly(ssid);
}

// 直接连接到已保存的网络
async function connectDirectly(ssid) {
    showToast('正在连接...', 'info');
    
    try {
        // 对于已保存的网络，使用空密码连接
        const result = await window.electronAPI.connectWiFi(ssid, '');
        
        if (result.success) {
            showToast('连接成功', 'success');
            currentSSID = cleanSSIDName(ssid);
            updateUI();
        } else {
            // 如果直接连接失败，可能需要重新输入密码
            showToast('连接失败，请重新输入密码', 'error');
            showConnectModal(ssid);
        }
        
    } catch (error) {
        console.error('连接失败:', error);
        showToast('连接失败，请重新输入密码', 'error');
        showConnectModal(ssid);
    }
}

// 显示连接弹窗
function showConnectModal(ssid) {
    elements.connectSSID.textContent = ssid;
    elements.passwordInput.value = '';
    elements.connectModal.classList.add('show');
    elements.passwordInput.focus();
}

// 关闭弹窗
function closeModal() {
    elements.connectModal.classList.remove('show');
}

// 处理连接
async function handleConnect() {
    const ssid = elements.connectSSID.textContent;
    const password = elements.passwordInput.value;
    
    if (!password.trim()) {
        showToast('请输入密码', 'error');
        return;
    }
    
    closeModal();
    showToast('正在连接...', 'info');
    
    try {
        const result = await window.electronAPI.connectWiFi(ssid, password);
        
        if (result.success) {
            showToast('连接成功', 'success');
            currentSSID = cleanSSIDName(ssid);
            updateUI();
        } else {
            showToast(result.message || '连接失败', 'error');
        }
        
    } catch (error) {
        console.error('连接失败:', error);
        showToast('连接失败', 'error');
    }
}

// 添加到收藏
async function addToFavorites(ssid, event) {
    event.stopPropagation();
    
    try {
        await window.electronAPI.addToFavorites(ssid);
        favorites.push(ssid);
        updateUI();
        showToast('已添加到收藏', 'success');
        
    } catch (error) {
        console.error('添加收藏失败:', error);
        showToast('添加收藏失败', 'error');
    }
}

// 移除收藏
async function removeFavorite(ssid, event) {
    event.stopPropagation();
    
    try {
        await window.electronAPI.removeFromFavorites(ssid);
        favorites = favorites.filter(fav => fav !== ssid);
        updateUI();
        showToast('已移除收藏', 'success');
        
    } catch (error) {
        console.error('移除收藏失败:', error);
        showToast('移除收藏失败', 'error');
    }
}

// 删除网络
async function forgetNetwork(ssid, event) {
    event.stopPropagation();
    
    if (!confirm(`确定要删除网络 "${ssid}" 吗？`)) {
        return;
    }
    
    try {
        await window.electronAPI.forgetNetwork(ssid);
        savedNetworks = savedNetworks.filter(net => net.ssid !== ssid);
        favorites = favorites.filter(fav => fav !== ssid);
        updateUI();
        showToast('网络已删除', 'success');
        
    } catch (error) {
        console.error('删除网络失败:', error);
        showToast('删除网络失败', 'error');
    }
}

// 刷新数据
async function handleRefresh() {
    elements.refreshBtn.style.transform = 'rotate(360deg)';
    await loadData();
    setTimeout(() => {
        elements.refreshBtn.style.transform = '';
    }, 500);
}

// 窗口控制函数
function handleMinimize() {
    window.electronAPI.minimizeWindow();
}

function handleClose() {
    window.electronAPI.closeWindow();
}

// 显示加载状态
function showLoading(message = '加载中...') {
    elements.networksList.innerHTML = `<div class="loading">${message}</div>`;
}

// 隐藏加载状态
function hideLoading() {
    // 加载状态会在updateUI中被替换
}

// Toast消息系统
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    elements.toastContainer.appendChild(toast);
    
    // 自动移除
    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }
}

// 辅助函数：清理SSID名称
function cleanSSIDName(ssid) {
    if (!ssid) return ssid;
    // 移除末尾的数字和空格（如 "BigFace-Wifi 259" -> "BigFace-Wifi"）
    return ssid.replace(/\s+\d+$/, '').trim();
}

// 启动应用
document.addEventListener('DOMContentLoaded', initApp);