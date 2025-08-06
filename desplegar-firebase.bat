@echo off
echo ====================================
echo   DESPLEGAR APP A FIREBASE
echo ====================================
echo.

REM Verificar si Firebase CLI está instalado
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Firebase CLI no está instalado!
    echo Ejecuta primero: instalar-firebase.bat
    pause
    exit /b 1
)

echo [1/5] Verificando login...
firebase projects:list >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Necesitas iniciar sesión en Firebase
    echo Se abrirá tu navegador...
    echo.
    firebase login
    if %errorlevel% neq 0 (
        echo [ERROR] Login cancelado
        pause
        exit /b 1
    )
)

echo [2/5] Login verificado
echo.
echo [3/5] Proyectos disponibles:
echo.
firebase projects:list

echo.
echo [4/5] Seleccionando proyecto...
echo.
echo Si es la primera vez, escribe el ID de tu proyecto
echo (ejemplo: panel-avisos)
echo.

REM Intentar usar proyecto existente o pedir uno nuevo
firebase use
if %errorlevel% neq 0 (
    set /p PROJECT_ID="Escribe el ID de tu proyecto: "
    firebase use %PROJECT_ID%
)

echo.
echo [5/5] DESPLEGANDO APLICACIÓN...
echo ====================================
echo.
firebase deploy --only hosting

echo.
echo ====================================
echo   ¡DESPLIEGUE COMPLETADO!
echo ====================================
echo.
echo Tu app está disponible en las URLs mostradas arriba
echo.
echo IMPORTANTE: Agrega estas URLs en Spotify Dashboard:
echo - https://tu-proyecto.web.app/callback.html
echo - https://tu-proyecto.firebaseapp.com/callback.html
echo.
pause
