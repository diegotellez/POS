const turnoRepository = require('../data/repositories/turnoRepository');
const ventaRepository = require('../data/repositories/ventaRepository');
const AppError = require('./AppError');

function obtenerActual() {
  return turnoRepository.obtenerAbierto();
}

function abrir({ usuarioAperturaId, baseInicialEfectivo }) {
  const abierto = turnoRepository.obtenerAbierto();
  if (abierto) {
    throw new AppError('Ya hay un turno de caja abierto. Ciérralo antes de abrir uno nuevo.');
  }
  return turnoRepository.abrir({
    usuarioAperturaId,
    baseInicialEfectivo: Number(baseInicialEfectivo) || 0,
  });
}

function cerrar(id, { usuarioCierreId, efectivoContado }) {
  const turno = turnoRepository.obtenerPorId(id);
  if (!turno) throw new AppError('Turno no encontrado', 404);
  if (turno.estado !== 'ABIERTO') throw new AppError('El turno ya está cerrado');

  const efectivoVentas = ventaRepository.totalEfectivoPorTurno(id);
  const efectivoEsperado = turno.base_inicial_efectivo + efectivoVentas;
  const diferenciaArqueo = Number(efectivoContado) - efectivoEsperado;

  const turnoCerrado = turnoRepository.cerrar(id, {
    usuarioCierreId,
    efectivoContado: Number(efectivoContado),
    diferenciaArqueo,
  });
  return { ...turnoCerrado, efectivoEsperado };
}

function listar() {
  return turnoRepository.listar();
}

function obtenerPorId(id) {
  const turno = turnoRepository.obtenerPorId(id);
  if (!turno) throw new AppError('Turno no encontrado', 404);
  return turno;
}

module.exports = { obtenerActual, abrir, cerrar, listar, obtenerPorId };
