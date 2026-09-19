const db = require('../../config/db');

function listar() {
  return db
    .prepare('SELECT id, nombre_usuario, rol, activo FROM usuarios ORDER BY nombre_usuario')
    .all();
}

function obtenerPorId(id) {
  return db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
}

function obtenerPorNombreUsuario(nombreUsuario) {
  return db.prepare('SELECT * FROM usuarios WHERE nombre_usuario = ?').get(nombreUsuario);
}

function crear({ nombreUsuario, passwordHash, rol }) {
  const info = db
    .prepare(
      'INSERT INTO usuarios (nombre_usuario, password_hash, rol, activo) VALUES (?, ?, ?, 1)'
    )
    .run(nombreUsuario, passwordHash, rol);
  return obtenerPorId(info.lastInsertRowid);
}

function actualizar(id, { rol, activo }) {
  db.prepare('UPDATE usuarios SET rol = ?, activo = ? WHERE id = ?').run(rol, activo ? 1 : 0, id);
  return obtenerPorId(id);
}

function actualizarPassword(id, passwordHash) {
  db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(passwordHash, id);
}

module.exports = {
  listar,
  obtenerPorId,
  obtenerPorNombreUsuario,
  crear,
  actualizar,
  actualizarPassword,
};
