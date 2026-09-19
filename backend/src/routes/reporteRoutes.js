const { Router } = require('express');
const reporteController = require('../controllers/reporteController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = Router();
router.use(requireAuth);
router.get('/turno/:turnoId', reporteController.reporteTurno);
router.get('/turno/:turnoId/pdf', reporteController.reportePDF);
router.post('/turno/:turnoId/whatsapp', reporteController.enviarWhatsApp);

module.exports = router;
