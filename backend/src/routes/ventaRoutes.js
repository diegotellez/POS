const { Router } = require('express');
const ventaController = require('../controllers/ventaController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = Router();
router.use(requireAuth);
router.get('/', ventaController.listar);
router.post('/', ventaController.crear);
router.get('/turno/:turnoId', ventaController.listarPorTurno);
router.get('/:id', ventaController.obtener);
router.get('/:id/ticket', ventaController.ticketHTML);
router.post('/:id/imprimir', ventaController.imprimir);
router.post('/:id/anular', ventaController.anular);

module.exports = router;
