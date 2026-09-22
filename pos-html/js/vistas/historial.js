/* Historial de ventas: consulta, reimpresión y anulación. */
(function () {
  'use strict';

  var filtros = { turnoId: 'actual', estado: '', desde: '', hasta: '' };

  function render(cont) {
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
        return '<tr' + (anulada ? ' class="fila-anulada"' : '') + '>' +
          '<td>' + v.id + '</td>' +
          '<td>' + U.esc(v.fecha_hora) + '</td>' +
          '<td>' + U.esc(v.nombre_usuario) + '</td>' +
          '<td>' + U.esc(v.cliente_nombre || v.cliente_documento || '—') + '</td>' +
          '<td class="num">' + U.dinero(v.total) + '</td>' +
          '<td>' + U.esc(v.pagos.map(function (p) { return p.metodo_pago; }).join(', ')) + '</td>' +
          '<td>' + (anulada ? '<span class="etiqueta etiqueta-alerta" title="' + U.esc(v.motivo_anulacion) + '">ANULADA</span>' : '<span class="etiqueta">COMPLETADA</span>') + '</td>' +
          '<td class="acciones">' +
          '<button class="boton-icono" data-ver="' + v.id + '" title="Ver detalle" aria-label="Ver detalle">' + U.icono('reporte') + '</button>' +
          '<button class="boton-icono" data-imprimir="' + v.id + '" title="Reimprimir" aria-label="Reimprimir">' + U.icono('imprimir') + '</button>' +
          (!anulada ? '<button class="boton boton-texto boton-peligro" data-anular="' + v.id + '">Anular</button>' : '') +
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
      }
    });

    pintar();
  }

  function verDetalle(v) {
    U.modal({
      titulo: 'Venta #' + v.id,
      cuerpo:
        '<p class="tenue">' + U.esc(v.fecha_hora) + ' · ' + U.esc(v.nombre_usuario) + '</p>' +
        '<table class="tabla"><thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Subtotal</th></tr></thead><tbody>' +
        v.detalle.map(function (d) {
          return '<tr><td>' + U.esc(d.producto_nombre) + '</td><td class="num">' + d.cantidad + '</td><td class="num">' +
            U.dinero(d.precio_unitario) + '</td><td class="num">' + U.dinero(d.subtotal) + '</td></tr>';
        }).join('') +
        '</tbody></table>' +
        '<p><strong>Total: ' + U.dinero(v.total) + '</strong></p>' +
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

  App.registrar('historial', { titulo: 'Historial de ventas', icono: 'historial', render: render });
})();
