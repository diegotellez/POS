const { Router } = require('express');
const respaldoController = require('../controllers/respaldoController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = Router();
router.use(requireAuth, requireRole('ADMINISTRADOR'));
router.post('/usb', respaldoController.usb);
router.post('/drive', respaldoController.drive);

module.exports = router;
