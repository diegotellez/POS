#!/usr/bin/env bash
# Genera installer/SistemaPOS-Setup.exe (instalador Windows del Sistema POS)
# usando NSIS. Requiere:
#   - makensis instalado (Linux: `apt install nsis`, o NSIS en Windows/Mac)
#   - Node.js en esta máquina de build (para compilar el frontend)
#
# El instalador resultante NO incluye Node.js: la PC donde se instale el
# Sistema POS debe tener Node.js (ver README.md / LEEME.txt).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALLER_DIR="$ROOT_DIR/installer"
STAGING="$INSTALLER_DIR/staging"

command -v makensis >/dev/null || { echo "Falta makensis (NSIS). Instálalo y vuelve a intentar."; exit 1; }

echo "==> Compilando frontend..."
cd "$ROOT_DIR/frontend"
[ -d node_modules ] || npm install
npx ng build

echo "==> Instalando dependencias del backend (si hace falta)..."
cd "$ROOT_DIR/backend"
[ -d node_modules ] || npm install --omit=dev

echo "==> Preparando staging..."
rm -rf "$STAGING"
mkdir -p "$STAGING/app"

cp -r "$ROOT_DIR/backend/." "$STAGING/app/"
rm -rf "$STAGING/app/data" "$STAGING/app/.env" "$STAGING/app/.gitignore"
mkdir -p "$STAGING/app/data/reportes"

# El instalador es para Windows x64: nos quedamos solo con ese binario nativo
# de better-sqlite3 (viene con prebuilds de todas las plataformas) para
# reducir bastante el tamaño del instalador.
BETTER_SQLITE_PREBUILDS="$STAGING/app/node_modules/better-sqlite3/prebuilds"
if [ -d "$BETTER_SQLITE_PREBUILDS" ]; then
  find "$BETTER_SQLITE_PREBUILDS" -maxdepth 1 -iname "*.node" ! -iname "win32-x64.node" -delete
fi

rm -rf "$STAGING/app/public"
mkdir -p "$STAGING/app/public"
cp -r "$ROOT_DIR/frontend/dist/frontend/browser/." "$STAGING/app/public/"

# .env con secreto único generado en cada build
SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
cat > "$STAGING/app/.env" <<EOF
PORT=3000
JWT_SECRET=$SECRET
JWT_EXPIRES_IN=12h
DB_PATH=./data/pos.db
REPORTES_DIR=./data/reportes
DRIVE_BACKUP_DIR=
WHATSAPP_NUMERO=
PRINTER_TYPE=
PRINTER_INTERFACE=
EOF

cp "$INSTALLER_DIR/LEEME.txt" "$STAGING/LEEME.txt"
cp "$INSTALLER_DIR/start-pos.bat" "$STAGING/start-pos.bat"
cp "$INSTALLER_DIR/crear-usuarios-iniciales.bat" "$STAGING/crear-usuarios-iniciales.bat"

echo "==> Compilando instalador (makensis)..."
cd "$INSTALLER_DIR"
makensis installer.nsi

echo "==> Listo: installer/SistemaPOS-Setup.exe"
