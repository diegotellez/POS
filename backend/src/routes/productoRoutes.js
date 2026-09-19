const { Router } = require('express');
const productoController = require('../controllers/productoController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = Router();
router.use(requireAuth);
router.get('/', productoController.listar);
router.get('/buscar', productoController.buscar);
router.get('/stock-bajo', productoController.stockBajo);
router.get('/codigo/:codigo', productoController.obtenerPorCodigo);
router.post('/', requireRole('ADMINISTRADOR'), productoController.crear);
router.put('/:id', requireRole('ADMINISTRADOR'), productoController.actualizar);
router.delete('/:id', requireRole('ADMINISTRADOR'), productoController.eliminar);

module.exports = router;
