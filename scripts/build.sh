#!/usr/bin/env bash
# Compila el frontend Angular y copia el resultado a backend/public,
# para que el backend Node sirva todo (API + interfaz) como un único
# proceso local (ver README.md).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Instalando dependencias del frontend (si hace falta)..."
cd "$ROOT_DIR/frontend"
[ -d node_modules ] || npm install

echo "==> Compilando frontend (ng build)..."
npx ng build

echo "==> Copiando dist/ a backend/public..."
rm -rf "$ROOT_DIR/backend/public"
mkdir -p "$ROOT_DIR/backend/public"
cp -r "$ROOT_DIR/frontend/dist/frontend/browser/"* "$ROOT_DIR/backend/public/"

echo "==> Listo. Ahora puedes correr: cd backend && npm start"
