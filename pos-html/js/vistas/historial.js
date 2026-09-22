/* Historial de ventas: consulta, reimpresión y anulación. */
(function () {
  'use strict';

  var filtros = { turnoId: 'actual', estado: '', desde: '', hasta: '' };

  function render(cont, usuario) {
    var turnos = POS.Turnos.listar();
    var actual = POS.Turnos.actual();

    cont.innerHTML =
      '<section class="tarjeta">' +
      '<h2>Historial de ventas</h2>' +
      '<div class="filtros">' +
      '<label class="campo"><span>Turno</span><select id="f-turno">' +
      '<option value="actual">Turno actual' + (actual ? ' (#' + actual.id + ')' : ' (ninguno)') + '</option>' +
      '<option value="">Todos</option>' +
      turnos.map(function (t) {
        return '<option value="' + t.id + '">Turno #' + t.id + ' — ' + U.esc(t.fecha_hora_apertura) + ' (' + t.estado + ')</option>';
      }).join('') +
      '</select></label>' +
      '<label class="campo"><span>Estado</span><select id="f-estado"><option value="">Todos</option><option>COMPLETADA</option><option>ANULADA</option></select></label>' +
      '<label class="campo"><span>Desde</span><input type="date" id="f-desde"></label>' +
      '<label class="campo"><span>Hasta</span><input type="date" id="f-hasta"></label>' +
      '</div>' +
      '<div class="tabla-contenedor"><table class="tabla"><thead><tr>' +
      '<th>#</th><th>Fecha</th><th>Usuario</th><th>Cliente</th><th class="num">Total</th><th>Pago</th><th>Estado</th><th></th>' +
      '</tr></thead><tbody id="filas"></tbody></table></div>' +
      '</section>';

    U.$('#f-turno', cont).value = filtros.turnoId;
    U.$('#f-estado', cont).value = filtros.estado;
    U.$('#f-desde', cont).value = filtros.desde;
    U.$('#f-hasta', cont).value = filtros.hasta;

    function pintar() {
      var turnoId = filtros.turnoId === 'actual' ? (actual ? actual.id : -1) : filtros.turnoId;
      var ventas = POS.Ventas.listar({ turnoId: turnoId, estado: filtros.estado, desde: filtros.desde, hasta: filtros.hasta });
      var tbody = U.$('#filas', cont);
      if (!ventas.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="tenue vacio">No hay ventas para mostrar.</td></tr>';
        return;
      }
      tbody.innerHTML = ventas.map(function (v) {
        var anulada = v.estado === 'ANULADA';
        var esCambio = v.tipo === 'CAMBIO';
        return '<tr' + (anulada ? ' class="fila-anulada"' : '') + '>' +
          '<td>' + v.id + (esCambio ? '<br><span class="etiqueta etiqueta-cambio">CAMBIO de #' + v.venta_origen_id + '</span>' : '') +
          (!esCambio && v.cambios && v.cambios.length ? '<br><small class="tenue">con ' + v.cambios.length + ' cambio(s)</small>' : '') + '</td>' +
          '<td>' + U.esc(v.fecha_hora) + '</td>' +
          '<td>' + U.esc(v.nombre_usuario) + '</td>' +
          '<td>' + U.esc(v.cliente_nombre || v.cliente_documento || '—') + '</td>' +
          '<td class="num">' + U.dinero(v.total) + '</td>' +
          '<td>' + U.esc(v.pagos.map(function (p) { return p.metodo_pago; }).join(', ')) + '</td>' +
          '<td>' + (anulada ? '<span class="etiqueta etiqueta-alerta" title="' + U.esc(v.motivo_anulacion) + '">ANULADA</span>' : '<span class="etiqueta">COMPLETADA</span>') + '</td>' +
          '<td class="acciones">' +
          '<button class="boton-icono" data-ver="' + v.id + '" title="Ver detalle" aria-label="Ver detalle">' + U.icono('reporte') + '</button>' +
          '<button class="boton-icono" data-imprimir="' + v.id + '" title="Reimprimir" aria-label="Reimprimir">' + U.icono('imprimir') + '</button>' +
          (!anulada ? '<button class="boton boton-texto" data-cambiar="' + (esCambio ? v.venta_origen_id : v.id) + '">Cambiar</button>' : '') +
          (!anulada && !esCambio && !(v.cambios && v.cambios.length) ? '<button class="boton boton-texto boton-peligro" data-anular="' + v.id + '">Anular</button>' : '') +
          '</td></tr>';
      }).join('');
    }

    ['turno', 'estado', 'desde', 'hasta'].forEach(function (k) {
      U.$('#f-' + k, cont).addEventListener('change', function (e) {
        filtros[k === 'turno' ? 'turnoId' : k] = e.target.value;
        pintar();
      });
    });

    U.$('#filas', cont).addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button') : null;
      if (!btn) return;
      if (btn.hasAttribute('data-imprimir')) {
        U.imprimirHTML(POS.Documentos.ticketHTML(POS.Ventas.obtener(btn.getAttribute('data-imprimir'))), 380);
      } else if (btn.hasAttribute('data-ver')) {
        verDetalle(POS.Ventas.obtener(btn.getAttribute('data-ver')));
      } else if (btn.hasAttribute('data-anular')) {
        anular(Number(btn.getAttribute('data-anular')), pintar);
      } else if (btn.hasAttribute('data-cambiar')) {
        cambiar(Number(btn.getAttribute('data-cambiar')), usuario, pintar);
      }
    });

    pintar();
  }

  function verDetalle(v) {
    var esCambio = v.tipo === 'CAMBIO';
    U.modal({
      titulo: esCambio ? 'Cambio #' + v.id + ' (venta #' + v.venta_origen_id + ')' : 'Venta #' + v.id,
      cuerpo:
        '<p class="tenue">' + U.esc(v.fecha_hora) + ' · ' + U.esc(v.nombre_usuario) + '</p>' +
        '<table class="tabla"><thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Subtotal</th></tr></thead><tbody>' +
        v.detalle.map(function (d) {
          return '<tr><td>' + U.esc(d.producto_nombre) + '</td><td class="num">' + d.cantidad + '</td><td class="num">' +
            U.dinero(d.precio_unitario) + '</td><td class="num">' + U.dinero(d.subtotal) + '</td></tr>';
        }).join('') +
        '</tbody></table>' +
        (esCambio
          ? '<p><strong>Diferencia: ' + U.dinero(v.diferencia) + '</strong>' +
            (v.saldo_retenido ? '<br>Saldo a favor no devuelto (política): ' + U.dinero(v.saldo_retenido) : '') +
            (v.motivo_reembolso ? '<br>Devolución autorizada. Motivo: ' + U.esc(v.motivo_reembolso) : '') +
            (v.nota ? '<br>Nota: ' + U.esc(v.nota) : '') + '</p>'
          : '<p><strong>Total: ' + U.dinero(v.total) + '</strong>' +
            (v.cambios && v.cambios.length ? '<br><span class="tenue">Cambios registrados: ' + v.cambios.map(function (c) { return '#' + c; }).join(', ') + '</span>' : '') + '</p>') +
        '<p>' + v.pagos.map(function (p) { return U.esc(p.metodo_pago) + ': ' + U.dinero(p.monto); }).join('<br>') + '</p>' +
        (v.estado === 'ANULADA'
          ? '<p class="alerta">Anulada el ' + U.esc(v.fecha_hora_anulacion) + '. Motivo: ' + U.esc(v.motivo_anulacion) + '</p>'
          : '')
    });
  }

  function anular(id, alTerminar) {
    U.modal({
      titulo: 'Anular venta #' + id,
      cuerpo: '<p class="tenue">El stock de los productos se devolverá al inventario.</p>' +
        '<label class="campo"><span>Motivo de la anulación</span><textarea name="motivo" rows="2" required></textarea></label>',
      botones: [
        { texto: 'Cancelar', clase: 'boton-secundario' },
        {
          texto: 'Anular venta',
          clase: 'boton-primario boton-peligro-lleno',
          accion: function (cerrar, raiz) {
            POS.Ventas.anular(id, U.$('[name=motivo]', raiz).value);
            cerrar();
            U.aviso('Venta #' + id + ' anulada', 'ok');
            alTerminar();
          }
        }
      ]
    });
  }

  // ---------- Cambio de productos ----------
  function cambiar(ventaId, usuario, alTerminar) {
    var venta = POS.Ventas.obtener(ventaId);
    var esAdmin = usuario && usuario.rol === 'ADMINISTRADOR';
    var original = POS.Ventas.composicion(ventaId);
    var valorActual = U.redondear(original.reduce(function (a, l) { return a + l.cantidad * l.precio; }, 0));
    // Nueva composición: parte de lo que el cliente tiene hoy.
    var lineas = original.map(function (l) { return { productoId: l.productoId, nombre: l.nombre, cantidad: l.cantidad, antes: l.cantidad, precio: l.precio }; });

    function precioNuevo(l) {
      if (l.cantidad <= l.antes) return l.precio;
      var p = POS.Productos.obtener(l.productoId);
      return p ? p.precio_venta : l.precio;
    }
    function diferencia() {
      return U.redondear(lineas.reduce(function (a, l) {
        var d = l.cantidad - l.antes;
        return a + d * (d > 0 ? precioNuevo(l) : l.precio);
      }, 0));
    }

    U.modal({
      titulo: 'Cambiar productos · venta #' + ventaId,
      cuerpo:
        '<p class="tenue pequeno">Venta del ' + U.esc(venta.fecha_hora) + '. Ajuste las cantidades de lo que el cliente devuelve y agregue lo que lleva a cambio. ' +
        'Lo devuelto vuelve al inventario.</p>' +
        '<div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Producto</th><th class="num">Tenía</th><th class="num">Queda</th><th class="num">Precio</th></tr></thead>' +
        '<tbody id="cb-filas"></tbody></table></div>' +
        '<label class="campo"><span>Agregar producto (buscar o escanear)</span><input id="cb-buscar" autocomplete="off" placeholder="Nombre o código"></label>' +
        '<div id="cb-resultados" class="lista-resultados cb-resultados"></div>' +
        '<div class="cb-resumen" id="cb-resumen"></div>' +
        '<div id="cb-diferencia"></div>' +
        '<label class="campo"><span>Nota (opcional)</span><input id="cb-nota" placeholder="Ej. talla equivocada, cambio por otra marca"></label>',
      botones: [
        { texto: 'Cancelar', clase: 'boton-secundario' },
        {
          texto: 'Registrar cambio',
          clase: 'boton-primario',
          accion: function (cerrar, raiz) {
            var dif = diferencia();
            var datos = {
              items: lineas.map(function (l) { return { productoId: l.productoId, cantidad: l.cantidad }; }),
              nota: U.$('#cb-nota', raiz).value
            };
            if (dif > 0) {
              datos.pagos = [{ metodoPago: U.$('#cb-metodo', raiz).value, monto: dif }];
            } else if (dif < 0 && U.$('#cb-devolver', raiz) && U.$('#cb-devolver', raiz).checked) {
              datos.reembolso = { metodoPago: U.$('#cb-metodo-dev', raiz).value, motivo: U.$('#cb-motivo', raiz).value };
            }
            var cambio = POS.Ventas.cambiar(ventaId, datos);
            cerrar();
            U.aviso('Cambio #' + cambio.id + ' registrado' +
              (cambio.diferencia > 0 ? '. Cobrado: ' + U.dinero(cambio.diferencia) : '') +
              (cambio.saldo_retenido ? '. Saldo no devuelto: ' + U.dinero(cambio.saldo_retenido) : '') +
              (cambio.motivo_reembolso ? '. Devuelto: ' + U.dinero(-cambio.diferencia) : ''), 'ok', 6000);
            U.confirmar('¿Imprimir el comprobante del cambio?', function () {
              U.imprimirHTML(POS.Documentos.ticketHTML(cambio), 380);
            }, 'Imprimir');
            alTerminar();
          }
        }
      ],
      alAbrir: function (raiz) {
        U.$('.modal', raiz).classList.add('modal-ancho');
        var btnOk = U.$('.modal-acciones .boton-primario', raiz);
        var metodoPago = 'EFECTIVO';
        var devolver = false;

        function pintarFilas() {
          U.$('#cb-filas', raiz).innerHTML = lineas.map(function (l, i) {
            var d = l.cantidad - l.antes;
            return '<tr class="' + (d < 0 ? 'fila-devuelve' : d > 0 ? 'fila-lleva' : '') + '">' +
              '<td>' + U.esc(l.nombre) + (d < 0 ? ' <span class="etiqueta etiqueta-alerta">devuelve ' + (-d) + '</span>' : d > 0 ? ' <span class="etiqueta">lleva ' + d + '</span>' : '') + '</td>' +
              '<td class="num">' + l.antes + '</td>' +
              '<td class="num"><div class="controles-cantidad">' +
              '<button type="button" class="boton-icono" data-menos="' + i + '" aria-label="Restar">' + U.icono('menos') + '</button>' +
              '<input class="cantidad" type="number" min="0" step="1" value="' + l.cantidad + '" data-cant="' + i + '" aria-label="Cantidad">' +
              '<button type="button" class="boton-icono" data-mas="' + i + '" aria-label="Sumar">' + U.icono('mas') + '</button></div></td>' +
              '<td class="num">' + U.dinero(d > 0 ? precioNuevo(l) : l.precio) + '</td></tr>';
          }).join('');
          pintarResumen();
        }

        function pintarResumen() {
          var dif = diferencia();
          var cambios = lineas.some(function (l) { return l.cantidad !== l.antes; });
          U.$('#cb-resumen', raiz).innerHTML =
            '<div><span>Valor de lo que tenía</span><strong>' + U.dinero(valorActual) + '</strong></div>' +
            '<div><span>Diferencia</span><strong class="' + (dif < 0 ? 'alerta' : '') + '">' + U.dinero(dif) + '</strong></div>';
          var html = '';
          if (!cambios) {
            html = '<p class="tenue">Aún no hay cambios.</p>';
          } else if (dif > 0) {
            html = '<div class="aviso-inline"><span>El cliente paga la diferencia: <strong>' + U.dinero(dif) + '</strong></span>' +
              '<label class="campo cb-metodo"><span>Método</span><select id="cb-metodo">' +
              POS.Ventas.METODOS_PAGO.map(function (m) { return '<option' + (m === metodoPago ? ' selected' : '') + '>' + m + '</option>'; }).join('') +
              '</select></label></div>';
          } else if (dif < 0) {
            html = '<div class="aviso-inline cb-favor"><div><strong>Saldo a favor del cliente: ' + U.dinero(-dif) + '</strong><br>' +
              '<span class="pequeno">Norma del negocio: <b>no se devuelve dinero</b>. La diferencia queda registrada como saldo no devuelto.</span></div>' +
              (esAdmin
                ? '<label class="check"><input type="checkbox" id="cb-devolver"' + (devolver ? ' checked' : '') + '> Caso excepcional: devolver el dinero</label>' +
                  (devolver
                    ? '<div class="fila-doble"><label class="campo"><span>Devolver por</span><select id="cb-metodo-dev">' +
                      POS.Ventas.METODOS_PAGO.map(function (m) { return '<option>' + m + '</option>'; }).join('') + '</select></label>' +
                      '<label class="campo"><span>Motivo (obligatorio)</span><input id="cb-motivo" placeholder="Ej. producto defectuoso"></label></div>'
                    : '')
                : '<span class="pequeno tenue">Solo un administrador puede autorizar una devolución de dinero.</span>') +
              '</div>';
          } else {
            html = '<p class="ok">Cambio sin diferencia de valor.</p>';
          }
          U.$('#cb-diferencia', raiz).innerHTML = html;
          btnOk.disabled = !cambios;
          var sel = U.$('#cb-metodo', raiz);
          if (sel) sel.addEventListener('change', function () { metodoPago = sel.value; });
          var chk = U.$('#cb-devolver', raiz);
          if (chk) chk.addEventListener('change', function () { devolver = chk.checked; pintarResumen(); });
        }

        function agregar(p) {
          if (!(p.precio_venta > 0)) { U.aviso('"' + p.nombre + '" no tiene precio', 'error'); return; }
          var l = lineas.filter(function (x) { return x.productoId === p.id; })[0];
          if (l) l.cantidad += 1;
          else lineas.push({ productoId: p.id, nombre: p.nombre, cantidad: 1, antes: 0, precio: p.precio_venta });
          buscar.value = '';
          U.$('#cb-resultados', raiz).innerHTML = '';
          pintarFilas();
          buscar.focus();
        }

        U.$('#cb-filas', raiz).addEventListener('click', function (e) {
          var b = e.target.closest ? e.target.closest('button') : null;
          if (!b) return;
          if (b.hasAttribute('data-mas')) lineas[Number(b.getAttribute('data-mas'))].cantidad += 1;
          if (b.hasAttribute('data-menos')) { var l = lineas[Number(b.getAttribute('data-menos'))]; l.cantidad = Math.max(0, l.cantidad - 1); }
          pintarFilas();
        });
        U.$('#cb-filas', raiz).addEventListener('change', function (e) {
          if (!e.target.hasAttribute('data-cant')) return;
          var n = Math.floor(Number(e.target.value));
          lineas[Number(e.target.getAttribute('data-cant'))].cantidad = n > 0 ? n : 0;
          pintarFilas();
        });

        var buscar = U.$('#cb-buscar', raiz);
        var encontrados = [];
        buscar.addEventListener('input', function () {
          encontrados = POS.Productos.buscar(buscar.value).slice(0, 8);
          U.$('#cb-resultados', raiz).innerHTML = encontrados.map(function (p, i) {
            return '<button type="button" class="item-producto" data-agregar="' + i + '"><span class="item-info"><strong>' + U.esc(p.nombre) + '</strong>' +
              '<small class="tenue">Stock: ' + p.stock + '</small></span><span class="' + (p.precio_venta > 0 ? 'precio' : 'sin-precio') + '">' +
              (p.precio_venta > 0 ? U.dinero(p.precio_venta) : 'Sin precio') + '</span></button>';
          }).join('');
        });
        buscar.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter' && e.keyCode !== 13) return;
          e.preventDefault();
          var p = POS.Productos.obtenerPorCodigo(buscar.value) || (encontrados.length === 1 ? encontrados[0] : null);
          if (p) agregar(p);
          else U.aviso('No hay un producto con ese código', 'error');
        });
        U.$('#cb-resultados', raiz).addEventListener('click', function (e) {
          var b = e.target.closest ? e.target.closest('[data-agregar]') : null;
          if (b) agregar(encontrados[Number(b.getAttribute('data-agregar'))]);
        });

        pintarFilas();
        setTimeout(function () { buscar.focus(); }, 0);
      }
    });
  }

  App.registrar('historial', { titulo: 'Historial de ventas', icono: 'historial', render: render });
})();
