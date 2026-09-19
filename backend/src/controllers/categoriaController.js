const categoriaService = require('../services/categoriaService');
const { asyncHandler } = require('../middleware/errorHandler');

const listar = asyncHandler(async (req, res) => {
  res.json(categoriaService.listar());
});

const crear = asyncHandler(async (req, res) => {
  res.status(201).json(categoriaService.crear(req.body));
});

const actualizar = asyncHandler(async (req, res) => {
  res.json(categoriaService.actualizar(Number(req.params.id), req.body));
});

const eliminar = asyncHandler(async (req, res) => {
  categoriaService.eliminar(Number(req.params.id));
  res.status(204).send();
});

module.exports = { listar, crear, actualizar, eliminar };
