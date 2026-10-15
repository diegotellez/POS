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
      '<th>#</th><th>Fecha</th><th class="col-opc">Usuario</th><th class="col-opc">Cliente</th><th class="num">Total</th><th class="col-opc">Pago</th><th class="col-estado">Estado</th><th class="acciones-venta">Acciones</th>' +
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
          '<td>' + v.id + (anulada ? '<br><span class="etiqueta etiqueta-alerta solo-angosto">ANULADA</span>' : '') + (esCambio ? '<br><span class="etiqueta etiqueta-cambio">CAMBIO de #' + v.venta_origen_id + '</span>' : '') +
          (!esCambio && v.cambios && v.cambios.length ? '<br><small class="tenue">con ' + v.cambios.length + ' cambio(s)</small>' : '') + '</td>' +
          '<td>' + U.esc(v.fecha_hora) + '</td>' +
          '<td class="col-opc">' + U.esc(v.nombre_usuario) + '</td>' +
          '<td class="col-opc">' + U.esc(v.cliente_nombre || v.cliente_documento || '—') + '</td>' +
          '<td class="num">' + U.dinero(v.total) + '</td>' +
          '<td class="col-opc">' + U.esc(v.pagos.map(function (p) { return POS.Ventas.nombreMetodo(p.metodo_pago); }).join(', ')) + '</td>' +
          '<td class="col-estado">' + (anulada ? '<span class="etiqueta etiqueta-alerta" title="' + U.esc(v.motivo_anulacion) + '">ANULADA</span>' : '<span class="etiqueta">COMPLETADA</span>') + '</td>' +
          '<td class="acciones acciones-venta"><div class="acciones-fila">' +
          '<button class="boton-icono" data-ver="' + v.id + '" title="Ver detalle" aria-label="Ver detalle">' + U.icono('reporte') + '</button>' +
          '<button class="boton-icono" data-imprimir="' + v.id + '" title="Reimprimir" aria-label="Reimprimir">' + U.icono('imprimir') + '</button>' +
          (!anulada ? '<button class="boton boton-texto" data-cambiar="' + (esCambio ? v.venta_origen_id : v.id) + '" title="Devolver o cambiar productos de la venta">Devolver / Cambiar</button>' : '') +
          (!anulada && !esCambio && !(v.cambios && v.cambios.length) ? '<button class="boton boton-texto boton-peligro" data-anular="' + v.id + '">Anular</button>' : '') +
          '</div></td></tr>';
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
        verDetalle(POS.Ventas.obtener(btn.getAttribute('data-ver')), usuario, pintar);
      } else if (btn.hasAttribute('data-anular')) {
        anular(Number(btn.getAttribute('data-anular')), pintar);
      } else if (btn.hasAttribute('data-cambiar')) {
        cambiar(Number(btn.getAttribute('data-cambiar')), usuario, pintar);
      }
    });

    pintar();
  }

  function verDetalle(v, usuario, alTerminar) {
    var esCambio = v.tipo === 'CAMBIO';
    var activa = v.estado !== 'ANULADA';
    var origenId = esCambio ? v.venta_origen_id : v.id;
    // Las acciones también están aquí, por si en pantallas angostas no se ven en la tabla.
    var botones = [{ texto: 'Cerrar', clase: 'boton-secundario' }];
    if (activa && !esCambio && !(v.cambios && v.cambios.length)) {
      botones.unshift({ texto: 'Anular venta', clase: 'boton-texto boton-peligro', accion: function (cerrar) { cerrar(); anular(v.id, alTerminar); } });
    }
    if (activa) {
      botones.push({ texto: 'Devolver / Cambiar productos', clase: 'boton-primario', accion: function (cerrar) { cerrar(); cambiar(origenId, usuario, alTerminar); } });
    }
    U.modal({
      botones: botones,
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
        '<p>' + v.pagos.map(function (p) { return U.esc(POS.Ventas.nombreMetodo(p.metodo_pago)) + ': ' + U.dinero(p.monto); }).join('<br>') + '</p>' +
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
    // Nueva composición: parte de lo que el cliente tiene hoy.
    var lineas = original.map(function (l) { return { productoId: l.productoId, nombre: l.nombre, cantidad: l.cantidad, antes: l.cantidad, precio: l.precio }; });

    function precioNuevo(l) {
      if (l.cantidad <= l.antes) return l.precio;
      var p = POS.Productos.obtener(l.productoId);
      return p ? p.precio_venta : l.precio;
    }
    function diferencia() {
      return U.redondear(valorLleva() - valorDevuelve());
    }
    function valorDevuelve() {
      return U.redondear(lineas.reduce(function (a, l) { return a + Math.max(0, l.antes - l.cantidad) * l.precio; }, 0));
    }
    function valorLleva() {
      return U.redondear(lineas.reduce(function (a, l) { return a + Math.max(0, l.cantidad - l.antes) * precioNuevo(l); }, 0));
    }

    U.modal({
      titulo: 'Devolver o cambiar productos · venta #' + ventaId,
      cuerpo:
        '<p class="tenue pequeno">Venta del ' + U.esc(venta.fecha_hora) + '. Lo devuelto vuelve al inventario.</p>' +
        '<h3 class="cb-paso"><span>1</span> ¿Qué devuelve el cliente?</h3>' +
        '<p class="tenue pequeno cb-ayuda">Baje con <b>–</b> la cantidad del producto que devuelve.</p>' +
        '<div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Producto</th><th class="num">Tenía</th><th class="num">Queda</th><th class="num">Precio</th></tr></thead>' +
        '<tbody id="cb-filas"></tbody></table></div>' +
        '<div class="cb-lleva">' +
        '<h3 class="cb-paso"><span>2</span> ¿Qué se lleva a cambio?</h3>' +
        '<label class="campo campo-busqueda"><span>Buscar o escanear el producto nuevo</span><div class="con-icono">' + U.icono('buscar') +
        '<input id="cb-buscar" autocomplete="off" placeholder="Nombre, código de barras o código interno"></div></label>' +
        '<div id="cb-resultados" class="lista-resultados cb-resultados"></div>' +
        '<div id="cb-nuevos"></div>' +
        '</div>' +
        '<h3 class="cb-paso"><span>3</span> Diferencia</h3>' +
        '<div class="cb-resumen" id="cb-resumen"></div>' +
        '<div id="cb-diferencia"></div>' +
        '<label class="campo"><span>Nota (opcional)</span><input id="cb-nota" placeholder="Ej. cambio por otra presentación"></label>',
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
            var imprimir = function () { U.imprimirHTML(POS.Documentos.ticketHTML(cambio), 380); };
            var conEfectivo = cambio.pagos.some(function (p) { return p.metodo_pago === 'EFECTIVO' && p.monto !== 0; });
            if (!(conEfectivo && Cajon.porEfectivo(imprimir))) {
              U.confirmar('¿Imprimir el comprobante del cambio?', imprimir, 'Imprimir');
            }
            alTerminar();
          }
        }
      ],
      alAbrir: function (raiz) {
        U.$('.modal', raiz).classList.add('modal-ancho');
        var btnOk = U.$('.modal-acciones .boton-primario', raiz);
        var metodoPago = 'EFECTIVO';
        var recibido = '';
        var devolver = false;

        function filaHTML(l, i) {
          var d = l.cantidad - l.antes;
          var nuevo = l.antes === 0;
          return '<tr class="' + (d < 0 ? 'fila-devuelve' : d > 0 ? 'fila-lleva' : '') + '">' +
            '<td>' + U.esc(l.nombre) + (d < 0 ? ' <span class="etiqueta etiqueta-alerta">devuelve ' + (-d) + '</span>' : d > 0 && !nuevo ? ' <span class="etiqueta">lleva ' + d + ' más</span>' : '') + '</td>' +
            (nuevo ? '' : '<td class="num">' + l.antes + '</td>') +
            '<td class="num"><div class="controles-cantidad">' +
            '<button type="button" class="boton-icono" data-menos="' + i + '" aria-label="Restar">' + U.icono('menos') + '</button>' +
            '<input class="cantidad" type="number" min="0" step="1" value="' + l.cantidad + '" data-cant="' + i + '" aria-label="Cantidad">' +
            '<button type="button" class="boton-icono" data-mas="' + i + '" aria-label="Sumar">' + U.icono('mas') + '</button></div></td>' +
            '<td class="num">' + U.dinero(d > 0 ? precioNuevo(l) : l.precio) + '</td>' +
            (nuevo ? '<td class="num">' + U.dinero(l.cantidad * precioNuevo(l)) + '</td>' +
              '<td><button type="button" class="boton-icono" data-quitar="' + i + '" aria-label="Quitar">' + U.icono('borrar') + '</button></td>' : '') +
            '</tr>';
        }

        function pintarFilas() {
          var originales = [], nuevos = [];
          lineas.forEach(function (l, i) { (l.antes > 0 ? originales : nuevos).push(filaHTML(l, i)); });
          U.$('#cb-filas', raiz).innerHTML = originales.join('');
          U.$('#cb-nuevos', raiz).innerHTML = nuevos.length
            ? '<div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Se lleva</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Subtotal</th><th></th></tr></thead>' +
              '<tbody>' + nuevos.join('') + '</tbody></table></div>'
            : '<p class="tenue pequeno cb-ayuda">Aún no ha agregado productos. Si solo devuelve, deje esto vacío.</p>';
          pintarResumen();
        }

        function pintarResumen() {
          var dif = diferencia();
          var cambios = lineas.some(function (l) { return l.cantidad !== l.antes; });
          U.$('#cb-resumen', raiz).innerHTML =
            '<div><span>Devuelve</span><strong>' + U.dinero(valorDevuelve()) + '</strong></div>' +
            '<div><span>Se lleva</span><strong>' + U.dinero(valorLleva()) + '</strong></div>' +
            '<div><span>' + (dif > 0 ? 'Cliente paga' : dif < 0 ? 'Saldo a favor' : 'Diferencia') + '</span><strong class="' + (dif > 0 ? 'ok' : dif < 0 ? 'alerta' : '') + '">' + U.dinero(Math.abs(dif)) + '</strong></div>';
          var html = '';
          if (!cambios) {
            html = '<p class="tenue">Aún no hay cambios.</p>';
          } else if (dif > 0) {
            html = '<div class="aviso-inline cb-paga"><span>El cliente paga el excedente: <strong>' + U.dinero(dif) + '</strong></span>' +
              '<div class="fila-doble"><label class="campo cb-metodo"><span>Método de pago</span><select id="cb-metodo">' +
              POS.Ventas.METODOS_PAGO.map(function (m) { return '<option value="' + m + '"' + (m === metodoPago ? ' selected' : '') + '>' + POS.Ventas.nombreMetodo(m) + '</option>'; }).join('') +
              '</select></label>' +
              (metodoPago === 'EFECTIVO'
                ? '<label class="campo"><span>Paga con (opcional)</span><input id="cb-recibido" type="number" min="0" step="any" inputmode="numeric" placeholder="' + dif + '" value="' + U.esc(recibido) + '"></label>'
                : '') +
              '</div><div id="cb-vueltas" class="pequeno"></div></div>';
          } else if (dif < 0) {
            html = '<div class="aviso-inline cb-favor"><div><strong>Saldo a favor del cliente: ' + U.dinero(-dif) + '</strong><br>' +
              '<span class="pequeno">Norma del negocio: <b>no se devuelve dinero</b>. La diferencia queda registrada como saldo no devuelto.</span></div>' +
              (esAdmin
                ? '<label class="check"><input type="checkbox" id="cb-devolver"' + (devolver ? ' checked' : '') + '> Caso excepcional: devolver el dinero</label>' +
                  (devolver
                    ? '<div class="fila-doble"><label class="campo"><span>Devolver por</span><select id="cb-metodo-dev">' +
                      POS.Ventas.METODOS_PAGO.map(function (m) { return '<option value="' + m + '">' + POS.Ventas.nombreMetodo(m) + '</option>'; }).join('') + '</select></label>' +
                      '<label class="campo"><span>Motivo (obligatorio)</span><input id="cb-motivo" placeholder="Ej. producto defectuoso"></label></div>'
                    : '')
                : '<span class="pequeno tenue">Solo un administrador puede autorizar una devolución de dinero.</span>') +
              '</div>';
          } else {
            html = '<p class="ok">Cambio sin diferencia de valor.</p>';
          }
          U.$('#cb-diferencia', raiz).innerHTML = html;
          btnOk.disabled = !cambios;
          btnOk.textContent = dif > 0 ? 'Registrar y cobrar ' + U.dinero(dif) : 'Registrar cambio';
          var sel = U.$('#cb-metodo', raiz);
          if (sel) sel.addEventListener('change', function () { metodoPago = sel.value; pintarResumen(); });
          var rec = U.$('#cb-recibido', raiz);
          function pintarVueltas() {
            var caja = U.$('#cb-vueltas', raiz);
            if (!caja) return;
            var r = Number(recibido);
            caja.innerHTML = recibido === '' ? '' : r < dif ? '<span class="alerta">Faltan ' + U.dinero(dif - r) + '</span>' : 'Cambio a entregar: <strong>' + U.dinero(r - dif) + '</strong>';
          }
          if (rec) rec.addEventListener('input', function () { recibido = rec.value; pintarVueltas(); });
          pintarVueltas();
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

        function alClicFila(e) {
          var b = e.target.closest ? e.target.closest('button') : null;
          if (!b) return;
          if (b.hasAttribute('data-quitar')) lineas.splice(Number(b.getAttribute('data-quitar')), 1);
          if (b.hasAttribute('data-mas')) lineas[Number(b.getAttribute('data-mas'))].cantidad += 1;
          if (b.hasAttribute('data-menos')) { var l = lineas[Number(b.getAttribute('data-menos'))]; l.cantidad = Math.max(0, l.cantidad - 1); }
          // Si bajó a 0 un producto agregado, se quita de la lista.
          lineas = lineas.filter(function (l) { return l.antes > 0 || l.cantidad > 0; });
          pintarFilas();
        }
        function alCambiarFila(e) {
          if (!e.target.hasAttribute('data-cant')) return;
          var n = Math.floor(Number(e.target.value));
          lineas[Number(e.target.getAttribute('data-cant'))].cantidad = n > 0 ? n : 0;
          lineas = lineas.filter(function (l) { return l.antes > 0 || l.cantidad > 0; });
          pintarFilas();
        }
        ['#cb-filas', '#cb-nuevos'].forEach(function (sel) {
          U.$(sel, raiz).addEventListener('click', alClicFila);
          U.$(sel, raiz).addEventListener('change', alCambiarFila);
        });

        var buscar = U.$('#cb-buscar', raiz);
        var encontrados = [];
        buscar.addEventListener('input', function () {
          encontrados = buscar.value.trim() ? POS.Productos.buscar(buscar.value).filter(function (p) { return p.activo !== false; }).slice(0, 8) : [];
          U.$('#cb-resultados', raiz).innerHTML = encontrados.map(function (p, i) {
            return '<button type="button" class="item-producto" data-agregar="' + i + '"><span class="item-info">' + (p.categoria_nombre ? '<span class="cat-item">' + U.esc(p.categoria_nombre) + '</span>' : '') + '<strong>' + U.esc(p.nombre) + '</strong>' +
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
