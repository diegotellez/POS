const db = require('../../config/db');

function registrar({ usuarioId, accion, detalle }) {
  db.prepare(
    `INSERT INTO log_auditoria (usuario_id, accion, detalle, fecha_hora)
     VALUES (?, ?, ?, datetime('now', 'localtime'))`
  ).run(usuarioId ?? null, accion, detalle ?? null);
}

function listar() {
  return db
    .prepare(
      `SELECT a.*, u.nombre_usuario
       FROM log_auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id
       ORDER BY a.fecha_hora DESC LIMIT 300`
    )
    .all();
}

module.exports = { registrar, listar };
