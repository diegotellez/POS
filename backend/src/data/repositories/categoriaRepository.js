const db = require('../../config/db');

function listar() {
  return db.prepare('SELECT * FROM categorias ORDER BY nombre').all();
}

function obtenerPorId(id) {
  return db.prepare('SELECT * FROM categorias WHERE id = ?').get(id);
}

function crear({ nombre, categoriaPadreId }) {
  const info = db
    .prepare('INSERT INTO categorias (nombre, categoria_padre_id) VALUES (?, ?)')
    .run(nombre, categoriaPadreId ?? null);
  return obtenerPorId(info.lastInsertRowid);
}

function actualizar(id, { nombre, categoriaPadreId }) {
  db.prepare('UPDATE categorias SET nombre = ?, categoria_padre_id = ? WHERE id = ?').run(
    nombre,
    categoriaPadreId ?? null,
    id
  );
  return obtenerPorId(id);
}

function eliminar(id) {
  db.prepare('DELETE FROM categorias WHERE id = ?').run(id);
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
