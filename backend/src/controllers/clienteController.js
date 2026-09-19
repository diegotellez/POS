const clienteRepository = require('../data/repositories/clienteRepository');
const { asyncHandler } = require('../middleware/errorHandler');

const buscar = asyncHandler(async (req, res) => {
  res.json(clienteRepository.buscar(req.query.q || ''));
});

const crear = asyncHandler(async (req, res) => {
  res.status(201).json(clienteRepository.crear(req.body));
});

module.exports = { buscar, crear };
