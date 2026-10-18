@echo off
setlocal
rem Instala el ayudante del cajon monedero para el POS (no necesita administrador).
set "DIR=%~dp0"
echo.
echo ===== Ayudante del cajon monedero - Sistema POS =====
echo.
echo Impresoras instaladas en este equipo:
powershell -NoProfile -Command "Get-CimInstance Win32_Printer | ForEach-Object { '  - ' + $_.Name }"
echo.
set "IMP="
set /p IMP=Escriba el nombre EXACTO de la impresora termica (Enter = la predeterminada): 
rem Sin bloques entre parentesis: los nombres de impresora suelen tenerlos, ej. "POS-58 (copia 1)".
if not defined IMP goto sinimpresora
> "%DIR%impresora.txt" echo(%IMP%
goto seguir
:sinimpresora
if exist "%DIR%impresora.txt" del "%DIR%impresora.txt"
:seguir
reg add "HKCU\Software\Classes\poscajon" /ve /d "URL:Abrir cajon POS" /f >nul
reg add "HKCU\Software\Classes\poscajon" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\poscajon\shell\open\command" /ve /d "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \"%DIR%abrir-cajon.ps1\" \"%%1\"" /f >nul
echo.
echo Listo. Probando: el cajon deberia abrirse ahora...
powershell -NoProfile -ExecutionPolicy Bypass -File "%DIR%abrir-cajon.ps1" "poscajon:prueba"
echo.
echo Resultado (ultimas lineas de registro.txt):
powershell -NoProfile -Command "if (Test-Path '%DIR%registro.txt') { Get-Content '%DIR%registro.txt' -Tail 3 }"
echo.
echo En el POS: Respaldo y configuracion ^> Cajon monedero ^> "Ayudante de Windows" ^> Guardar.
echo La primera vez Chrome preguntara si permite abrir "Abrir cajon POS": marque
echo "Permitir siempre" y pulse Abrir.
echo.
echo IMPORTANTE: no mueva esta carpeta. Si la mueve, vuelva a ejecutar instalar.bat.
pause
