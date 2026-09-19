@echo off
setlocal
title Sistema POS - Servidor local
cd /d "%~dp0app"

where node >nul 2>nul
if errorlevel 1 (
  echo ============================================================
  echo   No se encontro Node.js instalado en este equipo.
  echo   Descargalo e instalalo desde https://nodejs.org ^(version LTS^)
  echo   y vuelve a ejecutar este acceso directo.
  echo ============================================================
  pause
  exit /b 1
)

REM Abre el navegador automaticamente unos segundos despues de arrancar el servidor.
start "" cmd /c "timeout /t 2 >nul && start "" http://localhost:3000"

echo ============================================================
echo   Sistema POS - servidor local
echo   No cierres esta ventana mientras uses el sistema.
echo   Para detener el servidor, cierra esta ventana o presiona Ctrl+C.
echo ============================================================
echo.

node app.js

echo.
echo El servidor se ha detenido.
pause
