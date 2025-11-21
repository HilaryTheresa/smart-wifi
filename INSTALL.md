# Smart WiFi Manager 安装指南

## 快速开始

### 1. 环境准备

确保你的系统满足以下要求：
- Windows 10 或更高版本
- Node.js 16.0 或更高版本
- 管理员权限

### 2. 权限说明

✅ **完全无需位置权限**: 本应用使用WMI查询和智能连接记录技术，完全不依赖需要位置权限的API，即使关闭Windows位置服务也能正常工作

⚠️ **需要管理员权限**: 连接和管理WiFi配置需要管理员权限

### 3. 安装 Node.js

如果尚未安装 Node.js：
1. 访问 [Node.js官网](https://nodejs.org/)
2. 下载并安装 LTS 版本
3. 验证安装：打开命令提示符运行 `node --version`

### 4. 安装项目依赖

在项目目录下打开命令提示符（建议使用管理员权限），运行：

```bash
npm install
```

### 5. 运行应用

#### 开发模式
```bash
# 方式一：直接运行
npm start

# 方式二：使用批处理文件（自动请求管理员权限）
run-as-admin.bat
```

#### 构建生产版本
```bash
# 构建Windows安装程序
npm run build:win

# 构建便携版本
npm run build:portable
```

构建完成后，安装包将位于 `dist` 目录中。

### 6. 创建应用图标

当前使用的是临时图标文件。为了获得更好的体验，请：

1. 使用在线工具（如 [ConvertICO](https://convertio.co/svg-ico/)）将 `icon.svg` 转换为 `icon.ico`
2. 将生成的 `.ico` 文件替换现有的 `icon.ico`
3. 图标建议包含以下尺寸：16x16, 32x32, 48x48, 256x256

## 常见问题

### Q: 应用启动后看不到WiFi列表
**A:** 
1. 确保以管理员权限运行应用
2. 应用只显示已保存的WiFi配置，不扫描可用网络
3. 如果没有已保存的网络，列表会显示为空

### Q: npm install 失败
**A:** 
1. 检查网络连接
2. 尝试使用国内镜像：`npm install --registry https://registry.npmmirror.com`
3. 清除缓存：`npm cache clean --force`

### Q: 构建失败
**A:** 
1. 确保所有依赖都已正确安装
2. 检查Node.js版本是否符合要求
3. 尝试删除 `node_modules` 文件夹后重新安装依赖

### Q: 应用无法连接WiFi
**A:** 
1. 确认WiFi密码正确
2. 检查WiFi网络是否可用
3. 尝试手动连接验证网络可用性

## 开发说明

### 项目结构
```
smart-wifi-manager/
├── main.js           # Electron主进程
├── renderer.js       # 渲染进程逻辑
├── preload.js        # 预加载脚本
├── wifi-manager.js   # WiFi管理模块
├── index.html        # 应用界面
├── style.css         # 样式文件
├── package.json      # 项目配置
├── README.md         # 使用说明
└── INSTALL.md        # 安装指南
```

### 调试模式

开发时可以打开调试工具：
1. 运行应用后按 `F12` 或 `Ctrl+Shift+I`
2. 在 Console 中查看错误信息
3. 在 Network 中监控网络请求

### 修改配置

主要配置项在 `package.json` 中：
- 应用名称：`productName`
- 版本号：`version`
- 构建配置：`build` 部分

## 技术支持

如果遇到问题：
1. 查看控制台错误信息
2. 检查 `README.md` 中的故障排除部分
3. 确保按照本安装指南的步骤操作

---

*祝你使用愉快！* 🚀

