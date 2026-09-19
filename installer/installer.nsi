; Instalador del Sistema POS (Punto de Venta local)
; Compilado con NSIS (makensis) - genera un .exe para Windows que instala
; el backend (Node/Express/SQLite) + frontend Angular ya compilado.
; Requiere tener Node.js instalado en el equipo (ver LEEME.txt).

!include "MUI2.nsh"

; ---------------------------------------------------------------------------
; Configuracion general
; ---------------------------------------------------------------------------
Name "Sistema POS"
OutFile "SistemaPOS-Setup.exe"
InstallDir "E:\Projects\POS\Site"
InstallDirRegKey HKCU "Software\SistemaPOS" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
Unicode true

; ---------------------------------------------------------------------------
; Interfaz (Modern UI 2)
; ---------------------------------------------------------------------------
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\start-pos.bat"
!define MUI_FINISHPAGE_RUN_TEXT "Iniciar Sistema POS ahora"
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\LEEME.txt"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Ver instrucciones de uso (LEEME.txt)"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Spanish"

; ---------------------------------------------------------------------------
; Seccion principal de instalacion
; ---------------------------------------------------------------------------
Section "Sistema POS (requerido)" SEC_MAIN
  SectionIn RO

  SetOutPath "$INSTDIR"
  File "staging\LEEME.txt"
  File "staging\start-pos.bat"
  File "staging\crear-usuarios-iniciales.bat"

  SetOutPath "$INSTDIR\app"
  File /r "staging\app\*.*"

  ; Carpetas de datos (se crean vacias; la BD se genera al primer arranque)
  CreateDirectory "$INSTDIR\app\data\reportes"

  ; Accesos directos del Menu Inicio
  CreateDirectory "$SMPROGRAMS\Sistema POS"
  CreateShortCut "$SMPROGRAMS\Sistema POS\Sistema POS.lnk" "$INSTDIR\start-pos.bat"
  CreateShortCut "$SMPROGRAMS\Sistema POS\Crear usuarios iniciales.lnk" "$INSTDIR\crear-usuarios-iniciales.bat"
  CreateShortCut "$SMPROGRAMS\Sistema POS\Leeme.lnk" "$INSTDIR\LEEME.txt"
  CreateShortCut "$SMPROGRAMS\Sistema POS\Desinstalar Sistema POS.lnk" "$INSTDIR\Uninstall.exe"

  ; Registro para "Agregar o quitar programas" (solo usuario actual)
  WriteRegStr HKCU "Software\SistemaPOS" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SistemaPOS" "DisplayName" "Sistema POS"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SistemaPOS" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SistemaPOS" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SistemaPOS" "DisplayVersion" "1.0.0"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SistemaPOS" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SistemaPOS" "NoRepair" 1

  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

Section "Acceso directo en el Escritorio" SEC_DESKTOP
  CreateShortCut "$DESKTOP\Sistema POS.lnk" "$INSTDIR\start-pos.bat"
SectionEnd

; ---------------------------------------------------------------------------
; Desinstalacion
; ---------------------------------------------------------------------------
Section "Uninstall"
  ; Preguntar si se debe conservar la base de datos / reportes
  MessageBox MB_YESNO "¿Quieres conservar la base de datos y los reportes generados (carpeta app\data)?" IDYES keep_data
    RMDir /r "$INSTDIR\app\data"
  keep_data:

  RMDir /r "$INSTDIR\app\node_modules"
  RMDir /r "$INSTDIR\app\public"
  RMDir /r "$INSTDIR\app\src"
  RMDir /r "$INSTDIR\app\scripts"
  Delete "$INSTDIR\app\app.js"
  Delete "$INSTDIR\app\package.json"
  Delete "$INSTDIR\app\package-lock.json"
  Delete "$INSTDIR\app\.env"
  Delete "$INSTDIR\app\.env.example"
  Delete "$INSTDIR\app\.gitignore"
  RMDir "$INSTDIR\app"

  Delete "$INSTDIR\LEEME.txt"
  Delete "$INSTDIR\start-pos.bat"
  Delete "$INSTDIR\crear-usuarios-iniciales.bat"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"

  Delete "$SMPROGRAMS\Sistema POS\Sistema POS.lnk"
  Delete "$SMPROGRAMS\Sistema POS\Crear usuarios iniciales.lnk"
  Delete "$SMPROGRAMS\Sistema POS\Leeme.lnk"
  Delete "$SMPROGRAMS\Sistema POS\Desinstalar Sistema POS.lnk"
  RMDir "$SMPROGRAMS\Sistema POS"
  Delete "$DESKTOP\Sistema POS.lnk"

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SistemaPOS"
  DeleteRegKey HKCU "Software\SistemaPOS"
SectionEnd
