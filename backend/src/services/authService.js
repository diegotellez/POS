const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuarioRepository = require('../data/repositories/usuarioRepository');
const AppError = require('./AppError');

function login(nombreUsuario, password) {
  const usuario = usuarioRepository.obtenerPorNombreUsuario(nombreUsuario);
  if (!usuario || !usuario.activo) {
    throw new AppError('Usuario o contraseña incorrectos', 401);
  }
  const valido = bcrypt.compareSync(password, usuario.password_hash);
  if (!valido) {
    throw new AppError('Usuario o contraseña incorrectos', 401);
  }
  const token = jwt.sign(
    { id: usuario.id, nombreUsuario: usuario.nombre_usuario, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );
  return {
    token,
    usuario: { id: usuario.id, nombreUsuario: usuario.nombre_usuario, rol: usuario.rol },
  };
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

module.exports = { login, hashPassword };
