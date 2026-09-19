const db = require('../../config/db');

function obtenerPorId(id) {
  return db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
}

function buscar(termino) {
  const like = `%${termino}%`;
  return db
    .prepare('SELECT * FROM clientes WHERE nombre LIKE ? OR documento LIKE ? LIMIT 20')
    .all(like, like);
}

function crear({ nombre, documento }) {
  const info = db
    .prepare('INSERT INTO clientes (nombre, documento) VALUES (?, ?)')
    .run(nombre ?? null, documento ?? null);
  return obtenerPorId(info.lastInsertRowid);
}

module.exports = { obtenerPorId, buscar, crear };
