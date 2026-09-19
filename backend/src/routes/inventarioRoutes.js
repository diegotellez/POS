const { Router } = require('express');
const inventarioController = require('../controllers/inventarioController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = Router();
router.use(requireAuth);
router.get('/movimientos', inventarioController.movimientos);
router.get('/stock-bajo', inventarioController.stockBajo);
router.post('/entradas', requireRole('ADMINISTRADOR'), inventarioController.registrarEntrada);
router.post('/ajustes', requireRole('ADMINISTRADOR'), inventarioController.ajustarManual);

module.exports = router;
