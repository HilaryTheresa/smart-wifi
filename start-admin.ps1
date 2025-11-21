# Smart WiFi Manager - PowerShell管理员启动器
param([switch]$AsAdmin)

# 设置控制台标题和编码
$Host.UI.RawUI.WindowTitle = "Smart WiFi Manager - 启动器"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  Smart WiFi Manager - PowerShell启动器" -ForegroundColor Cyan  
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否以管理员身份运行
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[!] 需要管理员权限来管理WiFi连接" -ForegroundColor Yellow
    Write-Host "[→] 正在请求管理员权限..." -ForegroundColor Green
    Write-Host "    请在UAC提示窗口中点击'是'" -ForegroundColor Gray
    Write-Host ""
    
    try {
        # 以管理员身份重新启动当前脚本
        Start-Process PowerShell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -AsAdmin" -Verb RunAs -Wait
        exit
    }
    catch {
        Write-Host "[✗] 无法获取管理员权限" -ForegroundColor Red
        Write-Host "    错误: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "请手动以管理员身份运行PowerShell，然后执行：" -ForegroundColor Yellow
        Write-Host "    cd `"$PWD`"" -ForegroundColor White
        Write-Host "    npm start" -ForegroundColor White
        Write-Host ""
        Read-Host "按Enter键退出"
        exit 1
    }
}

Write-Host "[✓] 已具有管理员权限" -ForegroundColor Green
Write-Host "[→] 正在启动应用..." -ForegroundColor Green
Write-Host ""

# 检查npm是否可用
try {
    $npmVersion = npm --version 2>$null
    if (-not $npmVersion) {
        throw "npm未找到"
    }
    Write-Host "[✓] npm版本: $npmVersion" -ForegroundColor Green
}
catch {
    Write-Host "[✗] npm未安装或不在PATH中" -ForegroundColor Red
    Write-Host "    请确保Node.js已正确安装" -ForegroundColor Yellow
    Read-Host "按Enter键退出"
    exit 1
}

# 检查是否在项目目录中
if (-not (Test-Path "package.json")) {
    Write-Host "[✗] 未找到package.json文件" -ForegroundColor Red
    Write-Host "    请确保在正确的项目目录中运行此脚本" -ForegroundColor Yellow
    Read-Host "按Enter键退出"
    exit 1
}

# 启动应用
try {
    Write-Host "[→] 启动Smart WiFi Manager..." -ForegroundColor Cyan
    Write-Host ""
    
    # 设置环境变量以显示详细错误
    $env:ELECTRON_ENABLE_LOGGING = "1"
    
    # 启动应用
    & npm start
    
    if ($LASTEXITCODE -ne 0) {
        throw "应用启动失败，退出代码: $LASTEXITCODE"
    }
}
catch {
    Write-Host ""
    Write-Host "[✗] 应用启动失败" -ForegroundColor Red
    Write-Host "    错误: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "常见解决方案：" -ForegroundColor Yellow
    Write-Host "1. 运行 'npm install' 重新安装依赖" -ForegroundColor White
    Write-Host "2. 检查Node.js版本是否符合要求 (>=16.0)" -ForegroundColor White
    Write-Host "3. 确保没有其他Electron应用正在运行" -ForegroundColor White
    Write-Host ""
    Read-Host "按Enter键退出"
    exit 1
}
