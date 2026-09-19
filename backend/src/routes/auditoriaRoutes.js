const { Router } = require('express');
const auditoriaController = require('../controllers/auditoriaController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = Router();
router.use(requireAuth, requireRole('ADMINISTRADOR'));
router.get('/', auditoriaController.listar);

module.exports = router;
