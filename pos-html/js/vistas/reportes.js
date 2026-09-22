/* Reporte consolidado por turno: imprimir/PDF y envío por WhatsApp. */
(function () {
  'use strict';

  function turnoDeUrl() {
    var t = Number(App.param('turno'));
    return t > 0 ? t : null;
  }

  function render(cont) {
    var turnos = POS.Turnos.listar();
    if (!turnos.length) {
      cont.innerHTML = '<section class="tarjeta"><h2>Reportes</h2><p class="tenue">Aún no hay turnos registrados.</p></section>';
      return;
    }
    var seleccionado = turnoDeUrl() || turnos[0].id;

    cont.innerHTML =
      '<section class="tarjeta">' +
      '<h2>Reporte consolidado de cierre de turno</h2>' +
      '<label class="campo campo-turno"><span>Turno</span><select id="sel-turno">' +
      turnos.map(function (t) {
        return '<option value="' + t.id + '"' + (t.id === seleccionado ? ' selected' : '') + '>Turno #' + t.id + ' — ' +
          U.esc(t.fecha_hora_apertura) + ' (' + t.estado + ')</option>';
      }).join('') +
      '</select></label>' +
      '<div id="reporte"></div>' +
      '</section>';

    function pintar(id) {
      var r = POS.Reportes.construir(id);
      var a = r.arqueo;
      function lista(items, fn) {
        return items.length ? '<ul>' + items.map(fn).join('') + '</ul>' : '<p class="tenue">Sin datos</p>';
      }
      U.$('#reporte', cont).innerHTML =
        '<div class="metricas">' +
        '<div class="metrica"><span>Total vendido</span><strong>' + U.dinero(r.totalVentas) + '</strong></div>' +
        '<div class="metrica"><span>Cantidad de ventas</span><strong>' + r.cantidadVentas +
        (r.cantidadAnuladas ? ' <small class="tenue">(' + r.cantidadAnuladas + ' anuladas)</small>' : '') + '</strong></div>' +
        '<div class="metrica"><span>Diferencia de arqueo</span><strong class="' + (a.diferencia < 0 ? 'alerta' : '') + '">' +
        (a.diferencia !== null ? U.dinero(a.diferencia) : '—') + '</strong></div>' +
        '</div>' +
        '<div class="secciones">' +
        '<div><h3>Por método de pago</h3>' +
        lista(r.porMetodoPago, function (m) { return '<li>' + U.esc(m.metodo_pago) + ': ' + U.dinero(m.total) + '</li>'; }) + '</div>' +
        '<div><h3>Por usuario</h3>' +
        lista(r.porUsuario, function (u) { return '<li>' + U.esc(u.nombre_usuario) + ': ' + U.dinero(u.total) + ' (' + u.cantidad_ventas + ' ventas)</li>'; }) + '</div>' +
        '<div><h3>Arqueo de caja</h3>' +
        '<p>Base inicial: ' + U.dinero(a.baseInicial) + '<br>Ventas en efectivo: ' + U.dinero(a.efectivoVentas) +
        '<br>Efectivo esperado: ' + U.dinero(a.efectivoEsperado) +
        '<br>Efectivo contado: ' + (a.efectivoContado !== null ? U.dinero(a.efectivoContado) : '—') + '</p></div>' +
        '</div>' +
        '<h3>Productos más vendidos</h3>' +
        (r.porProducto.length
          ? '<div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Producto</th><th class="num">Cantidad</th><th class="num">Total</th></tr></thead><tbody>' +
            r.porProducto.slice(0, 15).map(function (p) {
              return '<tr><td>' + U.esc(p.nombre) + '</td><td class="num">' + p.cantidad + '</td><td class="num">' + U.dinero(p.total) + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<p class="tenue">Sin ventas en este turno.</p>') +
        '<div class="acciones-reporte">' +
        '<button class="boton boton-primario" id="btn-pdf">' + U.icono('imprimir') + ' Imprimir / Guardar PDF</button>' +
        '<button class="boton boton-secundario" id="btn-csv">' + U.icono('descargar') + ' Exportar ventas (CSV)</button>' +
        '<a class="boton boton-secundario" id="btn-wa" target="_blank" rel="noopener">' + U.icono('chat') + ' Enviar por WhatsApp</a>' +
        '</div>';

      U.$('#btn-pdf', cont).addEventListener('click', function () {
        U.imprimirHTML(POS.Documentos.reporteHTML(r), 900);
      });
      U.$('#btn-csv', cont).addEventListener('click', function () {
        exportarCSV(r.turno.id);
      });
      // Enlace real (no window.open) para que funcione también cuando se bloquean ventanas.
      var numero = DB.config().whatsapp;
      var texto = encodeURIComponent(POS.Reportes.textoResumen(r));
      var btnWa = U.$('#btn-wa', cont);
      btnWa.href = 'https://wa.me/' + (numero || '') + '?text=' + texto;
      btnWa.addEventListener('click', function () {
        if (!numero) U.aviso('Tip: configura un número de WhatsApp por defecto en Respaldo y configuración.', '', 5000);
      });
    }

    U.$('#sel-turno', cont).addEventListener('change', function (e) {
      pintar(Number(e.target.value));
    });
    pintar(seleccionado);
  }

  function celdaCSV(v) {
    var s = v === null || v === undefined ? '' : String(v);
    return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function exportarCSV(turnoId) {
    var ventas = POS.Ventas.listar({ turnoId: turnoId, limite: 1000000 }).reverse();
    var filas = [['venta', 'fecha', 'usuario', 'estado', 'producto', 'cantidad', 'precio_unitario', 'subtotal', 'total_venta', 'pagos']];
    ventas.forEach(function (v) {
      var pagos = v.pagos.map(function (p) { return p.metodo_pago + ' ' + p.monto; }).join(' | ');
      v.detalle.forEach(function (d) {
        filas.push([v.id, v.fecha_hora, v.nombre_usuario, v.estado, d.producto_nombre, d.cantidad, d.precio_unitario, d.subtotal, v.total, pagos]);
      });
    });
    var csv = '﻿' + filas.map(function (f) { return f.map(celdaCSV).join(';'); }).join('\r\n');
    U.descargar('ventas-turno-' + turnoId + '.csv', csv, 'text/csv;charset=utf-8');
  }

  App.registrar('reportes', { titulo: 'Reportes', icono: 'reporte', soloAdmin: true, render: render });
})();
