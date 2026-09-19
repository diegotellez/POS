const { Router } = require('express');
const turnoController = require('../controllers/turnoController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = Router();
router.use(requireAuth);
router.get('/actual', turnoController.actual);
router.post('/abrir', turnoController.abrir);
router.post('/:id/cerrar', turnoController.cerrar);
router.get('/', requireRole('ADMINISTRADOR'), turnoController.listar);
router.get('/:id', turnoController.obtenerPorId);

module.exports = router;
