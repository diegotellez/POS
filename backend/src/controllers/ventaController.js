const ventaService = require('../services/ventaService');
const impresionService = require('../services/impresionService');
const { asyncHandler } = require('../middleware/errorHandler');

const crear = asyncHandler(async (req, res) => {
  const resultado = ventaService.crearVenta({
    turnoCajaId: req.body.turnoCajaId,
    usuarioId: req.usuario.id,
    cliente: req.body.cliente,
    items: req.body.items,
    pagos: req.body.pagos,
  });
  res.status(201).json(resultado);
});

const obtener = asyncHandler(async (req, res) => {
  res.json(ventaService.obtenerVenta(Number(req.params.id)));
});

const listarPorTurno = asyncHandler(async (req, res) => {
  res.json(ventaService.listarPorTurno(Number(req.params.turnoId)));
});

const listar = asyncHandler(async (req, res) => {
  res.json(ventaService.listar(req.query));
});

const anular = asyncHandler(async (req, res) => {
  const venta = ventaService.anular(Number(req.params.id), {
    motivo: req.body.motivo,
    usuarioAnulacionId: req.usuario.id,
  });
  res.json(venta);
});

const ticketHTML = asyncHandler(async (req, res) => {
  const venta = ventaService.obtenerVenta(Number(req.params.id));
  res.type('html').send(impresionService.construirTicketHTML(venta));
});

const imprimir = asyncHandler(async (req, res) => {
  const venta = ventaService.obtenerVenta(Number(req.params.id));
  const resultado = await impresionService.imprimirEnTermica(venta);
  res.json(resultado);
});

module.exports = { crear, obtener, listarPorTurno, listar, anular, ticketHTML, imprimir };
