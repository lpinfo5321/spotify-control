@echo off
echo ====================================
echo   INSTALADOR DE FIREBASE CLI
echo ====================================
echo.

REM Verificar si Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no está instalado!
    echo.
    echo Por favor descarga e instala Node.js desde:
    echo https://nodejs.org/
    echo.
    pause
    start https://nodejs.org/
    exit /b 1
)

echo [OK] Node.js detectado
echo.

REM Instalar Firebase CLI
echo Instalando Firebase CLI...
echo.
call npm install -g firebase-tools

REM Verificar instalación
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Firebase CLI no se instaló correctamente
    pause
    exit /b 1
)

echo.
echo ====================================
echo   ¡FIREBASE CLI INSTALADO!
echo ====================================
echo.
echo Ahora ejecuta: firebase login
echo.
pause
