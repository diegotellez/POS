const { Router } = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = Router();
router.post('/login', authController.login);
router.get('/me', requireAuth, authController.yo);

module.exports = router;
