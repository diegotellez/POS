const turnoService = require('../services/turnoService');
const { asyncHandler } = require('../middleware/errorHandler');

const actual = asyncHandler(async (req, res) => {
  res.json(turnoService.obtenerActual() || null);
});

const abrir = asyncHandler(async (req, res) => {
  const turno = turnoService.abrir({
    usuarioAperturaId: req.usuario.id,
    baseInicialEfectivo: req.body.baseInicialEfectivo,
  });
  res.status(201).json(turno);
});

const cerrar = asyncHandler(async (req, res) => {
  const turno = turnoService.cerrar(Number(req.params.id), {
    usuarioCierreId: req.usuario.id,
    efectivoContado: req.body.efectivoContado,
  });
  res.json(turno);
});

const listar = asyncHandler(async (req, res) => {
  res.json(turnoService.listar());
});

const obtenerPorId = asyncHandler(async (req, res) => {
  res.json(turnoService.obtenerPorId(Number(req.params.id)));
});

module.exports = { actual, abrir, cerrar, listar, obtenerPorId };
