/* Entradas de mercancía, ajustes manuales e historial de movimientos. */
(function () {
  'use strict';

  var pestana = 'entrada';
  var TIPOS = {
    ENTRADA: 'Entrada',
    SALIDA_POR_VENTA: 'Venta',
    AJUSTE_ANULACION: 'Anulación',
    AJUSTE_MANUAL: 'Ajuste manual'
  };

  function opcionesProductos() {
    return '<option value="">Selecciona un producto…</option>' + POS.Productos.listar({ soloActivos: true }).map(function (p) {
      return '<option value="' + p.id + '">' + U.esc(p.nombre) + ' (stock: ' + p.stock + ')</option>';
    }).join('');
  }

  function render(cont) {
    var bajo = POS.Productos.listarStockBajo();
    cont.innerHTML =
      '<section class="tarjeta">' +
      '<h2>Inventario</h2>' +
      (bajo.length
        ? '<div class="aviso-inline">' + U.icono('alerta', 'alerta') + '<span>Stock bajo en ' + bajo.length + ' producto(s): ' +
          U.esc(bajo.map(function (p) { return p.nombre + ' (' + p.stock + ')'; }).join(', ')) + '</span></div>'
        : '') +
      '<div class="pestanas" role="tablist">' +
      '<button role="tab" data-p="entrada">Compras (entrada de mercancía)</button>' +
      '<button role="tab" data-p="ajuste">Ajuste manual</button>' +
      '<button role="tab" data-p="movimientos">Historial de movimientos</button>' +
      '</div>' +
      '<div id="panel"></div>' +
      '</section>';

    var panel = U.$('#panel', cont);

    function pintar() {
      U.$$('[data-p]', cont).forEach(function (b) {
        b.className = b.getAttribute('data-p') === pestana ? 'activa' : '';
        b.setAttribute('aria-selected', b.getAttribute('data-p') === pestana ? 'true' : 'false');
      });

      if (pestana === 'entrada') {
        panel.innerHTML =
          '<form class="form-inventario" id="form-entrada">' +
          '<label class="campo"><span>Producto</span><select name="productoId" required>' + opcionesProductos() + '</select>' +
          '<button type="button" class="boton boton-texto enlace-nuevo" id="btn-nuevo-compra">' + U.icono('mas') + ' Nuevo producto</button></label>' +
          '<label class="campo"><span>Cantidad a ingresar</span><input name="cantidad" type="number" min="1" step="any" required></label>' +
          '<label class="campo"><span>Referencia (opcional)</span><input name="referencia" placeholder="Ej. compra proveedor X"></label>' +
          '<button class="boton boton-primario" type="submit">Registrar entrada</button>' +
          '</form>';
        var fe = U.$('#form-entrada', panel);
        // El producto que llegó en la compra no existe: se crea aquí mismo y queda seleccionado.
        U.$('#btn-nuevo-compra', panel).addEventListener('click', function () {
          FormularioProducto(null, function (nuevo) {
            fe.productoId.innerHTML = opcionesProductos();
            fe.productoId.value = String(nuevo.id);
            fe.cantidad.focus();
          }, { sinStock: true });
        });
        fe.addEventListener('submit', function (e) {
          e.preventDefault();
          try {
            var p = POS.Inventario.registrarEntrada(U.leerForm(fe));
            U.aviso('Entrada registrada. Nuevo stock de ' + p.nombre + ': ' + p.stock, 'ok');
            render(cont);
          } catch (err) {
            U.error(err);
          }
        });
      } else if (pestana === 'ajuste') {
        panel.innerHTML =
          '<form class="form-inventario" id="form-ajuste">' +
          '<label class="campo"><span>Producto</span><select name="productoId" required>' + opcionesProductos() + '</select></label>' +
          '<label class="campo"><span>Nuevo stock</span><input name="nuevoStock" type="number" step="any" required></label>' +
          '<label class="campo"><span>Motivo del ajuste</span><input name="motivo" placeholder="Ej. conteo físico, merma"></label>' +
          '<button class="boton boton-primario" type="submit">Ajustar stock</button>' +
          '</form>';
        var fa = U.$('#form-ajuste', panel);
        fa.productoId.addEventListener('change', function () {
          var p = fa.productoId.value ? POS.Productos.obtener(fa.productoId.value) : null;
          if (p) fa.nuevoStock.value = p.stock;
        });
        fa.addEventListener('submit', function (e) {
          e.preventDefault();
          try {
            var p = POS.Inventario.ajustarManual(U.leerForm(fa));
            U.aviso('Stock de ' + p.nombre + ' ajustado a ' + p.stock, 'ok');
            render(cont);
          } catch (err) {
            U.error(err);
          }
        });
      } else {
        var movs = POS.Inventario.listarMovimientos();
        panel.innerHTML =
          '<div class="tabla-contenedor"><table class="tabla"><thead><tr>' +
          '<th>Fecha</th><th>Producto</th><th>Tipo</th><th class="num">Cantidad</th><th>Referencia</th>' +
          '</tr></thead><tbody>' +
          (movs.length
            ? movs.map(function (m) {
              return '<tr><td>' + U.esc(m.fecha_hora) + '</td><td>' + U.esc(m.producto_nombre) + '</td>' +
                '<td>' + U.esc(TIPOS[m.tipo] || m.tipo) + '</td>' +
                '<td class="num ' + (m.cantidad < 0 ? 'alerta' : 'ok') + '">' + (m.cantidad > 0 ? '+' : '') + m.cantidad + '</td>' +
                '<td>' + U.esc(m.referencia || '') + '</td></tr>';
            }).join('')
            : '<tr><td colspan="5" class="tenue vacio">Sin movimientos.</td></tr>') +
          '</tbody></table></div>' +
          (movs.length >= 500 ? '<p class="tenue pequeno">Se muestran los 500 movimientos más recientes.</p>' : '');
      }
    }

    U.$$('[data-p]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        pestana = b.getAttribute('data-p');
        pintar();
      });
    });
    pintar();
  }

  App.registrar('inventario', { titulo: 'Inventario', icono: 'bodega', soloAdmin: true, render: render });
})();
