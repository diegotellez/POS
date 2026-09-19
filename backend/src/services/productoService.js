const productoRepository = require('../data/repositories/productoRepository');
const auditoriaRepository = require('../data/repositories/auditoriaRepository');
const AppError = require('./AppError');

const PREFIJO_CODIGO_INTERNO = '2';
const LONGITUD_CODIGO_INTERNO = 6;

function generarCodigoInterno() {
  const ultimo = productoRepository.ultimoCodigoInterno(PREFIJO_CODIGO_INTERNO);
  const siguiente = ultimo ? Number(ultimo) + 1 : Number(`${PREFIJO_CODIGO_INTERNO}00001`);
  return String(siguiente).padStart(LONGITUD_CODIGO_INTERNO, '0');
}

function listar(filtros) {
  return productoRepository.listar(filtros);
}

function buscar(termino) {
  if (!termino || !termino.trim()) return [];
  return productoRepository.buscar(termino.trim());
}

function obtenerPorCodigo(codigo) {
  return productoRepository.obtenerPorCodigo(codigo);
}

function crear(datos) {
  if (!datos.nombre || !datos.nombre.trim()) {
    throw new AppError('El nombre del producto es obligatorio');
  }
  if (datos.codigoBarras) {
    const existente = productoRepository.obtenerPorCodigo(datos.codigoBarras);
    if (existente) throw new AppError('Ya existe un producto con ese código de barras');
  }
  const codigoInterno = datos.codigoInterno || generarCodigoInterno();
  return productoRepository.crear({
    codigoBarras: datos.codigoBarras || null,
    codigoInterno,
    nombre: datos.nombre.trim(),
    descripcion: datos.descripcion || null,
    categoriaId: datos.categoriaId || null,
    precioVenta: Number(datos.precioVenta) || 0,
    stock: Number(datos.stock) || 0,
    stockMinimo: Number(datos.stockMinimo) || 0,
    tasaImpuesto: datos.tasaImpuesto ?? null,
  });
}

function actualizar(id, datos, usuarioId) {
  const existente = productoRepository.obtenerPorId(id);
  if (!existente) throw new AppError('Producto no encontrado', 404);

  if (
    Number(datos.precioVenta) !== existente.precio_venta &&
    datos.precioVenta !== undefined
  ) {
    auditoriaRepository.registrar({
      usuarioId,
      accion: 'AjustePrecio',
      detalle: `Producto ${existente.nombre} (#${id}): ${existente.precio_venta} -> ${datos.precioVenta}`,
    });
  }

  return productoRepository.actualizar(id, {
    codigoBarras: datos.codigoBarras ?? existente.codigo_barras,
    nombre: datos.nombre ?? existente.nombre,
    descripcion: datos.descripcion ?? existente.descripcion,
    categoriaId: datos.categoriaId ?? existente.categoria_id,
    precioVenta: datos.precioVenta !== undefined ? Number(datos.precioVenta) : existente.precio_venta,
    stockMinimo:
      datos.stockMinimo !== undefined ? Number(datos.stockMinimo) : existente.stock_minimo,
    tasaImpuesto: datos.tasaImpuesto !== undefined ? datos.tasaImpuesto : existente.tasa_impuesto,
    activo: datos.activo !== undefined ? (datos.activo ? 1 : 0) : existente.activo,
  });
}

function eliminar(id) {
  const existente = productoRepository.obtenerPorId(id);
  if (!existente) throw new AppError('Producto no encontrado', 404);
  productoRepository.eliminar(id);
}

function listarStockBajo() {
  return productoRepository.listarStockBajo();
}

module.exports = { listar, buscar, obtenerPorCodigo, crear, actualizar, eliminar, listarStockBajo };
