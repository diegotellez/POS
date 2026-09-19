const db = require('../config/db');
const productoRepository = require('../data/repositories/productoRepository');
const inventarioRepository = require('../data/repositories/inventarioRepository');
const auditoriaRepository = require('../data/repositories/auditoriaRepository');
const AppError = require('./AppError');

function registrarEntrada({ productoId, cantidad, referencia, usuarioId }) {
  const producto = productoRepository.obtenerPorId(productoId);
  if (!producto) throw new AppError('Producto no encontrado', 404);
  const cant = Number(cantidad);
  if (!cant || cant <= 0) throw new AppError('La cantidad debe ser mayor a cero');

  const ejecutar = db.transaction(() => {
    productoRepository.ajustarStock(productoId, cant);
    inventarioRepository.registrarMovimiento({
      productoId,
      tipo: 'ENTRADA',
      cantidad: cant,
      referencia: referencia || 'Reabastecimiento',
    });
    auditoriaRepository.registrar({
      usuarioId,
      accion: 'EntradaInventario',
      detalle: `Producto ${producto.nombre} (#${productoId}): +${cant} (${referencia || 'Reabastecimiento'})`,
    });
  });
  ejecutar();

  return productoRepository.obtenerPorId(productoId);
}

function ajustarManual({ productoId, nuevoStock, motivo, usuarioId }) {
  const producto = productoRepository.obtenerPorId(productoId);
  if (!producto) throw new AppError('Producto no encontrado', 404);
  const delta = Number(nuevoStock) - producto.stock;

  const ejecutar = db.transaction(() => {
    productoRepository.ajustarStock(productoId, delta);
    inventarioRepository.registrarMovimiento({
      productoId,
      tipo: 'AJUSTE_MANUAL',
      cantidad: delta,
      referencia: motivo || 'Ajuste manual',
    });
    auditoriaRepository.registrar({
      usuarioId,
      accion: 'AjusteInventario',
      detalle: `Producto ${producto.nombre} (#${productoId}): ${producto.stock} -> ${nuevoStock}. Motivo: ${motivo || 'N/A'}`,
    });
  });
  ejecutar();

  return productoRepository.obtenerPorId(productoId);
}

function listarMovimientos(filtros) {
  return inventarioRepository.listarMovimientos(filtros);
}

function listarStockBajo() {
  return productoRepository.listarStockBajo();
}

module.exports = { registrarEntrada, ajustarManual, listarMovimientos, listarStockBajo };
