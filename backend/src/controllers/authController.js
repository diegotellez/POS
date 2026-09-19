const authService = require('../services/authService');
const { asyncHandler } = require('../middleware/errorHandler');

const login = asyncHandler(async (req, res) => {
  const { nombreUsuario, password } = req.body;
  const resultado = authService.login(nombreUsuario, password);
  res.json(resultado);
});

const yo = asyncHandler(async (req, res) => {
  res.json(req.usuario);
});

module.exports = { login, yo };
