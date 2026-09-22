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

  function render(cont) {
    cont.innerHTML =
      '<section class="tarjeta">' +
      '<div class="encabezado"><h2>Productos</h2>' +
      '<button class="boton boton-primario" id="btn-nuevo">' + U.icono('mas') + ' Nuevo producto</button></div>' +
      '<div class="filtros">' +
      '<label class="campo crece"><span>Filtrar por nombre o código</span><input id="filtro" autocomplete="off"></label>' +
      '<label class="check"><input type="checkbox" id="inactivos"> Mostrar inactivos</label>' +
      '</div>' +
      '<div class="tabla-contenedor"><table class="tabla"><thead><tr>' +
      '<th>Código</th><th>Nombre</th><th>Categoría</th><th class="num">Precio</th><th class="num">Stock</th><th class="num">Mín.</th><th></th>' +
      '</tr></thead><tbody id="filas"></tbody></table></div>' +
      '</section>';

    var inputFiltro = U.$('#filtro', cont);
    inputFiltro.value = filtro;
    U.$('#inactivos', cont).checked = mostrarInactivos;

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
      if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="tenue vacio">No hay productos.</td></tr>';
        return;
      }
      tbody.innerHTML = lista.map(function (p) {
        return '<tr' + (!p.activo ? ' class="fila-anulada"' : '') + '>' +
          '<td>' + U.esc(p.codigo_barras || p.codigo_interno) + (p.codigo_barras ? '<br><small class="tenue">' + U.esc(p.codigo_interno) + '</small>' : '') + '</td>' +
          '<td>' + U.esc(p.nombre) + (!p.activo ? ' <span class="etiqueta etiqueta-alerta">INACTIVO</span>' : '') + '</td>' +
          '<td>' + U.esc(p.categoria_nombre || '—') + '</td>' +
          '<td class="num">' + U.dinero(p.precio_venta) + '</td>' +
          '<td class="num ' + (POS.Productos.stockBajo(p) ? 'alerta' : '') + '">' + p.stock + '</td>' +
          '<td class="num">' + p.stock_minimo + '</td>' +
          '<td class="acciones">' +
          '<button class="boton-icono" data-editar="' + p.id + '" title="Editar" aria-label="Editar">' + U.icono('editar') + '</button>' +
          (p.activo
            ? '<button class="boton-icono" data-desactivar="' + p.id + '" title="Desactivar" aria-label="Desactivar">' + U.icono('borrar') + '</button>'
            : '<button class="boton boton-texto" data-activar="' + p.id + '">Activar</button>') +
          '</td></tr>';
      }).join('');
    }

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
      if (btn.hasAttribute('data-editar')) {
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
        '<label class="campo"><span>Precio de venta</span><input name="precioVenta" type="number" min="0" step="any" value="' + (p.precio_venta !== undefined ? p.precio_venta : '') + '"></label>' +
        '<label class="campo"><span>Stock mínimo</span><input name="stockMinimo" type="number" min="0" step="1" value="' + (p.stock_minimo !== undefined ? p.stock_minimo : 0) + '"></label>' +
        '</div>' +
        (!edicion && inicial.sinStock
          ? '<p class="tenue">El stock se suma al registrar la compra.</p>'
          : !edicion
          ? '<label class="campo"><span>Stock inicial</span><input name="stock" type="number" min="0" step="1" value="0"></label>'
          : '<p class="tenue">Stock actual: ' + p.stock + ' (modifícalo desde Inventario).</p>') +
        '</form>',
      botones: [
        { texto: 'Cancelar', clase: 'boton-secundario' },
        {
          texto: 'Guardar',
          clase: 'boton-primario',
          accion: function (cerrar, raiz) {
            var datos = U.leerForm(raiz);
            var guardado = edicion ? POS.Productos.actualizar(p.id, datos) : POS.Productos.crear(datos);
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
