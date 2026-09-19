const respaldoService = require('../services/respaldoService');
const { asyncHandler } = require('../middleware/errorHandler');

const usb = asyncHandler(async (req, res) => {
  res.json(respaldoService.respaldarAUSB(req.body.ruta));
});

const drive = asyncHandler(async (req, res) => {
  res.json(respaldoService.respaldarADrive(req.body.ruta));
});

module.exports = { usb, drive };
