@echo off
REM ================================================================
REM   BeautyApp - Script de subida inicial a GitHub
REM   Uso: doble clic, o desde la terminal:  subir-a-github.bat
REM ================================================================

setlocal EnableDelayedExpansion

REM Posicionarse en la carpeta donde vive el script
cd /d "%~dp0"

echo ===============================================================
echo   Subiendo BeautyApp a GitHub
echo   Carpeta: %CD%
echo ===============================================================
echo.

REM 1) Verificar que git este instalado
where git >nul 2>nul
if errorlevel 1 (
    echo [ERROR] git no esta instalado o no esta en el PATH.
    echo         Descargalo de https://git-scm.com/download/win
    pause
    exit /b 1
)

REM 2) Inicializar repo si no existe
if not exist ".git" (
    echo [1/6] Inicializando repositorio git...
    git init
    git branch -M main
) else (
    echo [1/6] Repositorio ya inicializado, salto este paso.
)
echo.

REM 3) Configurar identidad si falta
for /f "delims=" %%i in ('git config user.email 2^>nul') do set GIT_EMAIL=%%i
if "%GIT_EMAIL%"=="" (
    echo [2/6] No tenes identidad configurada, la agrego ahora.
    git config user.name  "Lucas Manmai"
    git config user.email "lcasmanmaidana@gmail.com"
) else (
    echo [2/6] Identidad ya configurada (%GIT_EMAIL%^).
)
echo.

REM 4) Agregar remoto si no existe
git remote get-url origin >nul 2>nul
if errorlevel 1 (
    echo [3/6] Conectando al repo de GitHub...
    git remote add origin https://github.com/LMANMAI/dsw_cosmetic-app.git
) else (
    echo [3/6] Remoto 'origin' ya existe.
)
echo.

REM 5) Stage + commit
echo [4/6] Agregando archivos...
git add .
echo.

echo [5/6] Creando commit...
git commit -m "feat: scaffold inicial Expo Router + 5 pantallas MVP"
if errorlevel 1 (
    echo        Nada nuevo para commitear o no hubo cambios. Sigo.
)
echo.

REM 6) Push
echo [6/6] Subiendo a GitHub (rama main)...
git push -u origin main
if errorlevel 1 (
    echo.
    echo [WARN] El push fallo. Las causas mas comunes:
    echo         - Tu repo en GitHub ya tiene commits: usa  git pull --rebase origin main  y volve a correr.
    echo         - Te falta autenticar: GitHub no acepta password,
    echo           necesitas un Personal Access Token o GitHub Desktop / SSH.
    echo.
    pause
    exit /b 1
)

echo.
echo ===============================================================
echo   Listo. Mira tu repo en:
echo   https://github.com/LMANMAI/dsw_cosmetic-app
echo ===============================================================
pause
