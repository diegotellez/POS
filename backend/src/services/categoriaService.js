const categoriaRepository = require('../data/repositories/categoriaRepository');
const AppError = require('./AppError');

function listar() {
  return categoriaRepository.listar();
}

function crear({ nombre, categoriaPadreId }) {
  if (!nombre || !nombre.trim()) {
    throw new AppError('El nombre de la categoría es obligatorio');
  }
  return categoriaRepository.crear({ nombre: nombre.trim(), categoriaPadreId });
}

function actualizar(id, { nombre, categoriaPadreId }) {
  const existente = categoriaRepository.obtenerPorId(id);
  if (!existente) throw new AppError('Categoría no encontrada', 404);
  if (categoriaPadreId && Number(categoriaPadreId) === Number(id)) {
    throw new AppError('Una categoría no puede ser su propia categoría padre');
  }
  return categoriaRepository.actualizar(id, { nombre, categoriaPadreId });
}

function eliminar(id) {
  const existente = categoriaRepository.obtenerPorId(id);
  if (!existente) throw new AppError('Categoría no encontrada', 404);
  categoriaRepository.eliminar(id);
}

module.exports = { listar, crear, actualizar, eliminar };
