const usuarioRepository = require('../data/repositories/usuarioRepository');
const authService = require('./authService');
const AppError = require('./AppError');

function listar() {
  return usuarioRepository.listar();
}

function crear({ nombreUsuario, password, rol }) {
  if (!nombreUsuario || !password) {
    throw new AppError('Nombre de usuario y contraseña son obligatorios');
  }
  if (!['CAJERO', 'ADMINISTRADOR'].includes(rol)) {
    throw new AppError('Rol inválido');
  }
  if (usuarioRepository.obtenerPorNombreUsuario(nombreUsuario)) {
    throw new AppError('Ya existe un usuario con ese nombre');
  }
  return usuarioRepository.crear({
    nombreUsuario,
    passwordHash: authService.hashPassword(password),
    rol,
  });
}

function actualizar(id, { rol, activo }) {
  const existente = usuarioRepository.obtenerPorId(id);
  if (!existente) throw new AppError('Usuario no encontrado', 404);
  return usuarioRepository.actualizar(id, { rol: rol ?? existente.rol, activo: activo ?? existente.activo });
}

function cambiarPassword(id, nuevaPassword) {
  const existente = usuarioRepository.obtenerPorId(id);
  if (!existente) throw new AppError('Usuario no encontrado', 404);
  usuarioRepository.actualizarPassword(id, authService.hashPassword(nuevaPassword));
}

module.exports = { listar, crear, actualizar, cambiarPassword };
