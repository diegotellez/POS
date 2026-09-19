const { Router } = require('express');
const usuarioController = require('../controllers/usuarioController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = Router();
router.use(requireAuth, requireRole('ADMINISTRADOR'));
router.get('/', usuarioController.listar);
router.post('/', usuarioController.crear);
router.put('/:id', usuarioController.actualizar);
router.put('/:id/password', usuarioController.cambiarPassword);

module.exports = router;
