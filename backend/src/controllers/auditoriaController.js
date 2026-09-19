const auditoriaRepository = require('../data/repositories/auditoriaRepository');
const { asyncHandler } = require('../middleware/errorHandler');

const listar = asyncHandler(async (req, res) => {
  res.json(auditoriaRepository.listar());
});

module.exports = { listar };
