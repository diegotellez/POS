const usuarioService = require('../services/usuarioService');
const { asyncHandler } = require('../middleware/errorHandler');

const listar = asyncHandler(async (req, res) => {
  res.json(usuarioService.listar());
});

const crear = asyncHandler(async (req, res) => {
  res.status(201).json(usuarioService.crear(req.body));
});

const actualizar = asyncHandler(async (req, res) => {
  res.json(usuarioService.actualizar(Number(req.params.id), req.body));
});

const cambiarPassword = asyncHandler(async (req, res) => {
  usuarioService.cambiarPassword(Number(req.params.id), req.body.password);
  res.status(204).send();
});

module.exports = { listar, crear, actualizar, cambiarPassword };
