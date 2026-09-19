const db = require('../../config/db');

function listar({ soloActivos = false } = {}) {
  const where = soloActivos ? 'WHERE p.activo = 1' : '';
  return db
    .prepare(
      `SELECT p.*, c.nombre AS categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       ${where}
       ORDER BY p.nombre`
    )
    .all();
}

function buscar(termino) {
  const like = `%${termino}%`;
  return db
    .prepare(
      `SELECT p.*, c.nombre AS categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       WHERE p.activo = 1
         AND (p.nombre LIKE ? OR p.codigo_barras = ? OR p.codigo_interno = ?)
       ORDER BY p.nombre
       LIMIT 50`
    )
    .all(like, termino, termino);
}

function obtenerPorId(id) {
  return db.prepare('SELECT * FROM productos WHERE id = ?').get(id);
}

function obtenerPorCodigo(codigo) {
  return db
    .prepare('SELECT * FROM productos WHERE codigo_barras = ? OR codigo_interno = ?')
    .get(codigo, codigo);
}

function ultimoCodigoInterno(prefijo) {
  const row = db
    .prepare(
      `SELECT codigo_interno FROM productos
       WHERE codigo_interno LIKE ?
       ORDER BY CAST(codigo_interno AS INTEGER) DESC LIMIT 1`
    )
    .get(`${prefijo}%`);
  return row ? row.codigo_interno : null;
}

function crear(producto) {
  const info = db
    .prepare(
      `INSERT INTO productos
        (codigo_barras, codigo_interno, nombre, descripcion, categoria_id,
         precio_venta, stock, stock_minimo, tasa_impuesto, activo)
       VALUES (@codigoBarras, @codigoInterno, @nombre, @descripcion, @categoriaId,
               @precioVenta, @stock, @stockMinimo, @tasaImpuesto, 1)`
    )
    .run(producto);
  return obtenerPorId(info.lastInsertRowid);
}

function actualizar(id, producto) {
  db.prepare(
    `UPDATE productos SET
       codigo_barras = @codigoBarras,
       nombre = @nombre,
       descripcion = @descripcion,
       categoria_id = @categoriaId,
       precio_venta = @precioVenta,
       stock_minimo = @stockMinimo,
       tasa_impuesto = @tasaImpuesto,
       activo = @activo
     WHERE id = @id`
  ).run({ ...producto, id });
  return obtenerPorId(id);
}

function ajustarStock(id, delta) {
  db.prepare('UPDATE productos SET stock = stock + ? WHERE id = ?').run(delta, id);
  return obtenerPorId(id);
}

function establecerPrecio(id, precioVenta) {
  db.prepare('UPDATE productos SET precio_venta = ? WHERE id = ?').run(precioVenta, id);
  return obtenerPorId(id);
}

function eliminar(id) {
  db.prepare('UPDATE productos SET activo = 0 WHERE id = ?').run(id);
}

function listarStockBajo() {
  return db
    .prepare(
      `SELECT * FROM productos WHERE activo = 1 AND stock <= stock_minimo ORDER BY stock ASC`
    )
    .all();
}

module.exports = {
  listar,
  buscar,
  obtenerPorId,
  obtenerPorCodigo,
  ultimoCodigoInterno,
  crear,
  actualizar,
  ajustarStock,
  establecerPrecio,
  eliminar,
  listarStockBajo,
};
