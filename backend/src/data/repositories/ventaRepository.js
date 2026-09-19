const db = require('../../config/db');

function crearVenta({ turnoCajaId, usuarioId, clienteId, total }) {
  const info = db
    .prepare(
      `INSERT INTO ventas (turno_caja_id, usuario_id, cliente_id, fecha_hora, total, estado)
       VALUES (?, ?, ?, datetime('now', 'localtime'), ?, 'COMPLETADA')`
    )
    .run(turnoCajaId, usuarioId, clienteId ?? null, total);
  return info.lastInsertRowid;
}

function agregarDetalle(ventaId, { productoId, cantidad, precioUnitario, subtotal }) {
  db.prepare(
    `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
     VALUES (?, ?, ?, ?, ?)`
  ).run(ventaId, productoId, cantidad, precioUnitario, subtotal);
}

function agregarPago(ventaId, { metodoPago, monto }) {
  db.prepare('INSERT INTO pagos_venta (venta_id, metodo_pago, monto) VALUES (?, ?, ?)').run(
    ventaId,
    metodoPago,
    monto
  );
}

function obtenerPorId(id) {
  return db.prepare('SELECT * FROM ventas WHERE id = ?').get(id);
}

function obtenerDetalle(ventaId) {
  return db
    .prepare(
      `SELECT d.*, p.nombre AS producto_nombre, p.codigo_barras, p.codigo_interno
       FROM detalle_ventas d JOIN productos p ON p.id = d.producto_id
       WHERE d.venta_id = ?`
    )
    .all(ventaId);
}

function obtenerPagos(ventaId) {
  return db.prepare('SELECT * FROM pagos_venta WHERE venta_id = ?').all(ventaId);
}

function listarPorTurno(turnoCajaId) {
  return db
    .prepare(
      `SELECT v.*, u.nombre_usuario, c.nombre AS cliente_nombre
       FROM ventas v
       JOIN usuarios u ON u.id = v.usuario_id
       LEFT JOIN clientes c ON c.id = v.cliente_id
       WHERE v.turno_caja_id = ?
       ORDER BY v.fecha_hora DESC`
    )
    .all(turnoCajaId);
}

function listar({ desde, hasta, estado } = {}) {
  const condiciones = [];
  const params = [];
  if (desde) {
    condiciones.push('v.fecha_hora >= ?');
    params.push(desde);
  }
  if (hasta) {
    condiciones.push('v.fecha_hora <= ?');
    params.push(hasta);
  }
  if (estado) {
    condiciones.push('v.estado = ?');
    params.push(estado);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  return db
    .prepare(
      `SELECT v.*, u.nombre_usuario
       FROM ventas v JOIN usuarios u ON u.id = v.usuario_id
       ${where}
       ORDER BY v.fecha_hora DESC
       LIMIT 200`
    )
    .all(...params);
}

function anular(id, { motivo, usuarioAnulacionId }) {
  db.prepare(
    `UPDATE ventas SET
       estado = 'ANULADA',
       motivo_anulacion = ?,
       fecha_hora_anulacion = datetime('now', 'localtime'),
       usuario_anulacion_id = ?
     WHERE id = ?`
  ).run(motivo, usuarioAnulacionId, id);
  return obtenerPorId(id);
}

function totalesPorMetodoPago(turnoCajaId) {
  return db
    .prepare(
      `SELECT pg.metodo_pago, SUM(pg.monto) AS total
       FROM pagos_venta pg
       JOIN ventas v ON v.id = pg.venta_id
       WHERE v.turno_caja_id = ? AND v.estado = 'COMPLETADA'
       GROUP BY pg.metodo_pago`
    )
    .all(turnoCajaId);
}

function totalesPorUsuario(turnoCajaId) {
  return db
    .prepare(
      `SELECT u.nombre_usuario, SUM(v.total) AS total, COUNT(*) AS cantidad_ventas
       FROM ventas v
       JOIN usuarios u ON u.id = v.usuario_id
       WHERE v.turno_caja_id = ? AND v.estado = 'COMPLETADA'
       GROUP BY v.usuario_id`
    )
    .all(turnoCajaId);
}

function totalEfectivoPorTurno(turnoCajaId) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(pg.monto), 0) AS total
       FROM pagos_venta pg
       JOIN ventas v ON v.id = pg.venta_id
       WHERE v.turno_caja_id = ? AND v.estado = 'COMPLETADA' AND pg.metodo_pago = 'EFECTIVO'`
    )
    .get(turnoCajaId);
  return row.total;
}

function totalVentasTurno(turnoCajaId) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS cantidad
       FROM ventas WHERE turno_caja_id = ? AND estado = 'COMPLETADA'`
    )
    .get(turnoCajaId);
  return row;
}

module.exports = {
  crearVenta,
  agregarDetalle,
  agregarPago,
  obtenerPorId,
  obtenerDetalle,
  obtenerPagos,
  listarPorTurno,
  listar,
  anular,
  totalesPorMetodoPago,
  totalesPorUsuario,
  totalEfectivoPorTurno,
  totalVentasTurno,
};
