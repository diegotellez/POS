const inventarioService = require('../services/inventarioService');
const { asyncHandler } = require('../middleware/errorHandler');

const registrarEntrada = asyncHandler(async (req, res) => {
  const producto = inventarioService.registrarEntrada({
    productoId: req.body.productoId,
    cantidad: req.body.cantidad,
    referencia: req.body.referencia,
    usuarioId: req.usuario.id,
  });
  res.status(201).json(producto);
});

const ajustarManual = asyncHandler(async (req, res) => {
  const producto = inventarioService.ajustarManual({
    productoId: req.body.productoId,
    nuevoStock: req.body.nuevoStock,
    motivo: req.body.motivo,
    usuarioId: req.usuario.id,
  });
  res.json(producto);
});

const movimientos = asyncHandler(async (req, res) => {
  const productoId = req.query.productoId ? Number(req.query.productoId) : undefined;
  res.json(inventarioService.listarMovimientos({ productoId }));
});

const stockBajo = asyncHandler(async (req, res) => {
  res.json(inventarioService.listarStockBajo());
});

module.exports = { registrarEntrada, ajustarManual, movimientos, stockBajo };
