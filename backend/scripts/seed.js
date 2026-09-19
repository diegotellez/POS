require('dotenv').config();
const db = require('../src/config/db');
const authService = require('../src/services/authService');
const usuarioRepository = require('../src/data/repositories/usuarioRepository');
const categoriaRepository = require('../src/data/repositories/categoriaRepository');
const productoRepository = require('../src/data/repositories/productoRepository');

function crearUsuarioSiNoExiste(nombreUsuario, password, rol) {
  if (usuarioRepository.obtenerPorNombreUsuario(nombreUsuario)) {
    console.log(`Usuario "${nombreUsuario}" ya existe, se omite.`);
    return;
  }
  usuarioRepository.crear({ nombreUsuario, passwordHash: authService.hashPassword(password), rol });
  console.log(`Usuario "${nombreUsuario}" creado (rol ${rol}).`);
}

crearUsuarioSiNoExiste('admin', 'admin123', 'ADMINISTRADOR');
crearUsuarioSiNoExiste('cajero', 'cajero123', 'CAJERO');

let categorias = categoriaRepository.listar();
if (categorias.length === 0) {
  const bebidas = categoriaRepository.crear({ nombre: 'Bebidas' });
  const abarrotes = categoriaRepository.crear({ nombre: 'Abarrotes' });
  const aseo = categoriaRepository.crear({ nombre: 'Aseo' });
  console.log('Categorías de ejemplo creadas.');
  categorias = [bebidas, abarrotes, aseo];
}

const productosExistentes = productoRepository.listar();
if (productosExistentes.length === 0) {
  const [bebidas, abarrotes, aseo] = categorias;
  productoRepository.crear({
    codigoBarras: '7701234567890',
    codigoInterno: '200001',
    nombre: 'Gaseosa 400ml',
    descripcion: null,
    categoriaId: bebidas.id,
    precioVenta: 3500,
    stock: 50,
    stockMinimo: 10,
    tasaImpuesto: null,
  });
  productoRepository.crear({
    codigoBarras: null,
    codigoInterno: '200002',
    nombre: 'Arroz 500g',
    descripcion: null,
    categoriaId: abarrotes.id,
    precioVenta: 2800,
    stock: 30,
    stockMinimo: 5,
    tasaImpuesto: null,
  });
  productoRepository.crear({
    codigoBarras: '7709876543210',
    codigoInterno: '200003',
    nombre: 'Jabón de baño',
    descripcion: null,
    categoriaId: aseo.id,
    precioVenta: 1900,
    stock: 4,
    stockMinimo: 5,
    tasaImpuesto: null,
  });
  console.log('Productos de ejemplo creados.');
}

console.log('Seed completado. Base de datos:', db.dbPath);
