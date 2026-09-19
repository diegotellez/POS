const db = require('../../config/db');

function obtenerPorId(id) {
  return db.prepare('SELECT * FROM turnos_caja WHERE id = ?').get(id);
}

function obtenerAbierto() {
  return db.prepare("SELECT * FROM turnos_caja WHERE estado = 'ABIERTO' LIMIT 1").get();
}

function listar() {
  return db
    .prepare(
      `SELECT t.*, ua.nombre_usuario AS usuario_apertura, uc.nombre_usuario AS usuario_cierre
       FROM turnos_caja t
       LEFT JOIN usuarios ua ON ua.id = t.usuario_apertura_id
       LEFT JOIN usuarios uc ON uc.id = t.usuario_cierre_id
       ORDER BY t.fecha_hora_apertura DESC`
    )
    .all();
}

function abrir({ usuarioAperturaId, baseInicialEfectivo }) {
  const info = db
    .prepare(
      `INSERT INTO turnos_caja (usuario_apertura_id, fecha_hora_apertura, base_inicial_efectivo, estado)
       VALUES (?, datetime('now', 'localtime'), ?, 'ABIERTO')`
    )
    .run(usuarioAperturaId, baseInicialEfectivo);
  return obtenerPorId(info.lastInsertRowid);
}

function cerrar(id, { usuarioCierreId, efectivoContado, diferenciaArqueo }) {
  db.prepare(
    `UPDATE turnos_caja SET
       usuario_cierre_id = ?,
       fecha_hora_cierre = datetime('now', 'localtime'),
       efectivo_contado = ?,
       diferencia_arqueo = ?,
       estado = 'CERRADO'
     WHERE id = ?`
  ).run(usuarioCierreId, efectivoContado, diferenciaArqueo, id);
  return obtenerPorId(id);
}

module.exports = { obtenerPorId, obtenerAbierto, listar, abrir, cerrar };
