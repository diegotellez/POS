@echo off
setlocal
title Sistema POS - Crear usuarios iniciales
cd /d "%~dp0app"

where node >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js instalado en este equipo.
  echo Descargalo e instalalo desde https://nodejs.org ^(version LTS^) y
  echo vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

echo Creando usuario administrador, cajero y datos de ejemplo (si no existen)...
echo.
node scripts\seed.js

echo.
echo Listo. Usuarios disponibles:
echo   admin  / admin123   (Administrador)
echo   cajero / cajero123  (Cajero)
echo.
echo IMPORTANTE: cambia estas contrasenas desde el modulo de Usuarios
echo una vez que ingreses al sistema.
echo.
pause
