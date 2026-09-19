const { Router } = require('express');
const categoriaController = require('../controllers/categoriaController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = Router();
router.use(requireAuth);
router.get('/', categoriaController.listar);
router.post('/', requireRole('ADMINISTRADOR'), categoriaController.crear);
router.put('/:id', requireRole('ADMINISTRADOR'), categoriaController.actualizar);
router.delete('/:id', requireRole('ADMINISTRADOR'), categoriaController.eliminar);

module.exports = router;
