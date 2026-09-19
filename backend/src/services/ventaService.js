const db = require('../config/db');
const ventaRepository = require('../data/repositories/ventaRepository');
const productoRepository = require('../data/repositories/productoRepository');
const inventarioRepository = require('../data/repositories/inventarioRepository');
const clienteRepository = require('../data/repositories/clienteRepository');
const turnoRepository = require('../data/repositories/turnoRepository');
const auditoriaRepository = require('../data/repositories/auditoriaRepository');
const AppError = require('./AppError');

const EPSILON = 0.01;

function crearVenta({ turnoCajaId, usuarioId, cliente, items, pagos }) {
  if (!items || !items.length) {
    throw new AppError('La venta debe tener al menos un producto');
  }
  if (!pagos || !pagos.length) {
    throw new AppError('La venta debe tener al menos un pago');
  }

  const turno = turnoRepository.obtenerPorId(turnoCajaId);
  if (!turno || turno.estado !== 'ABIERTO') {
    throw new AppError('El turno de caja indicado no está abierto');
  }

  const productos = items.map((item) => {
    const producto = productoRepository.obtenerPorId(item.productoId);
    if (!producto || !producto.activo) {
      throw new AppError(`Producto ${item.productoId} no existe o está inactivo`);
    }
    const cantidad = Number(item.cantidad);
    if (!cantidad || cantidad <= 0) {
      throw new AppError(`Cantidad inválida para el producto ${producto.nombre}`);
    }
    const precioUnitario = item.precioUnitario !== undefined
      ? Number(item.precioUnitario)
      : producto.precio_venta;
    return { producto, cantidad, precioUnitario, subtotal: cantidad * precioUnitario };
  });

  const total = productos.reduce((acc, p) => acc + p.subtotal, 0);
  const totalPagos = pagos.reduce((acc, p) => acc + Number(p.monto), 0);
  if (Math.abs(totalPagos - total) > EPSILON) {
    throw new AppError(
      `La suma de los pagos (${totalPagos.toFixed(2)}) no coincide con el total de la venta (${total.toFixed(2)})`
    );
  }

  let clienteId = cliente?.id ?? null;
  if (!clienteId && (cliente?.nombre || cliente?.documento)) {
    clienteId = clienteRepository.crear({ nombre: cliente.nombre, documento: cliente.documento }).id;
  }

  const ejecutar = db.transaction(() => {
    const ventaId = ventaRepository.crearVenta({ turnoCajaId, usuarioId, clienteId, total });

    for (const item of productos) {
      ventaRepository.agregarDetalle(ventaId, {
        productoId: item.producto.id,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
      });
      productoRepository.ajustarStock(item.producto.id, -item.cantidad);
      inventarioRepository.registrarMovimiento({
        productoId: item.producto.id,
        tipo: 'SALIDA_POR_VENTA',
        cantidad: -item.cantidad,
        referencia: `Venta #${ventaId}`,
      });
    }

    for (const pago of pagos) {
      ventaRepository.agregarPago(ventaId, { metodoPago: pago.metodoPago, monto: Number(pago.monto) });
    }

    return ventaId;
  });

  const ventaId = ejecutar();

  const alertasStock = productos
    .map((p) => productoRepository.obtenerPorId(p.producto.id))
    .filter((p) => p.stock <= p.stock_minimo)
    .map((p) => ({
      productoId: p.id,
      nombre: p.nombre,
      stock: p.stock,
      stockMinimo: p.stock_minimo,
      agotado: p.stock <= 0,
    }));

  return { venta: obtenerVenta(ventaId), alertasStock };
}

function obtenerVenta(id) {
  const venta = ventaRepository.obtenerPorId(id);
  if (!venta) throw new AppError('Venta no encontrada', 404);
  return {
    ...venta,
    detalle: ventaRepository.obtenerDetalle(id),
    pagos: ventaRepository.obtenerPagos(id),
  };
}

function listarPorTurno(turnoCajaId) {
  return ventaRepository.listarPorTurno(turnoCajaId);
}

function listar(filtros) {
  return ventaRepository.listar(filtros);
}

function anular(id, { motivo, usuarioAnulacionId }) {
  const venta = ventaRepository.obtenerPorId(id);
  if (!venta) throw new AppError('Venta no encontrada', 404);
  if (venta.estado === 'ANULADA') throw new AppError('La venta ya está anulada');
  if (!motivo || !motivo.trim()) throw new AppError('El motivo de anulación es obligatorio');

  const detalle = ventaRepository.obtenerDetalle(id);

  const ejecutar = db.transaction(() => {
    ventaRepository.anular(id, { motivo, usuarioAnulacionId });
    for (const linea of detalle) {
      productoRepository.ajustarStock(linea.producto_id, linea.cantidad);
      inventarioRepository.registrarMovimiento({
        productoId: linea.producto_id,
        tipo: 'AJUSTE_ANULACION',
        cantidad: linea.cantidad,
        referencia: `Anulación venta #${id}`,
      });
    }
    auditoriaRepository.registrar({
      usuarioId: usuarioAnulacionId,
      accion: 'AnulacionVenta',
      detalle: `Venta #${id} anulada. Motivo: ${motivo}`,
    });
  });
  ejecutar();

  return obtenerVenta(id);
}

module.exports = { crearVenta, obtenerVenta, listarPorTurno, listar, anular };
