const reporteService = require('../services/reporteService');
const whatsappService = require('../services/whatsappService');
const { asyncHandler } = require('../middleware/errorHandler');

const reporteTurno = asyncHandler(async (req, res) => {
  res.json(reporteService.construirReporte(Number(req.params.turnoId)));
});

const reportePDF = asyncHandler(async (req, res) => {
  const filePath = await reporteService.generarPDF(Number(req.params.turnoId));
  res.download(filePath);
});

const enviarWhatsApp = asyncHandler(async (req, res) => {
  const filePath = await reporteService.generarPDF(Number(req.params.turnoId));
  const resultado = await whatsappService.abrirCarpetaYWhatsApp(filePath);
  res.json({ ...resultado, archivo: filePath });
});

module.exports = { reporteTurno, reportePDF, enviarWhatsApp };
