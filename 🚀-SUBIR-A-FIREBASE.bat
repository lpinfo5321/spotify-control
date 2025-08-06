@echo off
title Subir App a Firebase - Super Facil
color 0A

echo.
echo  =========================================
echo     SUBIR TU APP A FIREBASE - SUPER FACIL
echo  =========================================
echo.
echo  Este script hara TODO por ti:
echo  1. Instalar herramientas necesarias
echo  2. Configurar tu proyecto
echo  3. Subir tu app a internet
echo.
echo  =========================================
echo.
pause

cls
echo.
echo  [PASO 1] Verificando herramientas...
echo.

REM Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [!] Node.js no esta instalado
    echo.
    echo  Abriendo pagina de descarga...
    echo  Por favor instala Node.js y vuelve a ejecutar este archivo
    echo.
    start https://nodejs.org/
    pause
    exit
)
echo  [OK] Node.js instalado
echo.

REM Verificar/Instalar Firebase
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] Instalando Firebase CLI...
    echo      Esto puede tardar 1-2 minutos...
    echo.
    call npm install -g firebase-tools
    cls
)
echo  [OK] Firebase CLI listo
echo.

echo  =========================================
echo.
echo  [PASO 2] Iniciando sesion en Firebase...
echo.
echo  IMPORTANTE: Se abrira tu navegador
echo  Inicia sesion con tu cuenta de Google
echo.
pause

firebase login
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] No se pudo iniciar sesion
    echo.
    pause
    exit
)

cls
color 0A
echo.
echo  =========================================
echo  [OK] Sesion iniciada correctamente!
echo  =========================================
echo.
echo  [PASO 3] Selecciona tu proyecto
echo.
echo  Estos son tus proyectos:
echo  -------------------------
firebase projects:list
echo  -------------------------
echo.
echo  Si no tienes proyecto:
echo  1. Abre: https://console.firebase.google.com
echo  2. Crea un proyecto nuevo
echo  3. Vuelve aqui
echo.
set /p PROJECT_ID="Escribe el ID de tu proyecto: "

firebase use %PROJECT_ID%
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] Proyecto no encontrado
    echo.
    pause
    exit
)

cls
color 0A
echo.
echo  =========================================
echo     SUBIENDO TU APP A INTERNET...
echo  =========================================
echo.

firebase deploy --only hosting

if %errorlevel% equ 0 (
    cls
    color 0A
    echo.
    echo  ###########################################
    echo  #                                         #
    echo  #    EXITO! TU APP ESTA EN INTERNET!     #
    echo  #                                         #
    echo  ###########################################
    echo.
    echo  Tu app esta disponible en:
    echo  https://%PROJECT_ID%.web.app
    echo  https://%PROJECT_ID%.firebaseapp.com
    echo.
    echo  =========================================
    echo  ULTIMO PASO - MUY IMPORTANTE:
    echo  =========================================
    echo.
    echo  1. Abre: https://developer.spotify.com/dashboard
    echo  2. Entra a tu app "Audio Panel Controller"
    echo  3. Ve a Settings
    echo  4. En "Redirect URIs" agrega estas 2 URLs:
    echo.
    echo     https://%PROJECT_ID%.web.app/callback.html
    echo     https://%PROJECT_ID%.firebaseapp.com/callback.html
    echo.
    echo  5. Dale a SAVE
    echo.
    echo  =========================================
    echo  LISTO! Ya puedes usar tu app desde cualquier lugar!
    echo  =========================================
    echo.
) else (
    color 0C
    echo.
    echo  [ERROR] Algo salio mal
    echo  Revisa los errores arriba
    echo.
)

pause
