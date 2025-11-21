@echo off
title Smart WiFi Manager - 管理员启动器
echo =======================================
echo   Smart WiFi Manager - 管理员启动器
echo =======================================
echo.

:: 检查是否已经是管理员权限
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] 已具有管理员权限
    echo [→] 正在启动应用...
    echo.
    npm start
    if %errorLevel% neq 0 (
        echo.
        echo [✗] 应用启动失败，请检查错误信息
        pause
    )
) else (
    echo [!] 需要管理员权限来管理WiFi连接
    echo [→] 正在请求管理员权限...
    echo     请在UAC提示窗口中点击"是"
    echo.
    
    :: 使用更可靠的方式启动
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c cd /d \"%cd%\" && npm start && echo. && echo 按任意键关闭窗口... && pause' -Verb RunAs -WindowStyle Normal"
    
    if %errorLevel% neq 0 (
        echo.
        echo [✗] 无法获取管理员权限或启动失败
        echo     请手动以管理员身份运行PowerShell，然后执行：
        echo     cd "%cd%"
        echo     npm start
        echo.
        pause
    )
)

