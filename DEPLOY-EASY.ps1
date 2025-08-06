# Script de PowerShell para desplegar fácilmente a Firebase
# Ejecutar con: powershell -ExecutionPolicy Bypass -File DEPLOY-EASY.ps1

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   🚀 DESPLEGADOR AUTOMÁTICO DE FIREBASE 🚀   " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Función para verificar comandos
function Test-Command($cmdname) {
    try {
        Get-Command $cmdname -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# PASO 1: Verificar Node.js
Write-Host "[1/6] Verificando Node.js..." -ForegroundColor Yellow
if (Test-Command "node") {
    $nodeVersion = node --version
    Write-Host "✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js NO está instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Descargando Node.js..." -ForegroundColor Yellow
    Start-Process "https://nodejs.org/"
    Write-Host "Por favor instala Node.js y vuelve a ejecutar este script" -ForegroundColor Cyan
    Read-Host "Presiona Enter para salir"
    exit
}

Write-Host ""

# PASO 2: Verificar/Instalar Firebase CLI
Write-Host "[2/6] Verificando Firebase CLI..." -ForegroundColor Yellow
if (Test-Command "firebase") {
    $firebaseVersion = firebase --version
    Write-Host "✅ Firebase CLI instalado: $firebaseVersion" -ForegroundColor Green
} else {
    Write-Host "⚠️  Firebase CLI no está instalado" -ForegroundColor Yellow
    Write-Host "Instalando Firebase CLI..." -ForegroundColor Cyan
    npm install -g firebase-tools
    
    if (Test-Command "firebase") {
        Write-Host "✅ Firebase CLI instalado correctamente" -ForegroundColor Green
    } else {
        Write-Host "❌ Error instalando Firebase CLI" -ForegroundColor Red
        Read-Host "Presiona Enter para salir"
        exit
    }
}

Write-Host ""

# PASO 3: Login en Firebase
Write-Host "[3/6] Verificando sesión de Firebase..." -ForegroundColor Yellow
$loginCheck = firebase projects:list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "📝 Necesitas iniciar sesión en Firebase" -ForegroundColor Yellow
    Write-Host "Se abrirá tu navegador para autenticarte..." -ForegroundColor Cyan
    Write-Host ""
    firebase login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Login cancelado" -ForegroundColor Red
        Read-Host "Presiona Enter para salir"
        exit
    }
}
Write-Host "✅ Sesión activa en Firebase" -ForegroundColor Green

Write-Host ""

# PASO 4: Mostrar proyectos disponibles
Write-Host "[4/6] Proyectos disponibles:" -ForegroundColor Yellow
Write-Host ""
firebase projects:list
Write-Host ""

# PASO 5: Seleccionar proyecto
Write-Host "[5/6] Configurando proyecto..." -ForegroundColor Yellow

# Verificar si ya hay un proyecto configurado
if (Test-Path ".firebaserc") {
    $config = Get-Content ".firebaserc" | ConvertFrom-Json
    $currentProject = $config.projects.default
    
    if ($currentProject -eq "audio-panel-avisos") {
        Write-Host "⚠️  Proyecto por defecto detectado: $currentProject" -ForegroundColor Yellow
        $projectId = Read-Host "Escribe el ID de TU proyecto (o Enter para usar $currentProject)"
        
        if ($projectId -ne "") {
            # Actualizar .firebaserc con el nuevo proyecto
            $config.projects.default = $projectId
            $config | ConvertTo-Json | Set-Content ".firebaserc"
            firebase use $projectId
        }
    } else {
        Write-Host "✅ Usando proyecto: $currentProject" -ForegroundColor Green
        firebase use $currentProject
    }
} else {
    $projectId = Read-Host "Escribe el ID de tu proyecto Firebase"
    firebase use $projectId
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error seleccionando proyecto" -ForegroundColor Red
        Read-Host "Presiona Enter para salir"
        exit
    }
}

Write-Host ""

# PASO 6: Desplegar
Write-Host "[6/6] DESPLEGANDO APLICACIÓN..." -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

firebase deploy --only hosting

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "    🎉 ¡APLICACIÓN DESPLEGADA CON ÉXITO! 🎉   " -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📌 IMPORTANTE - Actualiza Spotify Dashboard:" -ForegroundColor Yellow
    Write-Host "   Agrega estas Redirect URIs:" -ForegroundColor White
    Write-Host "   • https://TU-PROYECTO.web.app/callback.html" -ForegroundColor Cyan
    Write-Host "   • https://TU-PROYECTO.firebaseapp.com/callback.html" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Reemplaza TU-PROYECTO con el nombre real de tu proyecto" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Error durante el despliegue" -ForegroundColor Red
    Write-Host "Revisa los mensajes de error arriba" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Presiona Enter para salir"
