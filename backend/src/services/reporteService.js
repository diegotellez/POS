const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const turnoRepository = require('../data/repositories/turnoRepository');
const ventaRepository = require('../data/repositories/ventaRepository');
const AppError = require('./AppError');

function construirReporte(turnoId) {
  const turno = turnoRepository.obtenerPorId(turnoId);
  if (!turno) throw new AppError('Turno no encontrado', 404);

  const resumenVentas = ventaRepository.totalVentasTurno(turnoId);
  const porMetodoPago = ventaRepository.totalesPorMetodoPago(turnoId);
  const porUsuario = ventaRepository.totalesPorUsuario(turnoId);
  const ventas = ventaRepository.listarPorTurno(turnoId);

  const efectivoVentas = ventaRepository.totalEfectivoPorTurno(turnoId);
  const efectivoEsperado = turno.base_inicial_efectivo + efectivoVentas;

  return {
    turno,
    totalVentas: resumenVentas.total,
    cantidadVentas: resumenVentas.cantidad,
    porMetodoPago,
    porUsuario,
    ventas,
    arqueo: {
      baseInicial: turno.base_inicial_efectivo,
      efectivoVentas,
      efectivoEsperado,
      efectivoContado: turno.efectivo_contado,
      diferencia: turno.diferencia_arqueo,
    },
  };
}

function reportesDir() {
  const dir = path.resolve(process.cwd(), process.env.REPORTES_DIR || './data/reportes');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function generarPDF(turnoId) {
  const reporte = construirReporte(turnoId);
  const dir = reportesDir();
  const filePath = path.join(dir, `turno-${turnoId}.pdf`);

  const doc = new PDFDocument({ margin: 40 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(18).text(`Reporte de cierre de turno #${reporte.turno.id}`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).fillColor('#787878');
  doc.text(`Apertura: ${reporte.turno.fecha_hora_apertura}`);
  doc.text(`Cierre: ${reporte.turno.fecha_hora_cierre || 'En curso'}`);
  doc.moveDown();

  doc.fillColor('#111111').fontSize(13).text('Resumen de ventas');
  doc.fontSize(11).fillColor('#111111');
  doc.text(`Total vendido: $${reporte.totalVentas.toFixed(2)}`);
  doc.text(`Cantidad de ventas: ${reporte.cantidadVentas}`);
  doc.moveDown();

  doc.fontSize(13).text('Desglose por método de pago');
  doc.fontSize(11);
  reporte.porMetodoPago.forEach((mp) => {
    doc.text(`${mp.metodo_pago}: $${mp.total.toFixed(2)}`);
  });
  doc.moveDown();

  doc.fontSize(13).text('Desglose por usuario');
  doc.fontSize(11);
  reporte.porUsuario.forEach((u) => {
    doc.text(`${u.nombre_usuario}: $${u.total.toFixed(2)} (${u.cantidad_ventas} ventas)`);
  });
  doc.moveDown();

  doc.fontSize(13).text('Arqueo de caja');
  doc.fontSize(11);
  doc.text(`Base inicial: $${reporte.arqueo.baseInicial.toFixed(2)}`);
  doc.text(`Ventas en efectivo: $${reporte.arqueo.efectivoVentas.toFixed(2)}`);
  doc.text(`Efectivo esperado: $${reporte.arqueo.efectivoEsperado.toFixed(2)}`);
  if (reporte.arqueo.efectivoContado !== null) {
    doc.text(`Efectivo contado: $${reporte.arqueo.efectivoContado.toFixed(2)}`);
    const diferencia = reporte.arqueo.diferencia;
    doc
      .fillColor(diferencia < 0 ? '#e53935' : '#111111')
      .text(`Diferencia: $${diferencia.toFixed(2)} ${diferencia < 0 ? '(FALTANTE)' : diferencia > 0 ? '(SOBRANTE)' : ''}`);
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

module.exports = { construirReporte, generarPDF, reportesDir };
