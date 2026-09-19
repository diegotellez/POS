const { Router } = require('express');
const clienteController = require('../controllers/clienteController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = Router();
router.use(requireAuth);
router.get('/buscar', clienteController.buscar);
router.post('/', clienteController.crear);

module.exports = router;
