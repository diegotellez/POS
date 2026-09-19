const productoService = require('../services/productoService');
const { asyncHandler } = require('../middleware/errorHandler');

const listar = asyncHandler(async (req, res) => {
  const soloActivos = req.query.soloActivos === 'true';
  res.json(productoService.listar({ soloActivos }));
});

const buscar = asyncHandler(async (req, res) => {
  res.json(productoService.buscar(req.query.q));
});

const obtenerPorCodigo = asyncHandler(async (req, res) => {
  const producto = productoService.obtenerPorCodigo(req.params.codigo);
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(producto);
});

const crear = asyncHandler(async (req, res) => {
  res.status(201).json(productoService.crear(req.body));
});

const actualizar = asyncHandler(async (req, res) => {
  res.json(productoService.actualizar(Number(req.params.id), req.body, req.usuario.id));
});

const eliminar = asyncHandler(async (req, res) => {
  productoService.eliminar(Number(req.params.id));
  res.status(204).send();
});

const stockBajo = asyncHandler(async (req, res) => {
  res.json(productoService.listarStockBajo());
});

module.exports = { listar, buscar, obtenerPorCodigo, crear, actualizar, eliminar, stockBajo };
