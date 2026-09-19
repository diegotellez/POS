const db = require('../../config/db');

function registrarMovimiento({ productoId, tipo, cantidad, referencia }) {
  db.prepare(
    `INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, fecha_hora, referencia)
     VALUES (?, ?, ?, datetime('now', 'localtime'), ?)`
  ).run(productoId, tipo, cantidad, referencia ?? null);
}

function listarMovimientos({ productoId } = {}) {
  if (productoId) {
    return db
      .prepare(
        `SELECT m.*, p.nombre AS producto_nombre
         FROM movimientos_inventario m JOIN productos p ON p.id = m.producto_id
         WHERE m.producto_id = ?
         ORDER BY m.fecha_hora DESC LIMIT 200`
      )
      .all(productoId);
  }
  return db
    .prepare(
      `SELECT m.*, p.nombre AS producto_nombre
       FROM movimientos_inventario m JOIN productos p ON p.id = m.producto_id
       ORDER BY m.fecha_hora DESC LIMIT 200`
    )
    .all();
}

module.exports = { registrarMovimiento, listarMovimientos };
