/*
 * Reglas de negocio del POS (equivalente a backend/src/services).
 * Regla clave: el "día de negocio" lo define el turno de caja
 * abierto -> cerrado, no la fecha calendario. Toda venta pertenece a un turno.
 */
(function (global) {
  'use strict';

  var EPSILON = 0.01;
  var PREFIJO_CODIGO_INTERNO = '2';
  var LONGITUD_CODIGO_INTERNO = 6;
  var ROLES = ['CAJERO', 'ADMINISTRADOR'];
  var METODOS_PAGO = ['EFECTIVO', 'NEQUI', 'QR', 'TRANSFERENCIA'];
  // Métodos que ya no se ofrecen pero pueden estar en ventas antiguas (se siguen reportando).
  var METODOS_HISTORICOS = ['TARJETA'];
  var NOMBRES_METODO = { EFECTIVO: 'Efectivo', NEQUI: 'Nequi', QR: 'QR', TRANSFERENCIA: 'Transferencia', TARJETA: 'Tarjeta' };
  function nombreMetodo(m) { return NOMBRES_METODO[m] || String(m || ''); }
  // Lista ordenada de métodos con valor: primero los vigentes, luego cualquier otro registrado.
  function metodosConValor(porMetodo) {
    var orden = METODOS_PAGO.concat(METODOS_HISTORICOS);
    Object.keys(porMetodo).forEach(function (m) { if (orden.indexOf(m) === -1) orden.push(m); });
    return orden.filter(function (m) { return porMetodo[m]; }).map(function (m) { return { metodo_pago: m, total: U.redondear(porMetodo[m]) }; });
  }
  var CLAVE_SESION = 'pos_html_sesion';
  var ITERACIONES_HASH = 500;

  function falla(mensaje) {
    throw new Error(mensaje);
  }

  function copia(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function auditar(db, usuarioId, accion, detalle) {
    DB.insertar(db, 'auditoria', {
      usuario_id: usuarioId || null,
      accion: accion,
      detalle: detalle || null,
      fecha_hora: U.ahora()
    });
  }

  function movimiento(db, productoId, tipo, cantidad, referencia) {
    DB.insertar(db, 'movimientos', {
      producto_id: productoId,
      tipo: tipo,
      cantidad: cantidad,
      fecha_hora: U.ahora(),
      referencia: referencia || null
    });
  }

  // Sin permiso de vender sin stock, la cantidad no puede superar lo disponible.
  function validarStock(lineas) {
    var porProducto = {};
    lineas.forEach(function (l) { porProducto[l.producto.id] = (porProducto[l.producto.id] || 0) + l.cantidad; });
    lineas.forEach(function (l) {
      var pedido = porProducto[l.producto.id];
      if (pedido > l.producto.stock) {
        falla(l.producto.stock > 0
          ? 'Solo hay ' + l.producto.stock + ' unidad(es) de ' + l.producto.nombre + ' en stock'
          : l.producto.nombre + ' está agotado (stock 0). Registre la compra en Inventario o Compras antes de venderlo.');
      }
    });
  }

  function nombreUsuario(db, id) {
    var u = DB.buscarPorId(db, 'usuarios', id);
    return u ? u.nombre_usuario : '—';
  }

  // ======================= Autenticación =======================
  function sal() {
    var bytes = '';
    var aleatorio = global.crypto && global.crypto.getRandomValues
      ? global.crypto.getRandomValues(new Uint8Array(16))
      : null;
    for (var i = 0; i < 16; i++) {
      var b = aleatorio ? aleatorio[i] : Math.floor(Math.random() * 256);
      bytes += ('0' + b.toString(16)).slice(-2);
    }
    return bytes;
  }

  function hashPassword(password, salHex) {
    salHex = salHex || sal();
    var h = salHex + ':' + password;
    for (var i = 0; i < ITERACIONES_HASH; i++) h = sha256(salHex + h);
    return salHex + '$' + h;
  }

  function verificarPassword(password, almacenado) {
    var partes = String(almacenado || '').split('$');
    if (partes.length !== 2) return false;
    return hashPassword(password, partes[0]) === almacenado;
  }

  function leerSesion() {
    try {
      var texto = global.sessionStorage.getItem(CLAVE_SESION);
      return texto ? JSON.parse(texto) : null;
    } catch (e) {
      return sesionMemoria;
    }
  }
  var sesionMemoria = null;

  function guardarSesion(valor) {
    sesionMemoria = valor;
    try {
      if (valor) global.sessionStorage.setItem(CLAVE_SESION, JSON.stringify(valor));
      else global.sessionStorage.removeItem(CLAVE_SESION);
    } catch (e) {
      /* sin sessionStorage: se mantiene sólo en memoria */
    }
  }

  var Auth = {
    login: function (nombre, password) {
      var db = DB.datos();
      var usuario = null;
      db.usuarios.forEach(function (u) {
        if (u.nombre_usuario.toLowerCase() === String(nombre || '').trim().toLowerCase()) usuario = u;
      });
      if (!usuario || !usuario.activo || !verificarPassword(password, usuario.password_hash)) {
        falla('Usuario o contraseña incorrectos');
      }
      guardarSesion({ id: usuario.id });
      DB.tx(function (d) {
        auditar(d, usuario.id, 'InicioSesion', 'Usuario ' + usuario.nombre_usuario);
      });
      return Auth.usuario();
    },

    logout: function () {
      guardarSesion(null);
    },

    // Usuario actual, siempre leído de la base (por si fue desactivado).
    usuario: function () {
      var s = leerSesion();
      if (!s) return null;
      var u = DB.buscarPorId(DB.datos(), 'usuarios', s.id);
      if (!u || !u.activo) {
        guardarSesion(null);
        return null;
      }
      return { id: u.id, nombreUsuario: u.nombre_usuario, rol: u.rol };
    },

    esAdmin: function () {
      var u = Auth.usuario();
      return !!u && u.rol === 'ADMINISTRADOR';
    },

    requerirAdmin: function () {
      if (!Auth.esAdmin()) falla('Esta acción requiere rol ADMINISTRADOR');
    },

    hashPassword: hashPassword
  };

  function usuarioActualId() {
    var u = Auth.usuario();
    if (!u) falla('La sesión expiró. Vuelve a iniciar sesión.');
    return u.id;
  }

  // ======================= Datos iniciales =======================
  // Catálogo de ejemplo de una droguería (precios de referencia en pesos colombianos).
  var VERSION_CATALOGO = 'drogueria-4';
  var CATEGORIAS_DEMO = [
    { clave: 'med', nombre: 'Medicamentos' },
    { clave: 'analg', nombre: 'Analgésicos y antiinflamatorios', padre: 'med' },
    { clave: 'gripa', nombre: 'Antigripales', padre: 'med' },
    { clave: 'alerg', nombre: 'Antialérgicos', padre: 'med' },
    { clave: 'digest', nombre: 'Digestivos', padre: 'med' },
    { clave: 'vit', nombre: 'Vitaminas y suplementos' },
    { clave: 'personal', nombre: 'Cuidado personal' },
    { clave: 'aux', nombre: 'Primeros auxilios' },
    { clave: 'bebe', nombre: 'Bebé y maternidad' }
  ];
  var PRODUCTOS_DEMO = [
    { cat: 'analg', codigo_barras: '7705260181591', nombre: 'Acetaminofén 500 mg x 10 tabletas', precio_venta: 2500, stock: 60, stock_minimo: 20 },
    { cat: 'analg', codigo_barras: '7700830166138', nombre: 'Ibuprofeno 400 mg x 10 tabletas', precio_venta: 4200, stock: 45, stock_minimo: 15 },
    { cat: 'analg', codigo_barras: '7701860913907', nombre: 'Naproxeno 250 mg x 10 tabletas', precio_venta: 5800, stock: 20, stock_minimo: 10 },
    { cat: 'analg', codigo_barras: '7709960308241', nombre: 'Diclofenaco gel 1% x 50 g', precio_venta: 12500, stock: 8, stock_minimo: 5 },
    { cat: 'gripa', codigo_barras: '7706281948217', nombre: 'Antigripal día x 12 tabletas', precio_venta: 9800, stock: 30, stock_minimo: 10 },
    { cat: 'gripa', codigo_barras: '7709935181909', nombre: 'Jarabe para la tos x 120 ml', precio_venta: 14900, stock: 4, stock_minimo: 5 },
    { cat: 'alerg', codigo_barras: '7709378657979', nombre: 'Loratadina 10 mg x 10 tabletas', precio_venta: 3900, stock: 25, stock_minimo: 10 },
    { cat: 'digest', codigo_barras: '7705432319487', nombre: 'Omeprazol 20 mg x 14 cápsulas', precio_venta: 6500, stock: 35, stock_minimo: 10 },
    { cat: 'digest', codigo_barras: null, nombre: 'Sales de rehidratación oral (sobre)', precio_venta: 1800, stock: 40, stock_minimo: 15 },
    { cat: 'vit', codigo_barras: '7707574911864', nombre: 'Vitamina C 500 mg x 100 tabletas', precio_venta: 18900, stock: 12, stock_minimo: 5 },
    { cat: 'personal', codigo_barras: '7702527601892', nombre: 'Crema dental x 100 ml', precio_venta: 6900, stock: 24, stock_minimo: 8 },
    { cat: 'personal', codigo_barras: '7705559797113', nombre: 'Protector solar FPS 50 x 120 ml', precio_venta: 42000, stock: 6, stock_minimo: 3 },
    { cat: 'aux', codigo_barras: '7704710497466', nombre: 'Alcohol antiséptico 70% x 350 ml', precio_venta: 5500, stock: 18, stock_minimo: 6 },
    { cat: 'aux', codigo_barras: '7705075291706', nombre: 'Curas adhesivas x 20 unidades', precio_venta: 4500, stock: 3, stock_minimo: 5 },
    { cat: 'aux', codigo_barras: '7703423667128', nombre: 'Tapabocas desechable x 10 unidades', precio_venta: 5000, stock: 30, stock_minimo: 10 },
    { cat: 'aux', codigo_barras: '7707684268469', nombre: 'Suero fisiológico 0,9% x 500 ml', precio_venta: 7200, stock: 10, stock_minimo: 4 },
    { cat: 'bebe', codigo_barras: '7705632122337', nombre: 'Pañales etapa 3 x 30 unidades', precio_venta: 38500, stock: 7, stock_minimo: 4 }
  ];
  // Nombres del catálogo de ejemplo anterior (tienda de abarrotes).
  var PRODUCTOS_DEMO_ANTERIOR = ['Gaseosa 400ml', 'Arroz 500g', 'Jabón de baño'];

  function cargarCatalogoDemo(db) {
    var ids = {};
    CATEGORIAS_DEMO.forEach(function (c) {
      ids[c.clave] = DB.insertar(db, 'categorias', { nombre: c.nombre, categoria_padre_id: c.padre ? ids[c.padre] : null }).id;
    });
    PRODUCTOS_DEMO.forEach(function (d) {
      var p = DB.insertar(db, 'productos', {
        codigo_barras: d.codigo_barras,
        codigo_interno: generarCodigoInterno(db),
        nombre: d.nombre,
        descripcion: null,
        categoria_id: ids[d.cat],
        precio_venta: d.precio_venta,
        stock: d.stock,
        stock_minimo: d.stock_minimo,
        tasa_impuesto: null,
        activo: 1
      });
      movimiento(db, p.id, 'ENTRADA', p.stock, 'Stock inicial');
    });
  }

  function normalizarNombre(texto) {
    return String(texto || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  // Agrega el catálogo base (sin precio) sin duplicar productos ni categorías existentes.
  function agregarCatalogoBase(db) {
    var base = global.CATALOGO_BASE;
    if (!base) return 0;
    var porNombre = {};
    db.categorias.forEach(function (c) { porNombre[normalizarNombre(c.nombre)] = c.id; });
    var ids = {};
    base.categorias.forEach(function (c) {
      var id = porNombre[normalizarNombre(c.nombre)];
      if (!id) {
        id = DB.insertar(db, 'categorias', { nombre: c.nombre, categoria_padre_id: c.padre ? ids[c.padre] : null }).id;
        porNombre[normalizarNombre(c.nombre)] = id;
      }
      ids[c.clave] = id;
    });
    var existentes = {};
    var codigos = {};
    db.productos.forEach(function (p) {
      existentes[normalizarNombre(p.nombre)] = true;
      if (p.codigo_barras) codigos[p.codigo_barras] = true;
    });
    var agregados = 0;
    base.productos.forEach(function (fila) {
      if (existentes[normalizarNombre(fila[1])]) return;
      // Si el código ya lo tiene otro producto (p. ej. uno creado a mano al escanearlo), no se duplica.
      if (fila[2] && codigos[fila[2]]) return;
      if (fila[2]) codigos[fila[2]] = true;
      DB.insertar(db, 'productos', {
        codigo_barras: fila[2] || null,
        codigo_interno: generarCodigoInterno(db),
        nombre: fila[1],
        descripcion: null,
        categoria_id: ids[fila[0]] || null,
        precio_venta: 0,
        stock: 0,
        stock_minimo: 0,
        tasa_impuesto: null,
        activo: 1
      });
      existentes[normalizarNombre(fila[1])] = true;
      agregados++;
    });
    return agregados;
  }

  // Si la base aún tiene el catálogo de ejemplo anterior, lo cambia por el de droguería.
  // Sin ventas, se reemplaza por completo; con ventas, los productos viejos se
  // desactivan (para conservar el historial) y se agregan los nuevos.
  function migrarCatalogoDemo(db) {
    if (db.config.catalogoDemo) return false; // ya tiene un catálogo de droguería
    var soloDemo = db.productos.length > 0 && db.productos.every(function (p) {
      return PRODUCTOS_DEMO_ANTERIOR.indexOf(p.nombre) !== -1;
    });
    if (!soloDemo) return false;
    if (!db.ventas.length) {
      db.productos = [];
      db.movimientos = [];
      db.categorias = [];
    } else {
      db.productos.forEach(function (p) { p.activo = 0; });
    }
    cargarCatalogoDemo(db);
    if (db.config.nombreNegocio === 'Mi Negocio') db.config.nombreNegocio = 'Mi Droguería';
    if (!db.ventas.length) db.config.decimales = 0;
    return true;
  }

  function sembrar() {
    if (DB.existe()) {
      var d = DB.datos();
      if (d.config.catalogoDemo !== VERSION_CATALOGO) {
        DB.tx(function (db) {
          migrarCatalogoDemo(db);
          agregarCatalogoBase(db);
          db.config.catalogoDemo = VERSION_CATALOGO;
        });
      }
      return false;
    }
    DB.tx(function (db) {
      DB.insertar(db, 'usuarios', { nombre_usuario: 'admin', password_hash: hashPassword('admin123'), rol: 'ADMINISTRADOR', activo: 1 });
      DB.insertar(db, 'usuarios', { nombre_usuario: 'cajero', password_hash: hashPassword('cajero123'), rol: 'CAJERO', activo: 1 });
      cargarCatalogoDemo(db);
      agregarCatalogoBase(db);
      db.config.catalogoDemo = VERSION_CATALOGO;
      db.config.nombreNegocio = 'Mi Droguería';
      db.config.decimales = 0;
      db.config.primerUso = true;
    });
    return true;
  }

  // ======================= Categorías =======================
  var Categorias = {
    listar: function () {
      return copia(DB.datos().categorias).sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
    },

    crear: function (datos) {
      Auth.requerirAdmin();
      var nombre = String(datos.nombre || '').trim();
      if (!nombre) falla('El nombre de la categoría es obligatorio');
      return DB.tx(function (db) {
        return DB.insertar(db, 'categorias', { nombre: nombre, categoria_padre_id: datos.categoriaPadreId ? Number(datos.categoriaPadreId) : null });
      });
    },

    actualizar: function (id, datos) {
      Auth.requerirAdmin();
      var nombre = String(datos.nombre || '').trim();
      if (!nombre) falla('El nombre de la categoría es obligatorio');
      var padre = datos.categoriaPadreId ? Number(datos.categoriaPadreId) : null;
      if (padre && padre === Number(id)) falla('Una categoría no puede ser su propia categoría padre');
      return DB.tx(function (db) {
        var c = DB.buscarPorId(db, 'categorias', id);
        if (!c) falla('Categoría no encontrada');
        // evitar ciclos (A -> B -> A)
        var actual = padre ? DB.buscarPorId(db, 'categorias', padre) : null;
        while (actual) {
          if (actual.id === c.id) falla('Esa categoría padre crearía un ciclo');
          actual = actual.categoria_padre_id ? DB.buscarPorId(db, 'categorias', actual.categoria_padre_id) : null;
        }
        c.nombre = nombre;
        c.categoria_padre_id = padre;
        return c;
      });
    },

    eliminar: function (id) {
      Auth.requerirAdmin();
      id = Number(id);
      DB.tx(function (db) {
        if (!DB.buscarPorId(db, 'categorias', id)) falla('Categoría no encontrada');
        if (db.categorias.some(function (c) { return c.categoria_padre_id === id; })) {
          falla('La categoría tiene subcategorías. Elimínalas o muévelas primero.');
        }
        db.productos.forEach(function (p) {
          if (p.categoria_id === id) p.categoria_id = null;
        });
        db.categorias = db.categorias.filter(function (c) { return c.id !== id; });
      });
    }
  };

  // ======================= Productos =======================
  function conCategoria(db, p) {
    var r = copia(p);
    var c = p.categoria_id ? DB.buscarPorId(db, 'categorias', p.categoria_id) : null;
    r.categoria_nombre = c ? c.nombre : null;
    return r;
  }

  function generarCodigoInterno(db) {
    var max = 0;
    db.productos.forEach(function (p) {
      if (p.codigo_interno && p.codigo_interno.charAt(0) === PREFIJO_CODIGO_INTERNO) {
        var n = Number(p.codigo_interno);
        if (n > max) max = n;
      }
    });
    var siguiente = max ? max + 1 : Number(PREFIJO_CODIGO_INTERNO + '00001');
    var texto = String(siguiente);
    while (texto.length < LONGITUD_CODIGO_INTERNO) texto = '0' + texto;
    return texto;
  }

  // Solo alerta si el producto tiene un stock mínimo configurado.
  function stockBajo(p) {
    return p.stock_minimo > 0 && p.stock <= p.stock_minimo;
  }

  function codigoEnUso(db, codigo, exceptoId) {
    return db.productos.some(function (p) {
      return p.id !== exceptoId && (p.codigo_barras === codigo || p.codigo_interno === codigo);
    });
  }

  var Productos = {
    listar: function (opciones) {
      var db = DB.datos();
      var soloActivos = opciones && opciones.soloActivos;
      return db.productos
        .filter(function (p) { return !soloActivos || p.activo; })
        .map(function (p) { return conCategoria(db, p); })
        .sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
    },

    buscar: function (termino) {
      termino = String(termino || '').trim();
      if (!termino) return [];
      var bajo = termino.toLowerCase();
      var db = DB.datos();
      return db.productos
        .filter(function (p) {
          return p.activo && (
            p.nombre.toLowerCase().indexOf(bajo) !== -1 ||
            p.codigo_barras === termino ||
            p.codigo_interno === termino
          );
        })
        .map(function (p) { return conCategoria(db, p); })
        .sort(function (a, b) { return a.nombre.localeCompare(b.nombre); })
        .slice(0, 50);
    },

    obtenerPorCodigo: function (codigo) {
      codigo = String(codigo || '').trim();
      if (!codigo) return null;
      var db = DB.datos();
      for (var i = 0; i < db.productos.length; i++) {
        var p = db.productos[i];
        if (p.activo && (p.codigo_barras === codigo || p.codigo_interno === codigo)) return conCategoria(db, p);
      }
      return null;
    },

    obtener: function (id) {
      var db = DB.datos();
      var p = DB.buscarPorId(db, 'productos', id);
      return p ? conCategoria(db, p) : null;
    },

    crear: function (datos) {
      Auth.requerirAdmin();
      var usuarioId = usuarioActualId();
      var nombre = String(datos.nombre || '').trim();
      if (!nombre) falla('El nombre del producto es obligatorio');
      var codigoBarras = String(datos.codigoBarras || '').trim() || null;
      return DB.tx(function (db) {
        if (codigoBarras && codigoEnUso(db, codigoBarras)) falla('Ya existe un producto con ese código de barras');
        var stock = U.numero(datos.stock);
        var p = DB.insertar(db, 'productos', {
          codigo_barras: codigoBarras,
          codigo_interno: generarCodigoInterno(db),
          nombre: nombre,
          descripcion: String(datos.descripcion || '').trim() || null,
          categoria_id: datos.categoriaId ? Number(datos.categoriaId) : null,
          precio_venta: U.numero(datos.precioVenta),
          costo: U.numero(datos.precioCompra) || 0,
          stock: stock,
          stock_minimo: U.numero(datos.stockMinimo),
          tasa_impuesto: null,
          activo: 1
        });
        if (stock) movimiento(db, p.id, 'ENTRADA', stock, 'Stock inicial');
        auditar(db, usuarioId, 'CreacionProducto', 'Producto ' + p.nombre + ' (#' + p.id + ')');
        return p;
      });
    },

    actualizar: function (id, datos) {
      Auth.requerirAdmin();
      var usuarioId = usuarioActualId();
      return DB.tx(function (db) {
        var p = DB.buscarPorId(db, 'productos', id);
        if (!p) falla('Producto no encontrado');
        if (datos.nombre !== undefined) {
          var nombre = String(datos.nombre).trim();
          if (!nombre) falla('El nombre del producto es obligatorio');
          p.nombre = nombre;
        }
        if (datos.codigoBarras !== undefined) {
          var codigo = String(datos.codigoBarras || '').trim() || null;
          if (codigo && codigoEnUso(db, codigo, p.id)) falla('Ya existe un producto con ese código de barras');
          p.codigo_barras = codigo;
        }
        if (datos.descripcion !== undefined) p.descripcion = String(datos.descripcion || '').trim() || null;
        if (datos.categoriaId !== undefined) p.categoria_id = datos.categoriaId ? Number(datos.categoriaId) : null;
        if (datos.precioVenta !== undefined) {
          var precio = U.numero(datos.precioVenta);
          if (precio !== p.precio_venta) {
            auditar(db, usuarioId, 'AjustePrecio', 'Producto ' + p.nombre + ' (#' + p.id + '): ' + p.precio_venta + ' -> ' + precio);
          }
          p.precio_venta = precio;
        }
        if (datos.precioCompra !== undefined) {
          var compra = U.numero(datos.precioCompra) || 0;
          if (compra !== (p.costo || 0)) {
            auditar(db, usuarioId, 'AjusteCosto', 'Producto ' + p.nombre + ' (#' + p.id + '): precio de compra ' + (p.costo || 0) + ' -> ' + compra);
          }
          p.costo = compra;
        }
        if (datos.stockMinimo !== undefined) p.stock_minimo = U.numero(datos.stockMinimo);
        if (datos.activo !== undefined) p.activo = datos.activo ? 1 : 0;
        return p;
      });
    },

    // Igual que en el backend: "eliminar" desactiva, para no romper el historial de ventas.
    stockBajo: stockBajo,

    desactivar: function (id) {
      return Productos.actualizar(id, { activo: false });
    },

    // Un producto con ventas o compras no se puede borrar (se perdería el historial):
    // en ese caso se desactiva. Sin historial, se elimina por completo.
    enUso: function (id) {
      var db = DB.datos();
      id = Number(id);
      return db.ventas.some(function (v) { return v.detalle.some(function (d) { return d.producto_id === id; }); }) ||
        db.compras.some(function (c) { return c.lineas.some(function (l) { return l.producto_id === id; }); });
    },

    eliminar: function (ids) {
      Auth.requerirAdmin();
      var usuarioId = usuarioActualId();
      ids = [].concat(ids).map(Number);
      return DB.tx(function (db) {
        var borrados = [], desactivados = [];
        ids.forEach(function (id) {
          var p = DB.buscarPorId(db, 'productos', id);
          if (!p) return;
          var usado = db.ventas.some(function (v) { return v.detalle.some(function (d) { return d.producto_id === id; }); }) ||
            db.compras.some(function (c) { return c.lineas.some(function (l) { return l.producto_id === id; }); });
          if (usado) {
            p.activo = 0;
            desactivados.push(p.nombre);
            return;
          }
          db.productos = db.productos.filter(function (x) { return x.id !== id; });
          db.movimientos = db.movimientos.filter(function (m) { return m.producto_id !== id; });
          db.codigos_proveedor = db.codigos_proveedor.filter(function (m) { return m.producto_id !== id; });
          db.lotes = db.lotes.filter(function (l) { return l.producto_id !== id; });
          borrados.push(p.nombre);
        });
        if (borrados.length) auditar(db, usuarioId, 'EliminacionProducto', borrados.length + ' producto(s) eliminados: ' + borrados.slice(0, 20).join(', ') + (borrados.length > 20 ? '…' : ''));
        if (desactivados.length) auditar(db, usuarioId, 'DesactivacionProducto', desactivados.length + ' producto(s) con historial desactivados: ' + desactivados.slice(0, 20).join(', '));
        return { eliminados: borrados.length, desactivados: desactivados };
      });
    },

    listarStockBajo: function () {
      return Productos.listar({ soloActivos: true }).filter(stockBajo);
    }
  };

  // ======================= Inventario =======================
  var Inventario = {
    registrarEntrada: function (datos) {
      Auth.requerirAdmin();
      var usuarioId = usuarioActualId();
      var cant = U.numero(datos.cantidad);
      if (!cant || cant <= 0) falla('La cantidad debe ser mayor a cero');
      var referencia = String(datos.referencia || '').trim() || 'Reabastecimiento';
      return DB.tx(function (db) {
        var p = DB.buscarPorId(db, 'productos', datos.productoId);
        if (!p) falla('Producto no encontrado');
        p.stock += cant;
        movimiento(db, p.id, 'ENTRADA', cant, referencia);
        auditar(db, usuarioId, 'EntradaInventario', 'Producto ' + p.nombre + ' (#' + p.id + '): +' + cant + ' (' + referencia + ')');
        return p;
      });
    },

    ajustarManual: function (datos) {
      Auth.requerirAdmin();
      var usuarioId = usuarioActualId();
      if (datos.nuevoStock === '' || datos.nuevoStock === null || !isFinite(Number(datos.nuevoStock))) {
        falla('Indica el nuevo stock');
      }
      var nuevo = Number(datos.nuevoStock);
      var motivo = String(datos.motivo || '').trim();
      return DB.tx(function (db) {
        var p = DB.buscarPorId(db, 'productos', datos.productoId);
        if (!p) falla('Producto no encontrado');
        var anterior = p.stock;
        var delta = nuevo - anterior;
        p.stock = nuevo;
        movimiento(db, p.id, 'AJUSTE_MANUAL', delta, motivo || 'Ajuste manual');
        auditar(db, usuarioId, 'AjusteInventario', 'Producto ' + p.nombre + ' (#' + p.id + '): ' + anterior + ' -> ' + nuevo + '. Motivo: ' + (motivo || 'N/A'));
        return p;
      });
    },

    listarMovimientos: function (filtros) {
      var db = DB.datos();
      var productoId = filtros && filtros.productoId ? Number(filtros.productoId) : null;
      return db.movimientos
        .filter(function (m) { return !productoId || m.producto_id === productoId; })
        .map(function (m) {
          var r = copia(m);
          var p = DB.buscarPorId(db, 'productos', m.producto_id);
          r.producto_nombre = p ? p.nombre : '#' + m.producto_id;
          return r;
        })
        .reverse()
        .slice(0, 500);
    }
  };

  // ======================= Turnos de caja =======================
  // Gastos y pedidos pagados durante el turno (los anulados no cuentan).
  function gastosTurno(db, turnoId) {
    return db.gastos.filter(function (g) { return g.turno_caja_id === turnoId && g.estado !== 'ANULADO'; });
  }

  function gastosEfectivoTurno(db, turnoId) {
    return U.redondear(gastosTurno(db, turnoId).reduce(function (a, g) {
      return a + (g.metodo_pago === 'EFECTIVO' ? g.monto : 0);
    }, 0));
  }

  // Lo que debe haber en el cajón: base + ventas en efectivo - gastos pagados en efectivo.
  function efectivoEsperadoTurno(db, t) {
    return U.redondear(t.base_inicial_efectivo + efectivoVentasTurno(db, t.id) - gastosEfectivoTurno(db, t.id));
  }

  function efectivoVentasTurno(db, turnoId) {
    var total = 0;
    db.ventas.forEach(function (v) {
      if (v.turno_caja_id === turnoId && v.estado === 'COMPLETADA') {
        v.pagos.forEach(function (pg) {
          if (pg.metodo_pago === 'EFECTIVO') total += pg.monto;
        });
      }
    });
    return U.redondear(total);
  }

  var Turnos = {
    actual: function () {
      var db = DB.datos();
      for (var i = db.turnos.length - 1; i >= 0; i--) {
        if (db.turnos[i].estado === 'ABIERTO') return copia(db.turnos[i]);
      }
      return null;
    },

    abrir: function (baseInicial) {
      var usuarioId = usuarioActualId();
      return DB.tx(function (db) {
        if (db.turnos.some(function (t) { return t.estado === 'ABIERTO'; })) {
          falla('Ya hay un turno de caja abierto. Ciérralo antes de abrir uno nuevo.');
        }
        var t = DB.insertar(db, 'turnos', {
          usuario_apertura_id: usuarioId,
          fecha_hora_apertura: U.ahora(),
          base_inicial_efectivo: U.numero(baseInicial),
          usuario_cierre_id: null,
          fecha_hora_cierre: null,
          efectivo_contado: null,
          diferencia_arqueo: null,
          estado: 'ABIERTO'
        });
        auditar(db, usuarioId, 'AperturaTurno', 'Turno #' + t.id + ', base ' + t.base_inicial_efectivo);
        return t;
      });
    },

    cerrar: function (id, efectivoContado) {
      var usuarioId = usuarioActualId();
      if (efectivoContado === '' || efectivoContado === null || !isFinite(Number(efectivoContado))) {
        falla('Indica el efectivo contado');
      }
      return DB.tx(function (db) {
        var t = DB.buscarPorId(db, 'turnos', id);
        if (!t) falla('Turno no encontrado');
        if (t.estado !== 'ABIERTO') falla('El turno ya está cerrado');
        var esperado = efectivoEsperadoTurno(db, t);
        t.usuario_cierre_id = usuarioId;
        t.fecha_hora_cierre = U.ahora();
        t.efectivo_contado = Number(efectivoContado);
        t.diferencia_arqueo = U.redondear(t.efectivo_contado - esperado);
        t.estado = 'CERRADO';
        auditar(db, usuarioId, 'CierreTurno', 'Turno #' + t.id + ', diferencia ' + t.diferencia_arqueo);
        var r = copia(t);
        r.efectivoEsperado = esperado;
        return r;
      });
    },

    listar: function () {
      return copia(DB.datos().turnos).reverse();
    },

    // Corrige la base del turno abierto (p. ej. el cajero la abrió sin el admin y contó mal).
    ajustarBase: function (id, nuevaBase, motivo) {
      var usuarioId = usuarioActualId();
      if (nuevaBase === '' || nuevaBase === null || !isFinite(Number(nuevaBase)) || Number(nuevaBase) < 0) falla('Indica la base correcta');
      return DB.tx(function (db) {
        var t = DB.buscarPorId(db, 'turnos', id);
        if (!t) falla('Turno no encontrado');
        if (t.estado !== 'ABIERTO') falla('Solo se puede ajustar la base de un turno abierto');
        var anterior = t.base_inicial_efectivo;
        t.base_inicial_efectivo = U.redondear(nuevaBase);
        auditar(db, usuarioId, 'AjusteBaseTurno', 'Turno #' + t.id + ': base ' + anterior + ' -> ' + t.base_inicial_efectivo +
          (String(motivo || '').trim() ? '. Motivo: ' + String(motivo).trim() : ''));
        return copia(t);
      });
    },

    // Último turno si está cerrado y no hay otro abierto después: es el único que se puede reabrir.
    ultimoCerrado: function () {
      var turnos = DB.datos().turnos;
      var ultimo = turnos[turnos.length - 1];
      return ultimo && ultimo.estado === 'CERRADO' ? copia(ultimo) : null;
    },

    // Deshace un cierre hecho por error: el turno vuelve a quedar abierto con sus
    // ventas, y se borra el arqueo. Queda registrado en auditoría.
    reabrir: function (id) {
      Auth.requerirAdmin();
      var usuarioId = usuarioActualId();
      return DB.tx(function (db) {
        var t = DB.buscarPorId(db, 'turnos', id);
        if (!t) falla('Turno no encontrado');
        if (t.estado !== 'CERRADO') falla('El turno no está cerrado');
        if (db.turnos[db.turnos.length - 1].id !== t.id) {
          falla('Solo se puede reabrir el último turno. Después de este ya se abrió otro.');
        }
        auditar(db, usuarioId, 'ReaperturaTurno', 'Turno #' + t.id + ' reabierto. Cierre anulado: ' + t.fecha_hora_cierre +
          ' por ' + nombreUsuario(db, t.usuario_cierre_id) + ', contado ' + t.efectivo_contado + ', diferencia ' + t.diferencia_arqueo);
        t.estado = 'ABIERTO';
        t.usuario_cierre_id = null;
        t.fecha_hora_cierre = null;
        t.efectivo_contado = null;
        t.diferencia_arqueo = null;
        return copia(t);
      });
    },

    efectivoEsperado: function (id) {
      var db = DB.datos();
      var t = DB.buscarPorId(db, 'turnos', id);
      return t ? efectivoEsperadoTurno(db, t) : 0;
    }
  };

  // ======================= Ventas =======================
  function ventaCompleta(db, v) {
    var r = copia(v);
    r.nombre_usuario = nombreUsuario(db, v.usuario_id);
    var c = v.cliente_id ? DB.buscarPorId(db, 'clientes', v.cliente_id) : null;
    r.cliente_nombre = c ? c.nombre : null;
    r.cliente_documento = c ? c.documento : null;
    r.detalle.forEach(function (d) {
      var p = DB.buscarPorId(db, 'productos', d.producto_id);
      d.producto_nombre = p ? p.nombre : '#' + d.producto_id;
    });
    r.tipo = v.tipo || 'VENTA';
    if (r.tipo === 'VENTA') r.cambios = cambiosDe(db, v.id).map(function (c) { return c.id; });
    return r;
  }

  function cambiosDe(db, ventaId) {
    return db.ventas.filter(function (x) { return x.tipo === 'CAMBIO' && x.venta_origen_id === ventaId && x.estado === 'COMPLETADA'; });
  }

  function composicionDe(db, origen) {
    var mapa = {};
    var orden = [];
    [origen].concat(cambiosDe(db, origen.id)).forEach(function (v) {
      v.detalle.forEach(function (d) {
        var l = mapa[d.producto_id];
        if (!l) {
          var p = DB.buscarPorId(db, 'productos', d.producto_id);
          l = mapa[d.producto_id] = { productoId: d.producto_id, nombre: p ? p.nombre : '#' + d.producto_id, cantidad: 0, precio: d.precio_unitario };
          orden.push(l);
        }
        l.cantidad += d.cantidad;
        if (d.cantidad > 0) l.precio = d.precio_unitario;
      });
    });
    return orden.filter(function (l) { return l.cantidad > 0; }).map(copia);
  }

  var Ventas = {
    METODOS_PAGO: METODOS_PAGO,
    nombreMetodo: nombreMetodo,

    crear: function (datos) {
      var usuarioId = usuarioActualId();
      var items = datos.items || [];
      var pagos = datos.pagos || [];
      if (!items.length) falla('La venta debe tener al menos un producto');
      if (!pagos.length) falla('La venta debe tener al menos un pago');

      var idVenta = DB.tx(function (db) {
        var turno = DB.buscarPorId(db, 'turnos', datos.turnoCajaId);
        if (!turno || turno.estado !== 'ABIERTO') falla('El turno de caja indicado no está abierto');

        var lineas = items.map(function (item) {
          var p = DB.buscarPorId(db, 'productos', item.productoId);
          if (!p || !p.activo) falla('Producto ' + item.productoId + ' no existe o está inactivo');
          var cantidad = Number(item.cantidad);
          if (!cantidad || cantidad <= 0) falla('Cantidad inválida para el producto ' + p.nombre);
          var precio = item.precioUnitario !== undefined ? Number(item.precioUnitario) : p.precio_venta;
          return { producto: p, cantidad: cantidad, precio: precio, subtotal: U.redondear(cantidad * precio) };
        });
        if (!db.config.permitirVentaSinStock) validarStock(lineas);

        var total = U.redondear(lineas.reduce(function (a, l) { return a + l.subtotal; }, 0));
        var totalPagos = U.redondear(pagos.reduce(function (a, p) { return a + Number(p.monto || 0); }, 0));
        if (Math.abs(totalPagos - total) > EPSILON) {
          falla('La suma de los pagos (' + totalPagos.toFixed(2) + ') no coincide con el total de la venta (' + total.toFixed(2) + ')');
        }
        pagos.forEach(function (p) {
          if (METODOS_PAGO.indexOf(p.metodoPago) === -1) falla('Método de pago inválido: ' + p.metodoPago);
          if (Number(p.monto) < 0) falla('Los montos de pago no pueden ser negativos');
        });

        var clienteId = null;
        var cliente = datos.cliente || {};
        var nombreCliente = String(cliente.nombre || '').trim();
        var documento = String(cliente.documento || '').trim();
        if (nombreCliente || documento) {
          var existente = documento ? db.clientes.filter(function (c) { return c.documento === documento; })[0] : null;
          if (existente) {
            if (nombreCliente) existente.nombre = nombreCliente;
            clienteId = existente.id;
          } else {
            clienteId = DB.insertar(db, 'clientes', { nombre: nombreCliente || null, documento: documento || null }).id;
          }
        }

        var venta = DB.insertar(db, 'ventas', {
          turno_caja_id: turno.id,
          usuario_id: usuarioId,
          cliente_id: clienteId,
          fecha_hora: U.ahora(),
          total: total,
          estado: 'COMPLETADA',
          motivo_anulacion: null,
          fecha_hora_anulacion: null,
          usuario_anulacion_id: null,
          detalle: [],
          pagos: []
        });

        lineas.forEach(function (l) {
          venta.detalle.push({ producto_id: l.producto.id, cantidad: l.cantidad, precio_unitario: l.precio, subtotal: l.subtotal });
          l.producto.stock -= l.cantidad;
          movimiento(db, l.producto.id, 'SALIDA_POR_VENTA', -l.cantidad, 'Venta #' + venta.id);
        });
        pagos.forEach(function (p) {
          venta.pagos.push({ metodo_pago: p.metodoPago, monto: U.redondear(p.monto) });
        });
        return venta.id;
      });

      var db = DB.datos();
      var venta = DB.buscarPorId(db, 'ventas', idVenta);
      var alertasStock = [];
      venta.detalle.forEach(function (d) {
        var p = DB.buscarPorId(db, 'productos', d.producto_id);
        if (p && stockBajo(p)) {
          alertasStock.push({ productoId: p.id, nombre: p.nombre, stock: p.stock, stockMinimo: p.stock_minimo, agotado: p.stock <= 0 });
        }
      });
      return { venta: ventaCompleta(db, venta), alertasStock: alertasStock };
    },

    obtener: function (id) {
      var db = DB.datos();
      var v = DB.buscarPorId(db, 'ventas', id);
      if (!v) falla('Venta no encontrada');
      return ventaCompleta(db, v);
    },

    listar: function (filtros) {
      filtros = filtros || {};
      var db = DB.datos();
      return db.ventas
        .filter(function (v) {
          if (filtros.turnoId && v.turno_caja_id !== Number(filtros.turnoId)) return false;
          if (filtros.estado && v.estado !== filtros.estado) return false;
          if (filtros.desde && v.fecha_hora < filtros.desde) return false;
          if (filtros.hasta && v.fecha_hora > filtros.hasta + ' 23:59:59') return false;
          return true;
        })
        .map(function (v) { return ventaCompleta(db, v); })
        .reverse()
        .slice(0, filtros.limite || 200);
    },

    // Productos que el cliente tiene hoy de una venta: la venta original más todos
    // sus cambios. Devuelve [{ productoId, nombre, cantidad, precio }].
    composicion: function (ventaId) {
      var db = DB.datos();
      var v = DB.buscarPorId(db, 'ventas', ventaId);
      if (!v) falla('Venta no encontrada');
      return composicionDe(db, v.tipo === 'CAMBIO' ? DB.buscarPorId(db, 'ventas', v.venta_origen_id) : v);
    },

    /*
     * Cambio de productos de una venta ya cobrada. `datos.items` es la NUEVA
     * composición completa [{ productoId, cantidad }]. Se registra como un
     * movimiento aparte (tipo CAMBIO) en el turno abierto, enlazado a la venta:
     *  - Diferencia a pagar  -> el cliente la paga (datos.pagos).
     *  - Diferencia a favor  -> por norma NO se devuelve dinero: queda como saldo
     *    retenido. Excepcionalmente un administrador puede devolverla
     *    (datos.reembolso = { metodoPago, motivo }).
     * Lo devuelto vuelve al inventario y lo nuevo sale de él.
     */
    cambiar: function (ventaId, datos) {
      var usuario = Auth.usuario();
      if (!usuario) falla('La sesión expiró. Vuelve a iniciar sesión.');
      var idCambio = DB.tx(function (db) {
        var origen = DB.buscarPorId(db, 'ventas', ventaId);
        if (!origen) falla('Venta no encontrada');
        if (origen.tipo === 'CAMBIO') origen = DB.buscarPorId(db, 'ventas', origen.venta_origen_id);
        if (origen.estado !== 'COMPLETADA') falla('Solo se pueden cambiar productos de una venta completada');
        var turno = db.turnos.filter(function (t) { return t.estado === 'ABIERTO'; })[0];
        if (!turno) falla('Abre un turno de caja para registrar el cambio');

        var actual = {};
        composicionDe(db, origen).forEach(function (l) { actual[l.productoId] = l; });
        var nueva = {};
        (datos.items || []).forEach(function (it) {
          var cant = Number(it.cantidad);
          if (!isFinite(cant) || cant < 0) falla('Cantidad inválida');
          if (cant > 0) nueva[Number(it.productoId)] = (nueva[Number(it.productoId)] || 0) + cant;
        });

        var lineas = [];
        var ids = {};
        Object.keys(actual).concat(Object.keys(nueva)).forEach(function (k) { ids[k] = true; });
        Object.keys(ids).forEach(function (k) {
          var id = Number(k);
          var antes = actual[id] ? actual[id].cantidad : 0;
          var despues = nueva[id] || 0;
          var delta = despues - antes;
          if (!delta) return;
          var p = DB.buscarPorId(db, 'productos', id);
          if (!p) falla('Producto ' + id + ' no encontrado');
          var precio;
          if (delta < 0) {
            precio = actual[id].precio; // se reconoce lo que el cliente pagó
          } else {
            if (!p.activo) falla(p.nombre + ' está inactivo');
            if (!(p.precio_venta > 0)) falla(p.nombre + ' no tiene precio');
            precio = p.precio_venta;
          }
          lineas.push({ producto: p, cantidad: delta, precio: precio, subtotal: U.redondear(delta * precio) });
          if (delta > 0 && !db.config.permitirVentaSinStock) validarStock([{ producto: p, cantidad: delta }]);
        });
        if (!lineas.length) falla('No hay cambios: la venta quedó igual');

        var diferencia = U.redondear(lineas.reduce(function (a, l) { return a + l.subtotal; }, 0));
        var pagos = [];
        var saldoRetenido = 0;
        var motivoReembolso = null;
        if (diferencia > EPSILON) {
          pagos = (datos.pagos || []).filter(function (x) { return Number(x.monto) > 0; });
          var pagado = U.redondear(pagos.reduce(function (a, x) { return a + Number(x.monto); }, 0));
          if (Math.abs(pagado - diferencia) > EPSILON) {
            falla('El cliente debe pagar la diferencia de ' + diferencia.toFixed(2) + ' (registrado: ' + pagado.toFixed(2) + ')');
          }
          pagos.forEach(function (x) { if (METODOS_PAGO.indexOf(x.metodoPago) === -1) falla('Método de pago inválido'); });
          pagos = pagos.map(function (x) { return { metodo_pago: x.metodoPago, monto: U.redondear(x.monto) }; });
        } else if (diferencia < -EPSILON) {
          if (datos.reembolso) {
            if (usuario.rol !== 'ADMINISTRADOR') falla('Solo un administrador puede autorizar una devolución de dinero');
            motivoReembolso = String(datos.reembolso.motivo || '').trim();
            if (!motivoReembolso) falla('Indica el motivo de la devolución de dinero');
            if (METODOS_PAGO.indexOf(datos.reembolso.metodoPago) === -1) falla('Método de devolución inválido');
            pagos = [{ metodo_pago: datos.reembolso.metodoPago, monto: diferencia }];
          } else {
            saldoRetenido = -diferencia; // política: no se devuelve dinero
          }
        }

        var cambio = DB.insertar(db, 'ventas', {
          tipo: 'CAMBIO',
          venta_origen_id: origen.id,
          turno_caja_id: turno.id,
          usuario_id: usuario.id,
          cliente_id: origen.cliente_id || null,
          fecha_hora: U.ahora(),
          total: U.redondear(diferencia + saldoRetenido),
          diferencia: diferencia,
          saldo_retenido: saldoRetenido,
          motivo_reembolso: motivoReembolso,
          nota: String(datos.nota || '').trim() || null,
          estado: 'COMPLETADA',
          motivo_anulacion: null,
          fecha_hora_anulacion: null,
          usuario_anulacion_id: null,
          detalle: [],
          pagos: pagos
        });
        lineas.forEach(function (l) {
          cambio.detalle.push({ producto_id: l.producto.id, cantidad: l.cantidad, precio_unitario: l.precio, subtotal: l.subtotal });
          l.producto.stock -= l.cantidad;
          movimiento(db, l.producto.id, l.cantidad < 0 ? 'DEVOLUCION_CAMBIO' : 'SALIDA_POR_CAMBIO', -l.cantidad,
            'Cambio #' + cambio.id + ' (venta #' + origen.id + ')');
        });
        auditar(db, usuario.id, motivoReembolso ? 'CambioConDevolucion' : 'CambioVenta',
          'Cambio #' + cambio.id + ' de la venta #' + origen.id + '. Diferencia ' + diferencia +
          (saldoRetenido ? ', saldo a favor no devuelto ' + saldoRetenido : '') +
          (motivoReembolso ? ', devuelto en ' + datos.reembolso.metodoPago + '. Motivo: ' + motivoReembolso : ''));
        return cambio.id;
      });
      return Ventas.obtener(idCambio);
    },

    anular: function (id, motivo) {
      var usuarioId = usuarioActualId();
      motivo = String(motivo || '').trim();
      if (!motivo) falla('El motivo de anulación es obligatorio');
      DB.tx(function (db) {
        var v = DB.buscarPorId(db, 'ventas', id);
        if (!v) falla('Venta no encontrada');
        if (v.estado === 'ANULADA') falla('La venta ya está anulada');
        if (v.tipo === 'CAMBIO') falla('Un cambio no se anula. Si hay que corregirlo, registre otro cambio sobre la venta #' + v.venta_origen_id + '.');
        if (cambiosDe(db, v.id).length) falla('La venta tiene cambios de productos registrados. Use "Cambiar" para ajustar los productos.');
        v.estado = 'ANULADA';
        v.motivo_anulacion = motivo;
        v.fecha_hora_anulacion = U.ahora();
        v.usuario_anulacion_id = usuarioId;
        v.detalle.forEach(function (d) {
          var p = DB.buscarPorId(db, 'productos', d.producto_id);
          if (p) p.stock += d.cantidad;
          movimiento(db, d.producto_id, 'AJUSTE_ANULACION', d.cantidad, 'Anulación venta #' + v.id);
        });
        auditar(db, usuarioId, 'AnulacionVenta', 'Venta #' + v.id + ' anulada. Motivo: ' + motivo);
      });
      return Ventas.obtener(id);
    }
  };

  // ======================= Gastos del turno =======================
  var TIPOS_GASTO = ['Pedidos', 'Servicios', 'Sueldos', 'Otros'];
  var CLASES_SUELDO = { ADELANTO: 'Adelanto', PAGO_SEMANA: 'Pago de la semana' };
  var MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function fechaISO(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  // Lunes (YYYY-MM-DD) de la semana de la fecha dada; los sueldos se liquidan de lunes a domingo.
  function lunesDe(fecha) {
    var p = String(fecha || U.ahora()).slice(0, 10).split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return fechaISO(d);
  }
  function nombreSemana(lunes) {
    var p = lunes.split('-');
    var ini = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    var fin = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 6);
    return ini.getDate() + ' ' + MESES_CORTOS[ini.getMonth()] + ' al ' + fin.getDate() + ' ' + MESES_CORTOS[fin.getMonth()];
  }

  // ======================= Compras a proveedores =======================
  // Fecha de vencimiento escrita como 01.06.2029, 01/06/2029 o 2029-06-01 -> 2029-06-01.
  function fechaCompra(texto) {
    var t = String(texto || '').trim();
    if (!t) return null;
    var m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
    m = t.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
    if (m) {
      var anio = m[3].length === 2 ? '20' + m[3] : m[3];
      return anio + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
    }
    m = t.match(/^(\d{1,2})[.\/-](\d{4})$/); // 06/2029 -> último día no importa: día 01
    if (m) return m[2] + '-' + ('0' + m[1]).slice(-2) + '-01';
    return null;
  }

  // Algunos proveedores usan el primer dígito del código para el tipo de línea
  // (1000016141 compra, 2000016141 bonificación): se compara sin ese prefijo.
  function codigoNormalizado(proveedor, codigo) {
    var c = String(codigo || '').trim();
    if (!c) return '';
    if (proveedor && proveedor.codigo_sin_prefijo && /^\d{8,}$/.test(c)) c = c.slice(1).replace(/^0+/, '') || '0';
    return c.toUpperCase();
  }

  var Proveedores = {
    listar: function () {
      return DB.datos().proveedores.map(copia).sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
    },
    guardar: function (datos) {
      Auth.requerirAdmin();
      var usuarioId = usuarioActualId();
      var nombre = String(datos.nombre || '').trim();
      if (!nombre) falla('Escribe el nombre del proveedor');
      return DB.tx(function (db) {
        var dup = db.proveedores.filter(function (x) { return x.nombre.toLowerCase() === nombre.toLowerCase() && x.id !== Number(datos.id); })[0];
        if (dup) falla('Ya existe el proveedor ' + nombre);
        var pr;
        if (datos.id) {
          pr = DB.buscarPorId(db, 'proveedores', datos.id);
          if (!pr) falla('Proveedor no encontrado');
        } else {
          pr = DB.insertar(db, 'proveedores', { nombre: nombre });
        }
        pr.nombre = nombre;
        pr.nit = String(datos.nit || '').trim() || null;
        pr.codigo_sin_prefijo = !!datos.codigoSinPrefijo;
        auditar(db, usuarioId, 'Proveedor', 'Proveedor ' + nombre);
        return copia(pr);
      });
    }
  };

  var Compras = {
    fecha: fechaCompra,

    // Busca el producto de una línea de factura: primero por el código del
    // proveedor ya aprendido, luego por código de barras (EAN).
    emparejar: function (proveedorId, codigo, ean) {
      var db = DB.datos();
      var pr = DB.buscarPorId(db, 'proveedores', proveedorId);
      var cod = codigoNormalizado(pr, codigo);
      if (cod) {
        var m = db.codigos_proveedor.filter(function (x) { return x.proveedor_id === Number(proveedorId) && x.codigo === cod; })[0];
        var p = m && DB.buscarPorId(db, 'productos', m.producto_id);
        if (p && p.activo) return { producto: conCategoria(db, p), via: 'codigo' };
      }
      var e = String(ean || '').replace(/\D/g, '');
      if (e.length >= 8) {
        var pe = db.productos.filter(function (x) { return x.activo && x.codigo_barras && x.codigo_barras.replace(/^0+/, '') === e.replace(/^0+/, ''); })[0];
        if (pe) return { producto: conCategoria(db, pe), via: 'ean' };
      }
      return null;
    },

    codigoNormalizado: function (proveedorId, codigo) {
      return codigoNormalizado(DB.buscarPorId(DB.datos(), 'proveedores', proveedorId), codigo);
    },

    // Registra la factura completa en una sola operación: suma stock (compra +
    // bonificación), guarda costo, precio de venta, lotes y aprende los códigos.
    registrar: function (datos) {
      Auth.requerirAdmin();
      var usuarioId = usuarioActualId();
      var numero = String(datos.numero || '').trim();
      if (!numero) falla('Escribe el número de la factura');
      var lineas = (datos.lineas || []).filter(function (l) { return Number(l.cantidad) > 0 || Number(l.bonificacion) > 0; });
      if (!lineas.length) falla('La factura no tiene productos');
      return DB.tx(function (db) {
        var pr = DB.buscarPorId(db, 'proveedores', datos.proveedorId);
        if (!pr) falla('Elige el proveedor');
        if (db.compras.some(function (c) { return c.proveedor_id === pr.id && c.numero.toUpperCase() === numero.toUpperCase() && c.estado !== 'ANULADA'; })) {
          falla('La factura ' + numero + ' de ' + pr.nombre + ' ya está registrada');
        }
        var compra = DB.insertar(db, 'compras', {
          proveedor_id: pr.id, numero: numero, fecha: fechaCompra(datos.fecha) || U.ahora().slice(0, 10),
          condicion: datos.condicion === 'CREDITO' ? 'CREDITO' : 'CONTADO', vencimiento: fechaCompra(datos.vencimiento),
          fecha_registro: U.ahora(), usuario_id: usuarioId, total: 0, unidades: 0, bonificadas: 0,
          estado: datos.condicion === 'CREDITO' ? 'PENDIENTE' : 'PAGADA', pago_gasto_id: null, lineas: []
        });
        var total = 0, unidades = 0, bonif = 0, preciosCambiados = 0;
        lineas.forEach(function (l) {
          var p = DB.buscarPorId(db, 'productos', l.productoId);
          if (!p) falla('Hay una línea sin producto: ' + (l.descripcion || ''));
          var cant = Math.max(0, U.numero(l.cantidad) || 0);
          var regalo = Math.max(0, U.numero(l.bonificacion) || 0);
          var costo = U.redondear(U.numero(l.costo) || 0);
          var entra = cant + regalo;
          p.stock += entra;
          if (costo > 0) p.costo = costo;
          var pv = U.redondear(U.numero(l.precioVenta) || 0);
          if (pv > 0 && pv !== p.precio_venta) {
            auditar(db, usuarioId, 'AjustePrecio', 'Producto ' + p.nombre + ' (#' + p.id + '): ' + p.precio_venta + ' -> ' + pv + ' (factura ' + numero + ')');
            p.precio_venta = pv;
            preciosCambiados++;
          }
          movimiento(db, p.id, 'ENTRADA', entra, 'Factura ' + numero + ' · ' + pr.nombre + (regalo ? ' (incluye ' + regalo + ' bonificadas)' : ''));
          var venc = fechaCompra(l.vencimiento);
          if (venc || String(l.lote || '').trim()) {
            DB.insertar(db, 'lotes', { producto_id: p.id, lote: String(l.lote || '').trim() || null, vencimiento: venc, cantidad: entra, compra_id: compra.id });
          }
          var cod = codigoNormalizado(pr, l.codigoProveedor);
          if (cod) {
            var m = db.codigos_proveedor.filter(function (x) { return x.proveedor_id === pr.id && x.codigo === cod; })[0];
            if (m) m.producto_id = p.id;
            else DB.insertar(db, 'codigos_proveedor', { proveedor_id: pr.id, codigo: cod, producto_id: p.id });
          }
          total += cant * costo;
          unidades += cant;
          bonif += regalo;
          compra.lineas.push({ producto_id: p.id, codigo_proveedor: String(l.codigoProveedor || '') || null, descripcion: String(l.descripcion || '') || null,
            cantidad: cant, bonificacion: regalo, costo: costo, subtotal: U.redondear(cant * costo), lote: String(l.lote || '').trim() || null, vencimiento: venc,
            verificado: !!l.verificado });
        });
        compra.total = U.redondear(total);
        compra.unidades = unidades;
        compra.bonificadas = bonif;
        auditar(db, usuarioId, 'CompraFactura', 'Factura ' + numero + ' de ' + pr.nombre + ': ' + compra.lineas.length + ' líneas, ' +
          (unidades + bonif) + ' unidades (' + bonif + ' bonificadas), total ' + compra.total + (preciosCambiados ? ', ' + preciosCambiados + ' precios actualizados' : ''));
        return copia(compra);
      });
    },

    listar: function () {
      var db = DB.datos();
      return db.compras.map(function (c) {
        var r = copia(c);
        var pr = DB.buscarPorId(db, 'proveedores', c.proveedor_id);
        r.proveedor = pr ? pr.nombre : '—';
        return r;
      }).reverse();
    },

    // Paga una factura a crédito: queda como gasto tipo Pedidos en el turno abierto.
    pagar: function (id, metodoPago) {
      Auth.requerirAdmin();
      var c = DB.buscarPorId(DB.datos(), 'compras', id);
      if (!c) falla('Factura no encontrada');
      if (c.estado !== 'PENDIENTE') falla('La factura ya está pagada');
      var pr = DB.buscarPorId(DB.datos(), 'proveedores', c.proveedor_id);
      var g = Gastos.registrar({ tipo: 'Pedidos', concepto: 'Pago factura ' + c.numero + ' · ' + (pr ? pr.nombre : ''), monto: c.total, metodoPago: metodoPago });
      DB.tx(function (db) {
        var x = DB.buscarPorId(db, 'compras', id);
        x.estado = 'PAGADA';
        x.pago_gasto_id = g.id;
        x.fecha_pago = U.ahora();
      });
      return g;
    },

    // Lotes que vencen dentro de `dias` (o ya vencidos) de productos con stock. Solo informativo.
    proximosAVencer: function (dias) {
      var db = DB.datos();
      var hoy = U.ahora().slice(0, 10);
      var d = new Date();
      d.setDate(d.getDate() + (dias || 180));
      var limite = fechaISO(d);
      return db.lotes.filter(function (l) { return l.vencimiento && l.vencimiento <= limite; }).map(function (l) {
        var p = DB.buscarPorId(db, 'productos', l.producto_id);
        return p && p.stock > 0 ? { producto: p.nombre, stock: p.stock, lote: l.lote, vencimiento: l.vencimiento, vencido: l.vencimiento < hoy, cantidad: l.cantidad } : null;
      }).filter(Boolean).sort(function (a, b) { return a.vencimiento < b.vencimiento ? -1 : 1; });
    }
  };

  // ======================= Empleados (sueldo semanal) =======================
  var Empleados = {
    listar: function (filtros) {
      filtros = filtros || {};
      return DB.datos().empleados.filter(function (e) { return !filtros.soloActivos || e.activo; })
        .map(copia).sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
    },
    guardar: function (datos) {
      Auth.requerirAdmin();
      var usuarioId = usuarioActualId();
      var nombre = String(datos.nombre || '').trim();
      if (!nombre) falla('Escribe el nombre del empleado');
      var sueldo = U.redondear(datos.sueldoSemanal);
      if (!(sueldo >= 0)) falla('Sueldo semanal inválido');
      return DB.tx(function (db) {
        var dup = db.empleados.filter(function (e) { return e.nombre.toLowerCase() === nombre.toLowerCase() && e.id !== Number(datos.id); })[0];
        if (dup) falla('Ya existe un empleado llamado ' + nombre);
        var e;
        if (datos.id) {
          e = DB.buscarPorId(db, 'empleados', datos.id);
          if (!e) falla('Empleado no encontrado');
          e.nombre = nombre;
          e.sueldo_semanal = sueldo;
          e.activo = datos.activo !== false;
        } else {
          e = DB.insertar(db, 'empleados', { nombre: nombre, sueldo_semanal: sueldo, activo: true });
        }
        auditar(db, usuarioId, 'Empleado', 'Empleado ' + nombre + ': sueldo semanal ' + sueldo + (e.activo ? '' : ' (inactivo)'));
        return copia(e);
      });
    }
  };

  // Lo pagado a cada empleado en una semana (adelantos y pagos), sin gastos anulados.
  function resumenSueldos(db, lunes) {
    return db.empleados.filter(function (e) {
      return e.activo || db.gastos.some(function (g) { return g.empleado_id === e.id && g.semana === lunes && g.estado !== 'ANULADO'; });
    }).map(function (e) {
      var adelantos = 0, pagos = 0;
      db.gastos.forEach(function (g) {
        if (g.empleado_id !== e.id || g.semana !== lunes || g.estado === 'ANULADO') return;
        if (g.clase_sueldo === 'ADELANTO') adelantos += g.monto; else pagos += g.monto;
      });
      return {
        empleado_id: e.id, nombre: e.nombre, sueldo_semanal: e.sueldo_semanal,
        adelantos: U.redondear(adelantos), pagado: U.redondear(pagos),
        pendiente: U.redondear(e.sueldo_semanal - adelantos - pagos)
      };
    }).sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
  }

  var Gastos = {
    TIPOS: TIPOS_GASTO,
    CLASES_SUELDO: CLASES_SUELDO,
    lunesDe: lunesDe,
    nombreSemana: nombreSemana,

    // Sueldos de la semana (lunes YYYY-MM-DD; por defecto la actual).
    sueldosSemana: function (lunes) {
      return resumenSueldos(DB.datos(), lunes || lunesDe());
    },

    // Registra un gasto o pedido pagado en el turno abierto. Si se paga en
    // efectivo, sale del cajón y se descuenta del efectivo esperado del arqueo.
    registrar: function (datos) {
      var usuarioId = usuarioActualId();
      var concepto = String(datos.concepto || '').trim();
      var tipo = TIPOS_GASTO.indexOf(datos.tipo) === -1 ? 'Otros' : datos.tipo;
      var esSueldo = tipo === 'Sueldos';
      if (!concepto && !esSueldo) falla('Escribe el concepto del gasto (qué se pagó)');
      var monto = U.redondear(datos.monto);
      if (!(monto > 0)) falla('El valor del gasto debe ser mayor a cero');
      var metodo = datos.metodoPago || 'EFECTIVO';
      if (METODOS_PAGO.indexOf(metodo) === -1) falla('Método de pago inválido');
      var claseSueldo = null, semana = null, empleado = null;
      return DB.tx(function (db) {
        var turno = db.turnos.filter(function (t) { return t.estado === 'ABIERTO'; })[0];
        if (!turno) falla('Abre un turno de caja para registrar gastos');
        if (esSueldo) {
          empleado = DB.buscarPorId(db, 'empleados', datos.empleadoId);
          if (!empleado) falla('Elige el empleado al que se le paga');
          claseSueldo = datos.claseSueldo === 'PAGO_SEMANA' ? 'PAGO_SEMANA' : 'ADELANTO';
          semana = lunesDe(datos.semana || U.ahora());
          concepto = CLASES_SUELDO[claseSueldo] + ' · ' + empleado.nombre + ' (semana del ' + nombreSemana(semana) + ')' +
            (concepto ? ' · ' + concepto : '');
        }
        if (metodo === 'EFECTIVO' && monto > efectivoEsperadoTurno(db, turno) + EPSILON) {
          falla('No hay suficiente efectivo en caja para ese pago (disponible: ' + efectivoEsperadoTurno(db, turno).toFixed(0) + ')');
        }
        var g = DB.insertar(db, 'gastos', {
          turno_caja_id: turno.id,
          usuario_id: usuarioId,
          fecha_hora: U.ahora(),
          tipo: tipo,
          concepto: concepto,
          proveedor: String(datos.proveedor || '').trim() || null,
          empleado_id: empleado ? empleado.id : null,
          clase_sueldo: claseSueldo,
          semana: semana,
          monto: monto,
          metodo_pago: metodo,
          estado: 'REGISTRADO',
          motivo_anulacion: null
        });
        auditar(db, usuarioId, 'RegistroGasto', 'Gasto #' + g.id + ' (' + tipo + '): ' + concepto + ' ' + monto + ' en ' + metodo);
        return copia(g);
      });
    },

    listar: function (filtros) {
      filtros = filtros || {};
      var db = DB.datos();
      return db.gastos.filter(function (g) {
        if (filtros.turnoId && g.turno_caja_id !== Number(filtros.turnoId)) return false;
        if (filtros.mes && g.fecha_hora.slice(0, 7) !== filtros.mes) return false;
        return true;
      }).map(function (g) {
        var r = copia(g);
        r.nombre_usuario = nombreUsuario(db, g.usuario_id);
        return r;
      }).reverse();
    },

    // Solo el administrador anula un gasto registrado por error.
    anular: function (id, motivo) {
      Auth.requerirAdmin();
      var usuarioId = usuarioActualId();
      motivo = String(motivo || '').trim();
      if (!motivo) falla('Indica el motivo de la anulación');
      return DB.tx(function (db) {
        var g = DB.buscarPorId(db, 'gastos', id);
        if (!g) falla('Gasto no encontrado');
        if (g.estado === 'ANULADO') falla('El gasto ya está anulado');
        var t = DB.buscarPorId(db, 'turnos', g.turno_caja_id);
        if (!t || t.estado !== 'ABIERTO') falla('Solo se anulan gastos del turno abierto');
        g.estado = 'ANULADO';
        g.motivo_anulacion = motivo;
        auditar(db, usuarioId, 'AnulacionGasto', 'Gasto #' + g.id + ' anulado (' + g.concepto + ' ' + g.monto + '). Motivo: ' + motivo);
        return copia(g);
      });
    }
  };

  // ======================= Reportes =======================
  var DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  var Reportes = {
    MESES: MESES,

    // Meses (AAAA-MM) con ventas o gastos, del más reciente al más antiguo.
    // Una fila por producto vendido o cambiado en el mes (para la hoja "Detalle" del Excel).
    detalleMes: function (mes) {
      var db = DB.datos();
      var filas = [];
      db.ventas.filter(function (v) { return v.estado === 'COMPLETADA' && v.fecha_hora.slice(0, 7) === mes; }).forEach(function (v) {
        var metodos = v.pagos.map(function (pg) { return nombreMetodo(pg.metodo_pago); }).join(' + ');
        v.detalle.forEach(function (x) {
          var p = DB.buscarPorId(db, 'productos', x.producto_id);
          var c = p && p.categoria_id ? DB.buscarPorId(db, 'categorias', p.categoria_id) : null;
          var raiz = c;
          while (raiz && raiz.categoria_padre_id) raiz = DB.buscarPorId(db, 'categorias', raiz.categoria_padre_id) || raiz;
          filas.push({
            fecha: v.fecha_hora.slice(0, 10), hora: v.fecha_hora.slice(11, 16), venta_id: v.id,
            tipo: v.tipo === 'CAMBIO' ? 'Cambio de #' + v.venta_origen_id : 'Venta',
            cajero: nombreUsuario(db, v.usuario_id),
            categoria_principal: raiz ? raiz.nombre : 'Sin categoría',
            categoria: c ? c.nombre : 'Sin categoría',
            producto: p ? p.nombre : '#' + x.producto_id,
            codigo: p ? (p.codigo_barras || p.codigo_interno || '') : '',
            cantidad: x.cantidad, precio: x.precio_unitario, subtotal: x.subtotal,
            metodos: metodos
          });
        });
      });
      return filas;
    },

    mesesDisponibles: function () {
      var db = DB.datos();
      var vistos = {};
      vistos[U.ahora().slice(0, 7)] = true;
      db.ventas.forEach(function (v) { vistos[v.fecha_hora.slice(0, 7)] = true; });
      db.gastos.forEach(function (g) { vistos[g.fecha_hora.slice(0, 7)] = true; });
      return Object.keys(vistos).sort().reverse();
    },

    nombreMes: function (mes) {
      var p = mes.split('-');
      return MESES[Number(p[1]) - 1] + ' de ' + p[0];
    },

    // Reporte de ventas de un mes calendario (AAAA-MM), por día de venta.
    mensual: function (mes) {
      var db = DB.datos();
      var anio = Number(mes.slice(0, 4));
      var numMes = Number(mes.slice(5, 7));
      var diasMes = new Date(anio, numMes, 0).getDate();
      var dias = [];
      for (var d = 1; d <= diasMes; d++) {
        var fecha = mes + '-' + (d < 10 ? '0' : '') + d;
        dias.push({ fecha: fecha, dia: d, semana: DIAS_SEMANA[new Date(anio, numMes - 1, d).getDay()], total: 0, ventas: 0, gastos: 0 });
      }
      var ventas = db.ventas.filter(function (v) { return v.estado === 'COMPLETADA' && v.fecha_hora.slice(0, 7) === mes; });
      var porMetodo = {};
      var porCategoria = {};
      var porProducto = {};
      var cambios = 0;
      ventas.forEach(function (v) {
        var dia = dias[Number(v.fecha_hora.slice(8, 10)) - 1];
        dia.total += v.total;
        if (v.tipo === 'CAMBIO') cambios++; else dia.ventas++;
        v.pagos.forEach(function (pg) { porMetodo[pg.metodo_pago] = (porMetodo[pg.metodo_pago] || 0) + pg.monto; });
        v.detalle.forEach(function (x) {
          var p = DB.buscarPorId(db, 'productos', x.producto_id);
          var c = p && p.categoria_id ? DB.buscarPorId(db, 'categorias', p.categoria_id) : null;
          // agrupa por la categoría principal (la raíz) para que el resumen sea legible
          while (c && c.categoria_padre_id) c = DB.buscarPorId(db, 'categorias', c.categoria_padre_id) || null;
          var nc = c ? c.nombre : 'Sin categoría';
          var rc = porCategoria[nc] || (porCategoria[nc] = { nombre: nc, cantidad: 0, total: 0 });
          rc.cantidad += x.cantidad;
          rc.total += x.subtotal;
          var rp = porProducto[x.producto_id] || (porProducto[x.producto_id] = { nombre: p ? p.nombre : '#' + x.producto_id, cantidad: 0, total: 0 });
          rp.cantidad += x.cantidad;
          rp.total += x.subtotal;
        });
      });
      var gastos = db.gastos.filter(function (g) { return g.estado !== 'ANULADO' && g.fecha_hora.slice(0, 7) === mes; });
      var gastosPorTipo = {};
      gastos.forEach(function (g) {
        dias[Number(g.fecha_hora.slice(8, 10)) - 1].gastos += g.monto;
        gastosPorTipo[g.tipo] = (gastosPorTipo[g.tipo] || 0) + g.monto;
      });
      dias.forEach(function (x) { x.total = U.redondear(x.total); x.gastos = U.redondear(x.gastos); });
      var total = U.redondear(dias.reduce(function (a, x) { return a + x.total; }, 0));
      var totalGastos = U.redondear(gastos.reduce(function (a, g) { return a + g.monto; }, 0));
      var cantidad = dias.reduce(function (a, x) { return a + x.ventas; }, 0);
      var conVentas = dias.filter(function (x) { return x.ventas > 0; });
      var mejor = conVentas.slice().sort(function (a, b) { return b.total - a.total; })[0] || null;
      var ordenar = function (o) { return Object.keys(o).map(function (k) { return o[k]; }).filter(function (x) { return x.cantidad !== 0; }).sort(function (a, b) { return b.total - a.total; }); };
      return {
        mes: mes,
        nombre: Reportes.nombreMes(mes),
        total: total,
        cantidadVentas: cantidad,
        cambios: cambios,
        ticketPromedio: cantidad ? U.redondear(total / cantidad) : 0,
        diasConVentas: conVentas.length,
        promedioDiario: conVentas.length ? U.redondear(total / conVentas.length) : 0,
        mejorDia: mejor,
        gastos: totalGastos,
        gastosPorTipo: Object.keys(gastosPorTipo).map(function (k) { return { tipo: k, total: U.redondear(gastosPorTipo[k]) }; })
          .sort(function (a, b) { return b.total - a.total; }),
        neto: U.redondear(total - totalGastos),
        dias: dias,
        porMetodoPago: metodosConValor(porMetodo),
        porCategoria: ordenar(porCategoria).map(function (x) { x.total = U.redondear(x.total); return x; }),
        porProducto: ordenar(porProducto).map(function (x) { x.total = U.redondear(x.total); return x; })
      };
    },
    construir: function (turnoId) {
      var db = DB.datos();
      var turno = DB.buscarPorId(db, 'turnos', turnoId);
      if (!turno) falla('Turno no encontrado');
      var ventas = db.ventas.filter(function (v) { return v.turno_caja_id === turno.id; });
      var completadas = ventas.filter(function (v) { return v.estado === 'COMPLETADA'; });
      var cambios = completadas.filter(function (v) { return v.tipo === 'CAMBIO'; });

      var porMetodo = {};
      var porUsuario = {};
      var porProducto = {};
      completadas.forEach(function (v) {
        v.pagos.forEach(function (pg) {
          porMetodo[pg.metodo_pago] = (porMetodo[pg.metodo_pago] || 0) + pg.monto;
        });
        var u = porUsuario[v.usuario_id] || (porUsuario[v.usuario_id] = { nombre_usuario: nombreUsuario(db, v.usuario_id), total: 0, cantidad_ventas: 0 });
        u.total += v.total;
        if (v.tipo !== 'CAMBIO') u.cantidad_ventas += 1;
        v.detalle.forEach(function (d) {
          var p = DB.buscarPorId(db, 'productos', d.producto_id);
          var r = porProducto[d.producto_id] || (porProducto[d.producto_id] = { nombre: p ? p.nombre : '#' + d.producto_id, cantidad: 0, total: 0 });
          r.cantidad += d.cantidad;
          r.total += d.subtotal;
        });
      });

      var efectivoVentas = efectivoVentasTurno(db, turno.id);
      var t = copia(turno);
      t.usuario_apertura = nombreUsuario(db, turno.usuario_apertura_id);
      t.usuario_cierre = turno.usuario_cierre_id ? nombreUsuario(db, turno.usuario_cierre_id) : null;

      return {
        turno: t,
        totalVentas: U.redondear(completadas.reduce(function (a, v) { return a + v.total; }, 0)),
        cantidadVentas: completadas.length - cambios.length,
        cantidadAnuladas: ventas.filter(function (v) { return v.estado === 'ANULADA'; }).length,
        cambios: {
          cantidad: cambios.length,
          saldoRetenido: U.redondear(cambios.reduce(function (a, v) { return a + (v.saldo_retenido || 0); }, 0)),
          devuelto: U.redondear(-cambios.reduce(function (a, v) { return a + (v.motivo_reembolso ? v.diferencia : 0); }, 0))
        },
        porMetodoPago: metodosConValor(porMetodo),
        porUsuario: Object.keys(porUsuario).map(function (k) { return porUsuario[k]; }),
        porProducto: Object.keys(porProducto).map(function (k) { return porProducto[k]; })
          .filter(function (x) { return x.cantidad !== 0; })
          .sort(function (a, b) { return b.total - a.total; }),
        gastos: (function () {
          var lista = gastosTurno(db, turno.id);
          return {
            cantidad: lista.length,
            total: U.redondear(lista.reduce(function (a, g) { return a + g.monto; }, 0)),
            efectivo: gastosEfectivoTurno(db, turno.id),
            lista: lista.map(function (g) { return { concepto: g.concepto, tipo: g.tipo, monto: g.monto, metodo_pago: g.metodo_pago }; })
          };
        })(),
        arqueo: {
          baseInicial: turno.base_inicial_efectivo,
          efectivoVentas: efectivoVentas,
          gastosEfectivo: gastosEfectivoTurno(db, turno.id),
          efectivoEsperado: efectivoEsperadoTurno(db, turno),
          efectivoContado: turno.efectivo_contado,
          diferencia: turno.diferencia_arqueo
        }
      };
    },

    // Mensaje corto para el dueño: lo vendido y el arqueo, más un enlace al detalle completo.
    textoResumen: function (r) {
      var cfg = DB.config();
      var a = r.arqueo;
      var lineas = [
        '*' + cfg.nombreNegocio + '* — Cierre de caja #' + r.turno.id,
        (r.turno.fecha_hora_cierre || 'En curso') + (r.turno.usuario_cierre ? ' · ' + r.turno.usuario_cierre : ''),
        '',
        'Vendido: *' + U.dinero(r.totalVentas) + '* (' + r.cantidadVentas + ' venta' + (r.cantidadVentas === 1 ? '' : 's') +
          (r.cantidadAnuladas ? ', ' + r.cantidadAnuladas + ' anulada' + (r.cantidadAnuladas === 1 ? '' : 's') : '') + ')'
      ];
      r.porMetodoPago.forEach(function (m) {
        lineas.push('• ' + nombreMetodo(m.metodo_pago) + ': ' + U.dinero(m.total));
      });
      if (r.cambios && r.cambios.cantidad) {
        lineas.push('Cambios de productos: ' + r.cambios.cantidad +
          (r.cambios.saldoRetenido ? ' (saldo no devuelto ' + U.dinero(r.cambios.saldoRetenido) + ')' : '') +
          (r.cambios.devuelto ? ' · Dinero devuelto: ' + U.dinero(r.cambios.devuelto) : ''));
      }
      if (r.gastos && r.gastos.cantidad) {
        lineas.push('Gastos y pedidos pagados: ' + U.dinero(r.gastos.total) + ' (' + r.gastos.cantidad + ')' +
          (r.gastos.efectivo && r.gastos.efectivo !== r.gastos.total ? ', en efectivo ' + U.dinero(r.gastos.efectivo) : ''));
      }
      lineas.push('');
      if (a.efectivoContado !== null) {
        lineas.push('Caja: esperado ' + U.dinero(a.efectivoEsperado) + ', contado ' + U.dinero(a.efectivoContado));
        lineas.push(a.diferencia === 0 ? 'Cuadre exacto ✔' : 'Diferencia: ' + U.dinero(a.diferencia) + etiquetaDiferencia(a.diferencia));
      } else {
        lineas.push('Efectivo esperado en caja: ' + U.dinero(a.efectivoEsperado));
      }
      var enlace = Reportes.enlaceDetalle(r);
      if (enlace) {
        lineas.push('');
        lineas.push('Ver detalle: ' + enlace);
      }
      return lineas.join('\n');
    },

    // El enlace lleva el cierre codificado en el ancla (#cierre-...): la página lo
    // muestra sin iniciar sesión y sin depender de los datos del equipo que lo abre.
    enlaceDetalle: function (r) {
      var base = DB.config().urlApp;
      return base ? base + '#cierre-' + codificarCierre(r) : '';
    },

    decodificarCierre: decodificarCierre,

    // Enlace de WhatsApp al número configurado con el resumen ya escrito.
    urlWhatsApp: function (r) {
      var numero = DB.config().whatsapp || '';
      return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(Reportes.textoResumen(r));
    }
  };

  // ---- Cierre compartible: JSON compacto en base64url (solo letras, dígitos, - y _) ----
  function aBase64Url(texto) {
    return btoa(unescape(encodeURIComponent(texto))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function deBase64Url(texto) {
    var b = texto.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    return decodeURIComponent(escape(atob(b)));
  }

  function codificarCierre(r) {
    var cfg = DB.config();
    var a = r.arqueo;
    return aBase64Url(JSON.stringify({
      v: 1,
      n: cfg.nombreNegocio, m: cfg.moneda, dc: cfg.decimales,
      t: r.turno.id, ap: r.turno.fecha_hora_apertura, ci: r.turno.fecha_hora_cierre,
      ua: r.turno.usuario_apertura, uc: r.turno.usuario_cierre,
      tv: r.totalVentas, cv: r.cantidadVentas, an: r.cantidadAnuladas,
      mp: r.porMetodoPago.map(function (x) { return [x.metodo_pago, x.total]; }),
      pu: r.porUsuario.map(function (x) { return [x.nombre_usuario, x.total, x.cantidad_ventas]; }),
      pr: r.porProducto.map(function (x) { return [x.nombre, x.cantidad, x.total]; }),
      ar: [a.baseInicial, a.efectivoVentas, a.efectivoEsperado, a.efectivoContado, a.diferencia],
      cb: r.cambios ? [r.cambios.cantidad, r.cambios.saldoRetenido, r.cambios.devuelto] : [0, 0, 0],
      gs: r.gastos ? [r.gastos.total, r.gastos.efectivo, r.gastos.lista.map(function (g) { return [g.concepto, g.monto, g.metodo_pago, g.tipo]; })] : [0, 0, []],
      ge: a.gastosEfectivo || 0
    }));
  }

  // Devuelve el cierre con la misma forma que Reportes.construir (más la moneda del negocio).
  function decodificarCierre(token) {
    var d = JSON.parse(deBase64Url(String(token || '')));
    if (!d || d.v !== 1) throw new Error('Enlace de cierre no válido');
    return {
      negocio: d.n, moneda: d.m, decimales: d.dc,
      turno: { id: d.t, fecha_hora_apertura: d.ap, fecha_hora_cierre: d.ci, usuario_apertura: d.ua, usuario_cierre: d.uc },
      totalVentas: d.tv, cantidadVentas: d.cv, cantidadAnuladas: d.an,
      porMetodoPago: d.mp.map(function (x) { return { metodo_pago: x[0], total: x[1] }; }),
      porUsuario: d.pu.map(function (x) { return { nombre_usuario: x[0], total: x[1], cantidad_ventas: x[2] }; }),
      porProducto: d.pr.map(function (x) { return { nombre: x[0], cantidad: x[1], total: x[2] }; }),
      arqueo: { baseInicial: d.ar[0], efectivoVentas: d.ar[1], gastosEfectivo: d.ge || 0, efectivoEsperado: d.ar[2], efectivoContado: d.ar[3], diferencia: d.ar[4] },
      gastos: d.gs ? { total: d.gs[0], efectivo: d.gs[1], cantidad: d.gs[2].length,
        lista: d.gs[2].map(function (g) { return { concepto: g[0], monto: g[1], metodo_pago: g[2], tipo: g[3] }; }) } : { total: 0, efectivo: 0, cantidad: 0, lista: [] },
      cambios: d.cb ? { cantidad: d.cb[0], saldoRetenido: d.cb[1], devuelto: d.cb[2] } : { cantidad: 0, saldoRetenido: 0, devuelto: 0 }
    };
  }

  function etiquetaDiferencia(d) {
    if (d === null || d === undefined) return '';
    return d < 0 ? ' (FALTANTE)' : d > 0 ? ' (SOBRANTE)' : '';
  }

  // ======================= Usuarios =======================
  function usuarioPublico(u) {
    return { id: u.id, nombre_usuario: u.nombre_usuario, rol: u.rol, activo: u.activo };
  }

  var Usuarios = {
    ROLES: ROLES,

    listar: function () {
      Auth.requerirAdmin();
      return DB.datos().usuarios.map(usuarioPublico);
    },

    crear: function (datos) {
      Auth.requerirAdmin();
      var adminId = usuarioActualId();
      var nombre = String(datos.nombreUsuario || '').trim();
      if (!nombre || !datos.password) falla('Nombre de usuario y contraseña son obligatorios');
      if (String(datos.password).length < 4) falla('La contraseña debe tener al menos 4 caracteres');
      if (ROLES.indexOf(datos.rol) === -1) falla('Rol inválido');
      return DB.tx(function (db) {
        if (db.usuarios.some(function (u) { return u.nombre_usuario.toLowerCase() === nombre.toLowerCase(); })) {
          falla('Ya existe un usuario con ese nombre');
        }
        var u = DB.insertar(db, 'usuarios', { nombre_usuario: nombre, password_hash: hashPassword(datos.password), rol: datos.rol, activo: 1 });
        auditar(db, adminId, 'CreacionUsuario', 'Usuario ' + nombre + ' (' + datos.rol + ')');
        return usuarioPublico(u);
      });
    },

    actualizar: function (id, datos) {
      Auth.requerirAdmin();
      var adminId = usuarioActualId();
      return DB.tx(function (db) {
        var u = DB.buscarPorId(db, 'usuarios', id);
        if (!u) falla('Usuario no encontrado');
        var rol = datos.rol !== undefined ? datos.rol : u.rol;
        var activo = datos.activo !== undefined ? (datos.activo ? 1 : 0) : u.activo;
        if (ROLES.indexOf(rol) === -1) falla('Rol inválido');
        if (u.id === adminId && (!activo || rol !== 'ADMINISTRADOR')) {
          falla('No puedes desactivarte ni quitarte el rol de administrador a ti mismo');
        }
        var adminsActivos = db.usuarios.filter(function (x) {
          return x.id !== u.id && x.activo && x.rol === 'ADMINISTRADOR';
        }).length;
        if ((!activo || rol !== 'ADMINISTRADOR') && u.rol === 'ADMINISTRADOR' && !adminsActivos) {
          falla('Debe quedar al menos un administrador activo');
        }
        u.rol = rol;
        u.activo = activo;
        auditar(db, adminId, 'ActualizacionUsuario', 'Usuario ' + u.nombre_usuario + ': rol ' + rol + ', activo ' + activo);
        return usuarioPublico(u);
      });
    },

    cambiarPassword: function (id, nueva) {
      var actualId = usuarioActualId();
      if (Number(id) !== actualId) Auth.requerirAdmin();
      if (!nueva || String(nueva).length < 4) falla('La contraseña debe tener al menos 4 caracteres');
      DB.tx(function (db) {
        var u = DB.buscarPorId(db, 'usuarios', id);
        if (!u) falla('Usuario no encontrado');
        u.password_hash = hashPassword(nueva);
        if (u.nombre_usuario === 'admin' || u.nombre_usuario === 'cajero') db.config.primerUso = false;
        auditar(db, actualId, 'CambioPassword', 'Usuario ' + u.nombre_usuario);
      });
    }
  };

  // ======================= Auditoría =======================
  // Registro de aperturas del cajón monedero (las manuales quedan en Auditoría).
  var Cajon = {
    registrarApertura: function (motivo) {
      var usuarioId = usuarioActualId();
      DB.tx(function (db) {
        auditar(db, usuarioId, 'AperturaCajon', String(motivo || 'Apertura manual del cajón'));
      });
    }
  };

  var Auditoria = {
    listar: function () {
      Auth.requerirAdmin();
      var db = DB.datos();
      return db.auditoria.slice(-500).reverse().map(function (a) {
        var r = copia(a);
        r.nombre_usuario = a.usuario_id ? nombreUsuario(db, a.usuario_id) : '—';
        return r;
      });
    }
  };

  // ======================= Configuración =======================
  var Config = {
    obtener: function () {
      return copia(DB.config());
    },
    guardar: function (datos) {
      Auth.requerirAdmin();
      var usuarioId = usuarioActualId();
      DB.tx(function (db) {
        db.config.nombreNegocio = String(datos.nombreNegocio || '').trim() || 'Mi Negocio';
        db.config.direccion = String(datos.direccion || '').trim();
        db.config.nit = String(datos.nit || '').trim();
        db.config.moneda = String(datos.moneda === undefined ? '$' : datos.moneda);
        var dec = Number(datos.decimales);
        db.config.decimales = dec === 0 ? 0 : 2;
        db.config.anchoTicket = Number(datos.anchoTicket) === 58 ? 58 : 80;
        db.config.whatsapp = String(datos.whatsapp || '').replace(/[^\d]/g, '');
        if (datos.urlActualizaciones !== undefined) db.config.urlActualizaciones = String(datos.urlActualizaciones || '').trim();
        if (datos.urlApp !== undefined) db.config.urlApp = String(datos.urlApp || '').trim().replace(/#.*$/, '');
        db.config.mensajeTicket = String(datos.mensajeTicket || '');
        if (datos.permitirVentaSinStock !== undefined) db.config.permitirVentaSinStock = !!datos.permitirVentaSinStock;
        if (datos.ticketAnchoUtil !== undefined) db.config.ticketAnchoUtil = Math.max(0, Math.min(80, Number(datos.ticketAnchoUtil) || 0));
        if (datos.ticketMargenIzq !== undefined) db.config.ticketMargenIzq = Math.max(0, Math.min(10, Number(datos.ticketMargenIzq) || 0));
        if (datos.cajonModo !== undefined) {
          db.config.cajonModo = ['ninguno', 'impresion', 'serial'].indexOf(datos.cajonModo) !== -1 ? datos.cajonModo : 'ninguno';
          db.config.cajonBaudios = Number(datos.cajonBaudios) > 0 ? Number(datos.cajonBaudios) : 9600;
          db.config.cajonPin = Number(datos.cajonPin) === 1 ? 1 : 0;
        }
        auditar(db, usuarioId, 'Configuracion', 'Configuración actualizada');
      });
    }
  };

  // ======================= Documentos imprimibles =======================
  // Las térmicas no imprimen todo el ancho del papel: una de 58 mm imprime ~48 mm
  // y una de 80 mm ~72 mm. El ticket se arma de ese ancho para que nada se corte.
  function medidasTicket(cfg) {
    var papel = Number(cfg.anchoTicket) === 58 ? 58 : 80;
    var util = Number(cfg.ticketAnchoUtil) || (papel === 58 ? 48 : 72);
    var izq = Math.max(0, Number(cfg.ticketMargenIzq) || 0);
    return { papel: papel, util: util, izq: izq };
  }
  // Letra sin serifa y en semi-negrita, todo en negro puro: en papel térmico el
  // texto delgado y gris sale pálido.
  function cssTicket(cfg) {
    var m = medidasTicket(cfg);
    return '@page{size:' + m.papel + 'mm auto;margin:0}' +
      'html,body{margin:0;padding:0;background:#fff}' +
      'body{box-sizing:border-box;width:' + Math.max(30, m.util - m.izq) + 'mm;margin-left:' + m.izq + 'mm;padding:1mm 1mm 2mm 0;' +
      'font-family:Arial,Helvetica,sans-serif;font-size:' + (m.papel === 58 ? '11.5px' : '12.5px') + ';font-weight:600;line-height:1.25;color:#000;' +
      '-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      'h2{text-align:center;margin:2px 0 4px;font-size:' + (m.papel === 58 ? '14px' : '16px') + ';font-weight:800}' +
      'b,strong,.total{font-weight:800}.centro{text-align:center}small{font-size:0.9em;font-weight:600}' +
      'table{width:100%;border-collapse:collapse}td{vertical-align:top;padding:1px 0;color:#000}.der{text-align:right;white-space:nowrap;padding-left:2mm}' +
      'hr{border:none;border-top:1px dashed #000;margin:3px 0}.total{font-size:1.15em}' +
      '.fila{display:flex;justify-content:space-between;gap:2mm}.fila span:last-child{white-space:nowrap}' +
      '.firma{margin-top:24px;border-top:1px solid #000;text-align:center}';
  }
  function encabezadoNegocio(cfg) {
    return '<h2>' + U.esc(cfg.nombreNegocio) + '</h2>' +
      (cfg.nit ? '<div class="centro">NIT/RUT: ' + U.esc(cfg.nit) + '</div>' : '') +
      (cfg.direccion ? '<div class="centro">' + U.esc(cfg.direccion) + '</div>' : '');
  }

  var Documentos = {
    ticketHTML: function (venta) {
      var cfg = DB.config();
      var esCambio = venta.tipo === 'CAMBIO';
      var filas = venta.detalle.map(function (d) {
        if (esCambio && d.cantidad < 0) {
          return '<tr><td>DEVUELVE ' + U.esc(-d.cantidad) + ' x ' + U.esc(d.producto_nombre) +
            '<br><small>' + U.dinero(d.precio_unitario) + ' c/u</small></td>' +
            '<td class="der">' + U.dinero(d.subtotal) + '</td></tr>';
        }
        return '<tr><td>' + (esCambio ? 'LLEVA ' : '') + U.esc(d.cantidad) + ' x ' + U.esc(d.producto_nombre) +
          '<br><small>' + U.dinero(d.precio_unitario) + ' c/u</small></td>' +
          '<td class="der">' + U.dinero(d.subtotal) + '</td></tr>';
      }).join('');
      var pagos = venta.pagos.map(function (p) {
        return '<div class="fila"><span>' + U.esc(nombreMetodo(p.metodo_pago)) + '</span><span>' + U.dinero(p.monto) + '</span></div>';
      }).join('');
      var cliente = venta.cliente_nombre || venta.cliente_documento
        ? '<div>Cliente: ' + U.esc(venta.cliente_nombre || '') + (venta.cliente_documento ? ' (' + U.esc(venta.cliente_documento) + ')' : '') + '</div>'
        : '';
      return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Comprobante #' + venta.id + '</title>' +
        '<style>' + cssTicket(cfg) +
        (venta.estado === 'ANULADA' ? '.anulada{font-weight:800;text-align:center;border:2px solid #000;padding:4px;margin:6px 0}' : '') +
        '</style></head><body>' +
        encabezadoNegocio(cfg) +
        '<hr>' + (esCambio
          ? '<div class="centro"><b>CAMBIO DE PRODUCTOS</b></div><div>Cambio #' + venta.id + ' de la venta #' + venta.venta_origen_id + '</div>'
          : '<div>Venta #' + venta.id + '</div>') + '<div>' + U.esc(venta.fecha_hora) + '</div>' +
        '<div>Atendió: ' + U.esc(venta.nombre_usuario) + '</div>' + cliente +
        (venta.estado === 'ANULADA' ? '<div class="anulada">VENTA ANULADA</div>' : '') +
        '<hr><table>' + filas + '</table><hr>' +
        (esCambio
          ? '<div class="fila total"><span>DIFERENCIA</span><span>' + U.dinero(venta.diferencia) + '</span></div>' +
            (venta.saldo_retenido ? '<div>Saldo a favor no reembolsable: ' + U.dinero(venta.saldo_retenido) + '</div><div><small>Política: no se devuelve dinero en cambios.</small></div>' : '') +
            (venta.motivo_reembolso ? '<div>Devolución autorizada: ' + U.esc(venta.motivo_reembolso) + '</div>' : '') + '<hr>'
          : '<div class="fila total"><span>TOTAL</span><span>' + U.dinero(venta.total) + '</span></div><hr>') +
        pagos + '<hr>' +
        '<div class="centro">' + U.esc(cfg.mensajeTicket) + '</div>' +
        '</body></html>';
    },

    // Ticket corto para probar la impresora: una regla con números para ver si algo se corta.
    pruebaHTML: function () {
      var cfg = DB.config();
      var m = medidasTicket(cfg);
      return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Prueba</title><style>' + cssTicket(cfg) + '</style></head><body>' +
        encabezadoNegocio(cfg) + '<hr><div class="centro"><b>TICKET DE PRUEBA</b></div><div>' + U.esc(U.ahora()) + '</div>' +
        '<div>Papel ' + m.papel + ' mm · ancho útil ' + m.util + ' mm · margen izq. ' + m.izq + ' mm</div><hr>' +
        '<div class="fila"><span>Producto de prueba</span><span>$ 23.500</span></div>' +
        '<div class="fila total"><span>TOTAL</span><span>$ 123.500</span></div><hr>' +
        '<div class="fila"><span>|izquierda</span><span>derecha|</span></div>' +
        '<div>Si ve las dos barras | y el valor completo, el ancho está bien.</div></body></html>';
    },

    // Comprobante de egreso (gasto pagado con dinero de la caja); firma de quien recibe.
    egresoHTML: function (g) {
      var cfg = DB.config();
      return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Egreso #' + g.id + '</title><style>' + cssTicket(cfg) +
        '</style></head><body>' + encabezadoNegocio(cfg) +
        '<hr><div class="centro"><b>COMPROBANTE DE EGRESO</b></div><div>Egreso #' + g.id + '</div><div>' + U.esc(g.fecha_hora) + '</div>' +
        '<hr><div>' + U.esc(g.tipo) + '</div><div>' + U.esc(g.concepto) + '</div><hr>' +
        '<div class="fila total"><span>VALOR</span><span>' + U.dinero(g.monto) + '</span></div>' +
        '<div class="fila"><span>Pagado con</span><span>' + U.esc(nombreMetodo(g.metodo_pago)) + '</span></div>' +
        '<div class="firma">Recibí</div></body></html>';
    },

    reporteHTML: function (r) {
      var cfg = DB.config();
      function lista(items, fn) {
        return items.length ? '<ul>' + items.map(fn).join('') + '</ul>' : '<p class="tenue">Sin datos</p>';
      }
      var a = r.arqueo;
      return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte turno #' + r.turno.id + '</title>' +
        '<style>body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:24px;font-size:13px}' +
        'h1{font-size:20px;text-align:center;margin:0 0 4px}h2{font-size:15px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:22px}' +
        '.tenue{color:#666}.centro{text-align:center}table{border-collapse:collapse;width:100%}' +
        'th,td{text-align:left;padding:4px 6px;border-bottom:1px solid #eee}td.num,th.num{text-align:right}' +
        '.alerta{color:#c62828;font-weight:bold}@media print{body{margin:10mm}}</style></head><body>' +
        '<h1>' + U.esc(cfg.nombreNegocio) + '</h1>' +
        '<div class="centro">Reporte de cierre de turno #' + r.turno.id + '</div>' +
        '<p class="tenue centro">Apertura: ' + U.esc(r.turno.fecha_hora_apertura) + ' (' + U.esc(r.turno.usuario_apertura) + ') · ' +
        'Cierre: ' + U.esc(r.turno.fecha_hora_cierre || 'En curso') + (r.turno.usuario_cierre ? ' (' + U.esc(r.turno.usuario_cierre) + ')' : '') + '</p>' +
        '<h2>Resumen de ventas</h2>' +
        '<p>Total vendido: <strong>' + U.dinero(r.totalVentas) + '</strong><br>Cantidad de ventas: ' + r.cantidadVentas +
        (r.cantidadAnuladas ? '<br>Ventas anuladas: ' + r.cantidadAnuladas : '') +
        (r.cambios.cantidad ? '<br>Cambios de productos: ' + r.cambios.cantidad +
          (r.cambios.saldoRetenido ? ' · saldo a favor no devuelto: ' + U.dinero(r.cambios.saldoRetenido) : '') +
          (r.cambios.devuelto ? ' · dinero devuelto: ' + U.dinero(r.cambios.devuelto) : '') : '') + '</p>' +
        '<h2>Desglose por método de pago</h2>' +
        lista(r.porMetodoPago, function (m) { return '<li>' + U.esc(nombreMetodo(m.metodo_pago)) + ': ' + U.dinero(m.total) + '</li>'; }) +
        '<h2>Desglose por usuario</h2>' +
        lista(r.porUsuario, function (u) { return '<li>' + U.esc(u.nombre_usuario) + ': ' + U.dinero(u.total) + ' (' + u.cantidad_ventas + ' ventas)</li>'; }) +
        '<h2>Productos vendidos</h2>' +
        (r.porProducto.length
          ? '<table><thead><tr><th>Producto</th><th class="num">Cantidad</th><th class="num">Total</th></tr></thead><tbody>' +
            r.porProducto.map(function (p) {
              return '<tr><td>' + U.esc(p.nombre) + '</td><td class="num">' + p.cantidad + '</td><td class="num">' + U.dinero(p.total) + '</td></tr>';
            }).join('') + '</tbody></table>'
          : '<p class="tenue">Sin datos</p>') +
        '<h2>Gastos y pedidos pagados</h2>' +
        (r.gastos.cantidad
          ? '<table><thead><tr><th>Concepto</th><th>Tipo</th><th>Pago</th><th class="num">Valor</th></tr></thead><tbody>' +
            r.gastos.lista.map(function (g) {
              return '<tr><td>' + U.esc(g.concepto) + '</td><td>' + U.esc(g.tipo) + '</td><td>' + U.esc(nombreMetodo(g.metodo_pago)) + '</td><td class="num">' + U.dinero(g.monto) + '</td></tr>';
            }).join('') + '</tbody></table><p>Total gastos: <strong>' + U.dinero(r.gastos.total) + '</strong></p>'
          : '<p class="tenue">Sin gastos registrados</p>') +
        '<h2>Arqueo de caja</h2>' +
        '<p>Base inicial: ' + U.dinero(a.baseInicial) + '<br>Ventas en efectivo: ' + U.dinero(a.efectivoVentas) +
        (a.gastosEfectivo ? '<br>Gastos pagados en efectivo: -' + U.dinero(a.gastosEfectivo) : '') +
        '<br>Efectivo esperado: ' + U.dinero(a.efectivoEsperado) +
        (a.efectivoContado !== null
          ? '<br>Efectivo contado: ' + U.dinero(a.efectivoContado) +
            '<br><span class="' + (a.diferencia < 0 ? 'alerta' : '') + '">Diferencia: ' + U.dinero(a.diferencia) + etiquetaDiferencia(a.diferencia) + '</span>'
          : '<br>Turno aún abierto: sin arqueo') + '</p>' +
        '<p class="tenue">Generado: ' + U.esc(U.ahora()) + '</p>' +
        '</body></html>';
    }
  };

  global.POS = {
    Auth: Auth,
    sembrar: sembrar,
    Categorias: Categorias,
    Productos: Productos,
    Inventario: Inventario,
    Turnos: Turnos,
    Ventas: Ventas,
    Reportes: Reportes,
    Gastos: Gastos,
    Empleados: Empleados,
    Proveedores: Proveedores,
    Compras: Compras,
    Usuarios: Usuarios,
    Auditoria: Auditoria,
    Cajon: Cajon,
    Config: Config,
    Documentos: Documentos,
    etiquetaDiferencia: etiquetaDiferencia
  };
})(window);
