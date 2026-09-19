const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const AppError = require('./AppError');

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function copiarBaseDeDatos(destinoDir) {
  if (!destinoDir || !destinoDir.trim()) {
    throw new AppError('Debes indicar una carpeta de destino para el respaldo');
  }
  if (!fs.existsSync(destinoDir)) {
    throw new AppError(`La carpeta de destino no existe: ${destinoDir}`, 404);
  }

  // checkpoint del WAL para asegurar que el archivo .db en disco esté al día
  db.pragma('wal_checkpoint(FULL)');

  const nombreArchivo = `pos-backup-${timestamp()}.db`;
  const destino = path.join(destinoDir, nombreArchivo);
  fs.copyFileSync(db.dbPath, destino);
  return destino;
}

function respaldarAUSB(rutaUSB) {
  return { destino: copiarBaseDeDatos(rutaUSB) };
}

function respaldarADrive(carpetaDrive) {
  const carpeta = carpetaDrive || process.env.DRIVE_BACKUP_DIR;
  if (!carpeta) {
    throw new AppError('No hay una carpeta de Google Drive Desktop configurada');
  }
  return { destino: copiarBaseDeDatos(carpeta) };
}

module.exports = { respaldarAUSB, respaldarADrive };
