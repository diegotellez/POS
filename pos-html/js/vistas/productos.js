/* Catálogo de productos (solo administrador). */
(function () {
  'use strict';

  var filtro = '';
  var mostrarInactivos = false;

  function opcionesCategorias(seleccion) {
    return '<option value="">Sin categoría</option>' + POS.Categorias.listar().map(function (c) {
      return '<option value="' + c.id + '"' + (Number(seleccion) === c.id ? ' selected' : '') + '>' + U.esc(c.nombre) + '</option>';
    }).join('');
  }

  // Ganancia por unidad = precio de venta - precio de compra.
  // Margen: sobre el precio de venta. Sobre el costo: lo que se le gana a lo que costó.
  function ganancia(compra, venta) {
    compra = Number(compra) || 0;
    venta = Number(venta) || 0;
    if (!compra || !venta) return null;
    var g = venta - compra;
    var pct = function (x) { return String(Math.round(x * 1000) / 10).replace('.', ','); };
    return { valor: g, margen: pct(g / venta), sobreCosto: pct(g / compra) };
  }
  function celdaGanancia(p) {
    var g = ganancia(p.costo, p.precio_venta);
    if (!g) return '<span class="tenue">—</span>';
    return '<span class="' + (g.valor <= 0 ? 'alerta' : '') + '">' + U.dinero(g.valor) + '</span><br><small class="' + (g.valor <= 0 ? 'alerta' : 'tenue') + '">' + g.margen + '%</small>';
  }
  var seleccion = {};

  function render(cont) {
    cont.innerHTML =
      '<section class="tarjeta">' +
      '<div class="encabezado"><h2>Productos</h2>' +
      '<button class="boton boton-primario" id="btn-nuevo">' + U.icono('mas') + ' Nuevo producto</button></div>' +
      '<div class="filtros">' +
      '<label class="campo crece"><span>Filtrar por nombre o código</span><input id="filtro" autocomplete="off"></label>' +
      '<label class="check"><input type="checkbox" id="inactivos"> Mostrar inactivos</label>' +
      '</div>' +
      '<div class="barra-seleccion" id="barra-sel"></div>' +
      '<div class="tabla-contenedor"><table class="tabla"><thead><tr>' +
      '<th><input type="checkbox" id="sel-todos" aria-label="Seleccionar todos" title="Seleccionar todos los de la lista"></th>' +
      '<th>Código</th><th>Nombre</th><th>Categoría</th><th class="num">P. compra</th><th class="num">P. venta</th><th class="num" title="Precio de venta menos precio de compra; el % es sobre el precio de venta">Ganancia</th>' +
      '<th class="num"><span' + U.ayuda.attr('Escriba las unidades directamente en la columna. Enter guarda y pasa al producto siguiente; Esc deshace. Cada cambio queda como ajuste de inventario.', 'Unidades editables', 'productos-disponibles') + '>Disponibles</span>' + U.ayuda.icono('Escriba las unidades y pulse Enter para guardar y pasar al siguiente. Esc deshace. Queda registrado en Inventario > Movimientos.', 'Unidades disponibles') + '</th><th class="num">Mín.</th><th></th>' +
      '</tr></thead><tbody id="filas"></tbody></table></div>' +
      '</section>';

    var inputFiltro = U.$('#filtro', cont);
    inputFiltro.value = filtro;
    U.$('#inactivos', cont).checked = mostrarInactivos;

    var listaVisible = [];
    function pintarBarra() {
      var n = Object.keys(seleccion).length;
      U.$('#barra-sel', cont).innerHTML = n
        ? '<span>' + n + ' producto(s) seleccionados</span>' +
          '<button type="button" class="boton boton-secundario boton-peligro" id="btn-eliminar-sel">' + U.icono('borrar') + ' Eliminar seleccionados</button>' +
          '<button type="button" class="boton boton-texto" id="btn-quitar-sel">Quitar selección</button>'
        : '';
      var todos = U.$('#sel-todos', cont);
      todos.checked = listaVisible.length > 0 && listaVisible.every(function (p) { return seleccion[p.id]; });
      var bE = U.$('#btn-eliminar-sel', cont);
      if (bE) bE.addEventListener('click', function () { eliminar(Object.keys(seleccion).map(Number)); });
      var bQ = U.$('#btn-quitar-sel', cont);
      if (bQ) bQ.addEventListener('click', function () { seleccion = {}; pintar(); });
    }

    function eliminar(ids) {
      var usados = ids.filter(function (id) { return POS.Productos.enUso(id); }).length;
      var nombre = ids.length === 1 ? '"' + POS.Productos.obtener(ids[0]).nombre + '"' : ids.length + ' productos';
      U.confirmar('¿Eliminar ' + nombre + '? Esta acción no se puede deshacer.' +
        (usados ? ' ' + (ids.length === 1 ? 'Este producto tiene' : usados + ' de ellos tienen') + ' ventas registradas: no se puede' + (ids.length === 1 ? '' : 'n') + ' eliminar; se desactiva' + (ids.length === 1 ? '' : 'n') + ' para conservar el historial de ventas.' : ''), function () {
        try {
          var r = POS.Productos.eliminar(ids);
          ids.forEach(function (id) { delete seleccion[id]; });
          U.aviso((r.eliminados ? r.eliminados + ' producto(s) eliminados. ' : '') + (r.desactivados.length === 1 ? '1 producto tiene ventas: no se eliminó, quedó desactivado.' : r.desactivados.length ? r.desactivados.length + ' productos tienen ventas: no se eliminaron, quedaron desactivados.' : ''), 'ok', 6000);
          pintar();
        } catch (err) { U.error(err); }
      }, 'Eliminar');
    }

    function pintar() {
      var t = filtro.trim().toLowerCase();
      var lista = POS.Productos.listar().filter(function (p) {
        if (!mostrarInactivos && !p.activo) return false;
        if (!t) return true;
        return p.nombre.toLowerCase().indexOf(t) !== -1 ||
          (p.codigo_barras || '').toLowerCase().indexOf(t) !== -1 ||
          p.codigo_interno.indexOf(t) !== -1;
      });
      var tbody = U.$('#filas', cont);
      listaVisible = lista;
      if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="10" class="tenue vacio">No hay productos.</td></tr>';
        pintarBarra();
        return;
      }
      tbody.innerHTML = lista.map(function (p) {
        return '<tr' + (!p.activo ? ' class="fila-anulada"' : '') + '>' +
          '<td><input type="checkbox" data-sel="' + p.id + '"' + (seleccion[p.id] ? ' checked' : '') + ' aria-label="Seleccionar"></td>' +
          '<td>' + U.esc(p.codigo_barras || p.codigo_interno) + (p.codigo_barras ? '<br><small class="tenue">' + U.esc(p.codigo_interno) + '</small>' : '') + '</td>' +
          '<td>' + U.esc(p.nombre) + (!p.activo ? ' <span class="etiqueta etiqueta-alerta">INACTIVO</span>' : '') + '</td>' +
          '<td>' + U.esc(p.categoria_nombre || '—') + '</td>' +
          '<td class="num">' + (p.costo ? U.dinero(p.costo) : '<span class="tenue">—</span>') + '</td>' +
          '<td class="num">' + U.dinero(p.precio_venta) + '</td>' +
          '<td class="num">' + celdaGanancia(p) + '</td>' +
          '<td class="num"><input class="stock-editable' + (POS.Productos.stockBajo(p) ? ' alerta' : '') + '" type="number" min="0" step="1" data-stock="' + p.id + '" value="' + p.stock + '"' +
          ' aria-label="Unidades disponibles de ' + U.esc(p.nombre) + '"></td>' +
          '<td class="num">' + p.stock_minimo + '</td>' +
          '<td class="acciones">' +
          '<button class="boton-icono" data-editar="' + p.id + '" aria-label="Editar"' + U.ayuda.attr('Editar nombre, precios, categoría y unidades disponibles.') + '>' + U.icono('editar') + '</button>' +
          (p.activo
            ? '<button class="boton boton-texto" data-desactivar="' + p.id + '"' + U.ayuda.attr('Oculta el producto en Ventas sin borrarlo. Se puede volver a activar con "Mostrar inactivos".') + '>Desactivar</button>'
            : '<button class="boton boton-texto" data-activar="' + p.id + '">Activar</button>') +
          '<button class="boton-icono boton-peligro" data-eliminar="' + p.id + '" aria-label="Eliminar"' + U.ayuda.attr('Se borra si no tiene ventas (aunque tenga compras). Si ya se vendió, queda desactivado para conservar el historial.', 'Eliminar') + '>' + U.icono('borrar') + '</button>' +
          '</td></tr>';
      }).join('');
      pintarBarra();
    }

    U.$('#sel-todos', cont).addEventListener('change', function (e) {
      listaVisible.forEach(function (p) { if (e.target.checked) seleccion[p.id] = true; else delete seleccion[p.id]; });
      pintar();
    });
    // Unidades disponibles editables en la tabla: Enter guarda y pasa al siguiente producto,
    // Tab o clic afuera también guarda (ajuste de inventario), Esc deshace.
    function guardarStock(input) {
      var p = POS.Productos.obtener(input.getAttribute('data-stock'));
      if (!p) return;
      var valor = input.value.trim();
      if (valor === '' || Number(valor) === p.stock) { input.value = p.stock; return; }
      if (!/^\d+$/.test(valor)) {
        U.aviso('Las unidades deben ser un número entero, 0 o más.', 'error');
        input.value = p.stock;
        return;
      }
      try {
        var r = POS.Inventario.ajustarManual({ productoId: p.id, nuevoStock: Number(valor), motivo: 'Ajuste desde Productos' });
        input.value = r.stock;
        input.classList.toggle('alerta', POS.Productos.stockBajo(r));
        U.aviso(r.nombre + ': ' + p.stock + ' → ' + r.stock + ' unidades', 'ok');
      } catch (err) {
        input.value = p.stock;
        U.error(err);
      }
    }
    U.$('#filas', cont).addEventListener('keydown', function (e) {
      if (!e.target.hasAttribute('data-stock')) return;
      if (e.key === 'Enter') {
        // Como en una hoja de cálculo: guarda y baja al producto siguiente.
        e.preventDefault();
        var todos = U.$$('[data-stock]', cont), sig = todos[todos.indexOf(e.target) + 1];
        if (sig) { sig.focus(); sig.select(); } else e.target.blur();
      }
      else if (e.key === 'Escape') { e.target.value = POS.Productos.obtener(e.target.getAttribute('data-stock')).stock; e.target.blur(); }
    });
    // Que la rueda del ratón no cambie las unidades sin querer.
    U.$('#filas', cont).addEventListener('wheel', function (e) {
      if (e.target.hasAttribute && e.target.hasAttribute('data-stock') && document.activeElement === e.target) e.target.blur();
    }, { passive: true });
    U.$('#filas', cont).addEventListener('change', function (e) {
      if (e.target.hasAttribute('data-stock')) { guardarStock(e.target); return; }
      var id = e.target.getAttribute('data-sel');
      if (!id) return;
      if (e.target.checked) seleccion[id] = true; else delete seleccion[id];
      pintarBarra();
    });

    inputFiltro.addEventListener('input', function () {
      filtro = inputFiltro.value;
      pintar();
    });
    U.$('#inactivos', cont).addEventListener('change', function (e) {
      mostrarInactivos = e.target.checked;
      pintar();
    });
    U.$('#btn-nuevo', cont).addEventListener('click', function () {
      formulario(null, pintar);
    });
    U.$('#filas', cont).addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button') : null;
      if (!btn) return;
      if (btn.hasAttribute('data-eliminar')) {
        eliminar([Number(btn.getAttribute('data-eliminar'))]);
      } else if (btn.hasAttribute('data-editar')) {
        formulario(POS.Productos.obtener(btn.getAttribute('data-editar')), pintar);
      } else if (btn.hasAttribute('data-desactivar')) {
        var p = POS.Productos.obtener(btn.getAttribute('data-desactivar'));
        U.confirmar('¿Desactivar "' + p.nombre + '"? No aparecerá en ventas, pero se conserva en el historial.', function () {
          POS.Productos.desactivar(p.id);
          U.aviso('Producto desactivado', 'ok');
          pintar();
        }, 'Desactivar');
      } else if (btn.hasAttribute('data-activar')) {
        try {
          POS.Productos.actualizar(btn.getAttribute('data-activar'), { activo: true });
          pintar();
        } catch (err) {
          U.error(err);
        }
      }
    });

    pintar();
    inputFiltro.focus();
  }

  // Formulario de producto. También se usa desde Ventas y Compras para crear un
  // producto sin salir de la pantalla. `inicial` prellena un producto nuevo
  // ({ nombre, codigoBarras, sinStock }); `alGuardar` recibe el producto guardado.
  function formulario(producto, alGuardar, inicial) {
    inicial = inicial || {};
    var p = producto || { nombre: inicial.nombre || '', codigo_barras: inicial.codigoBarras || '' };
    var edicion = !!producto;
    U.modal({
      titulo: edicion ? 'Editar producto' : 'Nuevo producto',
      cuerpo:
        '<form class="form-producto" onsubmit="return false">' +
        (edicion ? '<p class="tenue">Código interno: ' + U.esc(p.codigo_interno) + '</p>' : '<p class="tenue">El código interno se genera automáticamente.</p>') +
        '<label class="campo"><span>Código de barras (opcional)</span><input name="codigoBarras" value="' + U.esc(p.codigo_barras || '') + '"></label>' +
        '<label class="campo"><span>Nombre *</span><input name="nombre" required value="' + U.esc(p.nombre || '') + '"></label>' +
        '<label class="campo"><span>Descripción</span><textarea name="descripcion" rows="2">' + U.esc(p.descripcion || '') + '</textarea></label>' +
        '<label class="campo"><span>Categoría</span><select name="categoriaId">' + opcionesCategorias(p.categoria_id) + '</select></label>' +
        '<div class="fila-doble">' +
        '<label class="campo"><span>Precio de compra</span><input name="precioCompra" type="number" min="0" step="any" value="' + (p.costo ? p.costo : '') + '"></label>' +
        '<label class="campo"><span>Precio de venta</span><input name="precioVenta" type="number" min="0" step="any" value="' + (p.precio_venta !== undefined ? p.precio_venta : '') + '"></label>' +
        '</div>' +
        '<p class="ganancia-form" id="ganancia-form"></p>' +
        '<label class="campo"><span>Stock mínimo</span><input name="stockMinimo" type="number" min="0" step="1" value="' + (p.stock_minimo !== undefined ? p.stock_minimo : 0) + '"></label>' +
        (!edicion && inicial.sinStock
          ? '<p class="tenue">El stock se suma al registrar la compra.</p>'
          : !edicion
          ? '<label class="campo"><span>Stock inicial</span><input name="stock" type="number" min="0" step="1" value="0"></label>'
          : '<div class="fila-doble">' +
            '<label class="campo"><span>Unidades disponibles' + U.ayuda.icono('Corrija aquí las unidades si el conteo físico no coincide. El cambio queda como ajuste de inventario.') + '</span><input name="stock" type="number" min="0" step="1" value="' + p.stock + '"></label>' +
            '<label class="campo"><span>Motivo del cambio (opcional)' + U.ayuda.icono('Se guarda en Inventario > Movimientos y en Auditoría para saber por qué cambió el stock.') + '</span><input name="motivoStock" placeholder="Ej. conteo físico"></label></div>' +
            '<p class="tenue pequeno">Si cambia las unidades, queda registrado como ajuste de inventario.</p>') +
        '</form>',
      alAbrir: function (raiz) {
        var fc = U.$('[name=precioCompra]', raiz), fv = U.$('[name=precioVenta]', raiz), out = U.$('#ganancia-form', raiz);
        function calcular() {
          var g = ganancia(fc.value, fv.value);
          out.className = 'ganancia-form' + (g && g.valor <= 0 ? ' alerta' : '');
          out.innerHTML = g
            ? 'Ganancia por unidad: <strong>' + U.dinero(g.valor) + '</strong> · ' + g.margen + '% sobre la venta · ' + g.sobreCosto + '% sobre el costo' +
              (g.valor <= 0 ? ' — <strong>se vende por debajo del costo</strong>' : '')
            : '<span class="tenue">Escriba el precio de compra y el de venta para ver la ganancia.</span>';
        }
        fc.addEventListener('input', calcular);
        fv.addEventListener('input', calcular);
        calcular();
      },
      botones: [
        { texto: 'Cancelar', clase: 'boton-secundario' },
        {
          texto: 'Guardar',
          clase: 'boton-primario',
          accion: function (cerrar, raiz) {
            var datos = U.leerForm(raiz);
            var cambiaStock = edicion && String(datos.stock).trim() !== '' && Number(datos.stock) !== p.stock;
            if (cambiaStock && !/^\d+$/.test(String(datos.stock).trim())) throw new Error('Las unidades disponibles deben ser un número entero, 0 o más.');
            var guardado = edicion ? POS.Productos.actualizar(p.id, datos) : POS.Productos.crear(datos);
            if (cambiaStock) {
              POS.Inventario.ajustarManual({ productoId: p.id, nuevoStock: Number(datos.stock), motivo: String(datos.motivoStock || '').trim() || 'Ajuste desde Productos' });
            }
            cerrar();
            U.aviso('Producto guardado', 'ok');
            if (alGuardar) alGuardar(POS.Productos.obtener(guardado.id));
          }
        }
      ]
    });
  }

  window.FormularioProducto = formulario;

  App.registrar('productos', { titulo: 'Productos', icono: 'caja', soloAdmin: true, render: render });
})();
