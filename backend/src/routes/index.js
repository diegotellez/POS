const { Router } = require('express');

const router = Router();

router.use('/auth', require('./authRoutes'));
router.use('/categorias', require('./categoriaRoutes'));
router.use('/productos', require('./productoRoutes'));
router.use('/usuarios', require('./usuarioRoutes'));
router.use('/turnos', require('./turnoRoutes'));
router.use('/ventas', require('./ventaRoutes'));
router.use('/inventario', require('./inventarioRoutes'));
router.use('/reportes', require('./reporteRoutes'));
router.use('/respaldo', require('./respaldoRoutes'));
router.use('/clientes', require('./clienteRoutes'));
router.use('/auditoria', require('./auditoriaRoutes'));

module.exports = router;
