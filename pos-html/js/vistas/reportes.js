/* Reportes: consolidado por turno (imprimir/PDF, CSV, WhatsApp) y ventas mensuales. */
(function () {
  'use strict';

  function turnoDeUrl() {
    var t = Number(App.param('turno'));
    return t > 0 ? t : null;
  }

  var pestana = 'turno';
  var mesElegido = null;

  function render(cont) {
    if (turnoDeUrl()) pestana = 'turno';
    cont.innerHTML =
      '<section class="tarjeta">' +
      '<h2>' + U.icono('reporte') + ' Reportes</h2>' +
      '<div class="pestanas" role="tablist">' +
      '<button role="tab" data-p="turno">Por turno</button>' +
      '<button role="tab" data-p="mensual">Ventas mensuales</button>' +
      '</div><div id="panel-reporte"></div></section>';
    var panel = U.$('#panel-reporte', cont);
    function pintarPestana() {
      U.$$('[data-p]', cont).forEach(function (b) {
        var activa = b.getAttribute('data-p') === pestana;
        b.className = activa ? 'activa' : '';
        b.setAttribute('aria-selected', activa ? 'true' : 'false');
      });
      if (pestana === 'mensual') renderMensual(panel); else renderTurno(panel);
    }
    U.$$('[data-p]', cont).forEach(function (b) {
      b.addEventListener('click', function () { pestana = b.getAttribute('data-p'); pintarPestana(); });
    });
    pintarPestana();
  }

  function renderTurno(cont) {
    var turnos = POS.Turnos.listar();
    if (!turnos.length) {
      cont.innerHTML = '<p class="tenue">Aún no hay turnos registrados.</p>';
      return;
    }
    var seleccionado = turnoDeUrl() || turnos[0].id;

    cont.innerHTML =
      '<div>' +
      '<h3>Reporte consolidado de cierre de turno</h3>' +
      '<label class="campo campo-turno"><span>Turno</span><select id="sel-turno">' +
      turnos.map(function (t) {
        return '<option value="' + t.id + '"' + (t.id === seleccionado ? ' selected' : '') + '>Turno #' + t.id + ' — ' +
          U.esc(t.fecha_hora_apertura) + ' (' + t.estado + ')</option>';
      }).join('') +
      '</select></label>' +
      '<div id="reporte"></div>' +
      '</div>';

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
        (r.cambios.cantidad
          ? '<div class="metrica"><span>Cambios de productos</span><strong>' + r.cambios.cantidad + '</strong>' +
            '<small class="tenue">' + (r.cambios.saldoRetenido ? 'Saldo no devuelto: ' + U.dinero(r.cambios.saldoRetenido) : 'Sin saldo retenido') +
            (r.cambios.devuelto ? ' · Devuelto: ' + U.dinero(r.cambios.devuelto) : '') + '</small></div>'
          : '') +
        (r.gastos.cantidad
          ? '<div class="metrica"><span>Gastos y pedidos</span><strong>' + U.dinero(r.gastos.total) + '</strong>' +
            '<small class="tenue">' + r.gastos.cantidad + ' registro(s) · en efectivo ' + U.dinero(r.gastos.efectivo) + '</small></div>'
          : '') +
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
        (a.gastosEfectivo ? '<br>Gastos en efectivo: -' + U.dinero(a.gastosEfectivo) : '') +
        '<br>Efectivo esperado: ' + U.dinero(a.efectivoEsperado) +
        '<br>Efectivo contado: ' + (a.efectivoContado !== null ? U.dinero(a.efectivoContado) : '—') + '</p></div>' +
        '</div>' +
        (r.gastos.cantidad
          ? '<h3>Gastos y pedidos pagados</h3><div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Concepto</th><th>Tipo</th><th>Pago</th><th class="num">Valor</th></tr></thead><tbody>' +
            r.gastos.lista.map(function (g) {
              return '<tr><td>' + U.esc(g.concepto) + '</td><td>' + U.esc(g.tipo) + '</td><td>' + U.esc(g.metodo_pago) + '</td><td class="num">' + U.dinero(g.monto) + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '') +
        '<h3>Productos vendidos (' + r.porProducto.length + ')</h3>' +
        (r.porProducto.length
          ? '<div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Producto</th><th class="num">Cantidad</th><th class="num">Total</th></tr></thead><tbody>' +
            r.porProducto.map(function (p) {
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
      var btnWa = U.$('#btn-wa', cont);
      btnWa.href = POS.Reportes.urlWhatsApp(r);
      btnWa.addEventListener('click', function () {
        if (!numero) U.aviso('Tip: configura un número de WhatsApp por defecto en Respaldo y configuración.', '', 5000);
      });
    }

    U.$('#sel-turno', cont).addEventListener('change', function (e) {
      pintar(Number(e.target.value));
    });
    pintar(seleccionado);
  }

  // ---------- Ventas mensuales ----------
  function renderMensual(cont) {
    var meses = POS.Reportes.mesesDisponibles();
    if (!mesElegido || meses.indexOf(mesElegido) === -1) mesElegido = meses[0];
    cont.innerHTML =
      '<div class="filtros"><label class="campo campo-turno"><span>Mes</span><select id="sel-mes">' +
      meses.map(function (m) {
        var n = POS.Reportes.nombreMes(m);
        return '<option value="' + m + '"' + (m === mesElegido ? ' selected' : '') + '>' + n.charAt(0).toUpperCase() + n.slice(1) + '</option>';
      }).join('') + '</select></label></div><div id="mensual"></div>';

    function pintar() {
      var r = POS.Reportes.mensual(mesElegido);
      var tabla = function (enc, filas) {
        return '<div class="tabla-contenedor"><table class="tabla"><thead><tr>' + enc.map(function (h, i) { return '<th' + (i ? ' class="num"' : '') + '>' + h + '</th>'; }).join('') +
          '</tr></thead><tbody>' + filas.join('') + '</tbody></table></div>';
      };
      var diasActivos = r.dias.filter(function (d) { return d.ventas || d.total || d.gastos; });
      U.$('#mensual', cont).innerHTML =
        '<div class="metricas">' +
        '<div class="metrica"><span>Vendido en ' + U.esc(r.nombre) + '</span><strong>' + U.dinero(r.total) + '</strong><small class="tenue">' + r.cantidadVentas + ' ventas' + (r.cambios ? ' · ' + r.cambios + ' cambios' : '') + '</small></div>' +
        '<div class="metrica"><span>Promedio por día con ventas</span><strong>' + U.dinero(r.promedioDiario) + '</strong><small class="tenue">' + r.diasConVentas + ' día(s) con ventas</small></div>' +
        '<div class="metrica"><span>Ticket promedio</span><strong>' + U.dinero(r.ticketPromedio) + '</strong>' +
        (r.mejorDia ? '<small class="tenue">Mejor día: ' + r.mejorDia.semana + ' ' + r.mejorDia.dia + ' (' + U.dinero(r.mejorDia.total) + ')</small>' : '') + '</div>' +
        '<div class="metrica"><span>Gastos y pedidos</span><strong>' + U.dinero(r.gastos) + '</strong><small class="tenue">Ventas menos gastos: ' + U.dinero(r.neto) + '</small></div>' +
        '</div>' +
        '<h3>Ventas por día</h3>' + grafico(r) +
        '<div class="secciones">' +
        '<div><h3>Por categoría</h3>' + (r.porCategoria.length ? tabla(['Categoría', 'Unid.', 'Total'], r.porCategoria.map(function (c) {
          return '<tr><td>' + U.esc(c.nombre) + '</td><td class="num">' + c.cantidad + '</td><td class="num">' + U.dinero(c.total) + '</td></tr>';
        })) : '<p class="tenue">Sin ventas</p>') + '</div>' +
        '<div><h3>Por método de pago</h3>' + (r.porMetodoPago.length ? tabla(['Método', 'Total'], r.porMetodoPago.map(function (m) {
          return '<tr><td>' + U.esc(m.metodo_pago) + '</td><td class="num">' + U.dinero(m.total) + '</td></tr>';
        })) : '<p class="tenue">Sin ventas</p>') +
        (r.gastosPorTipo.length ? '<h3>Gastos por tipo</h3>' + tabla(['Tipo', 'Total'], r.gastosPorTipo.map(function (g) {
          return '<tr><td>' + U.esc(g.tipo) + '</td><td class="num">' + U.dinero(g.total) + '</td></tr>';
        })) : '') + '</div>' +
        '</div>' +
        '<h3>Detalle por día</h3>' + (diasActivos.length ? tabla(['Día', 'Ventas', 'Vendido', 'Gastos'], diasActivos.map(function (d) {
          return '<tr><td>' + d.semana + ' ' + d.dia + '</td><td class="num">' + d.ventas + '</td><td class="num">' + U.dinero(d.total) + '</td><td class="num">' + (d.gastos ? U.dinero(d.gastos) : '—') + '</td></tr>';
        })) : '<p class="tenue">Sin movimientos en este mes.</p>') +
        '<h3>Productos vendidos en el mes (' + r.porProducto.length + ')</h3>' + (r.porProducto.length ? tabla(['Producto', 'Unid.', 'Total'], r.porProducto.map(function (p) {
          return '<tr><td>' + U.esc(p.nombre) + '</td><td class="num">' + p.cantidad + '</td><td class="num">' + U.dinero(p.total) + '</td></tr>';
        })) : '<p class="tenue">Sin ventas.</p>') +
        '<div class="acciones-reporte">' +
        '<button class="boton boton-primario" id="btn-pdf-mes">' + U.icono('imprimir') + ' Imprimir / Guardar PDF</button>' +
        '<button class="boton boton-secundario" id="btn-csv-mes">' + U.icono('descargar') + ' Exportar (CSV)</button>' +
        '</div>';
      activarTooltip(U.$('#mensual', cont));
      U.$('#btn-pdf-mes', cont).addEventListener('click', function () { U.imprimirHTML(htmlMensual(r), 900); });
      U.$('#btn-csv-mes', cont).addEventListener('click', function () { csvMensual(r); });
    }
    U.$('#sel-mes', cont).addEventListener('change', function (e) { mesElegido = e.target.value; pintar(); });
    pintar();
  }

  // Barras por día (una sola serie). Escala desde 0; la tabla "Detalle por día" es la vista accesible.
  function grafico(r) {
    var max = r.dias.reduce(function (m, d) { return Math.max(m, d.total); }, 0);
    if (!max) return '<p class="tenue">Sin ventas en este mes.</p>';
    var paso = Math.pow(10, Math.floor(Math.log(max) / Math.LN10));
    var tope = Math.ceil(max / paso) * paso;
    if (tope / paso > 6) { paso *= 2; tope = Math.ceil(max / paso) * paso; }
    var W = 760, H = 220, iz = 64, de = 8, ar = 10, ab = 26;
    var ancho = (W - iz - de) / r.dias.length;
    var barra = Math.max(3, ancho - 4);
    var y = function (v) { return ar + (H - ar - ab) * (1 - v / tope); };
    var marcas = [];
    for (var v = 0; v <= tope + 1e-9; v += paso) marcas.push(v);
    var svg = '<svg class="grafico-mes" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Ventas por día de ' + U.esc(r.nombre) + '">';
    marcas.forEach(function (m) {
      svg += '<line class="g-rejilla" x1="' + iz + '" x2="' + (W - de) + '" y1="' + y(m) + '" y2="' + y(m) + '"/>' +
        '<text class="g-eje" x="' + (iz - 6) + '" y="' + (y(m) + 4) + '" text-anchor="end">' + U.esc(U.dinero(m)) + '</text>';
    });
    r.dias.forEach(function (d, i) {
      var x = iz + i * ancho + (ancho - barra) / 2;
      // zona de hover más grande que la barra (va detrás de la barra)
      svg += '<rect class="g-zona" x="' + (iz + i * ancho) + '" y="' + ar + '" width="' + ancho + '" height="' + (H - ar - ab) + '" data-tt="' +
        U.esc(d.semana + ' ' + d.dia + ': ' + U.dinero(d.total) + ' (' + d.ventas + (d.ventas === 1 ? ' venta)' : ' ventas)') + (d.gastos ? ' · gastos ' + U.dinero(d.gastos) : '')) + '"/>';
      if (d.total > 0) {
        var alto = Math.max(2, y(0) - y(d.total));
        var rr = Math.min(4, barra / 2, alto);
        var top = y(0) - alto;
        svg += '<path class="g-barra" d="M' + x + ',' + y(0) + 'V' + (top + rr) + 'Q' + x + ',' + top + ' ' + (x + rr) + ',' + top +
          'H' + (x + barra - rr) + 'Q' + (x + barra) + ',' + top + ' ' + (x + barra) + ',' + (top + rr) + 'V' + y(0) + 'Z"/>';
      }
      if (d.dia === 1 || d.dia % 5 === 0) {
        svg += '<text class="g-eje" x="' + (iz + i * ancho + ancho / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + d.dia + '</text>';
      }
    });
    svg += '<line class="g-base" x1="' + iz + '" x2="' + (W - de) + '" y1="' + y(0) + '" y2="' + y(0) + '"/></svg>';
    return '<div class="grafico-contenedor">' + svg + '<div class="g-tooltip" hidden></div></div>';
  }

  function activarTooltip(raiz) {
    var cont = U.$('.grafico-contenedor', raiz);
    if (!cont) return;
    var tt = U.$('.g-tooltip', cont);
    cont.addEventListener('mousemove', function (e) {
      var z = e.target.getAttribute && e.target.getAttribute('data-tt');
      if (!z) { tt.hidden = true; return; }
      var caja = cont.getBoundingClientRect();
      tt.textContent = z;
      tt.hidden = false;
      var x = e.clientX - caja.left + 12;
      tt.style.left = Math.min(x, caja.width - tt.offsetWidth - 4) + 'px';
      tt.style.top = Math.max(0, e.clientY - caja.top - 36) + 'px';
    });
    cont.addEventListener('mouseleave', function () { tt.hidden = true; });
  }

  function htmlMensual(r) {
    var cfg = DB.config();
    var filas = function (lista, fn) { return lista.map(fn).join(''); };
    return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Ventas de ' + U.esc(r.nombre) + '</title>' +
      '<style>body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:24px;font-size:13px}h1{font-size:20px;text-align:center;margin:0 0 4px}' +
      'h2{font-size:15px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:20px}table{border-collapse:collapse;width:100%}' +
      'th,td{text-align:left;padding:4px 6px;border-bottom:1px solid #eee}.num{text-align:right}.centro{text-align:center}.tenue{color:#666}</style></head><body>' +
      '<h1>' + U.esc(cfg.nombreNegocio) + '</h1><div class="centro">Reporte de ventas de ' + U.esc(r.nombre) + '</div>' +
      '<h2>Resumen</h2><p>Total vendido: <b>' + U.dinero(r.total) + '</b> · Ventas: ' + r.cantidadVentas + ' · Ticket promedio: ' + U.dinero(r.ticketPromedio) +
      '<br>Días con ventas: ' + r.diasConVentas + ' · Promedio diario: ' + U.dinero(r.promedioDiario) +
      '<br>Gastos y pedidos: ' + U.dinero(r.gastos) + ' · Ventas menos gastos: <b>' + U.dinero(r.neto) + '</b></p>' +
      '<h2>Por día</h2><table><tr><th>Día</th><th class="num">Ventas</th><th class="num">Vendido</th><th class="num">Gastos</th></tr>' +
      filas(r.dias.filter(function (d) { return d.ventas || d.total || d.gastos; }), function (d) {
        return '<tr><td>' + d.semana + ' ' + d.dia + '</td><td class="num">' + d.ventas + '</td><td class="num">' + U.dinero(d.total) + '</td><td class="num">' + U.dinero(d.gastos) + '</td></tr>';
      }) + '</table>' +
      '<h2>Por categoría</h2><table><tr><th>Categoría</th><th class="num">Unid.</th><th class="num">Total</th></tr>' +
      filas(r.porCategoria, function (c) { return '<tr><td>' + U.esc(c.nombre) + '</td><td class="num">' + c.cantidad + '</td><td class="num">' + U.dinero(c.total) + '</td></tr>'; }) + '</table>' +
      '<h2>Por método de pago</h2><table>' + filas(r.porMetodoPago, function (m) { return '<tr><td>' + U.esc(m.metodo_pago) + '</td><td class="num">' + U.dinero(m.total) + '</td></tr>'; }) + '</table>' +
      (r.gastosPorTipo.length ? '<h2>Gastos por tipo</h2><table>' + filas(r.gastosPorTipo, function (g) { return '<tr><td>' + U.esc(g.tipo) + '</td><td class="num">' + U.dinero(g.total) + '</td></tr>'; }) + '</table>' : '') +
      '<h2>Productos vendidos</h2><table><tr><th>Producto</th><th class="num">Unid.</th><th class="num">Total</th></tr>' +
      filas(r.porProducto, function (p) { return '<tr><td>' + U.esc(p.nombre) + '</td><td class="num">' + p.cantidad + '</td><td class="num">' + U.dinero(p.total) + '</td></tr>'; }) + '</table>' +
      '<p class="tenue">Generado: ' + U.esc(U.ahora()) + '</p></body></html>';
  }

  function csvMensual(r) {
    var filas = [['seccion', 'concepto', 'cantidad', 'valor']];
    r.dias.forEach(function (d) { filas.push(['dia', d.fecha, d.ventas, d.total]); });
    r.dias.forEach(function (d) { if (d.gastos) filas.push(['gastos_dia', d.fecha, '', d.gastos]); });
    r.porCategoria.forEach(function (c) { filas.push(['categoria', c.nombre, c.cantidad, c.total]); });
    r.porMetodoPago.forEach(function (m) { filas.push(['metodo_pago', m.metodo_pago, '', m.total]); });
    r.gastosPorTipo.forEach(function (g) { filas.push(['gasto_tipo', g.tipo, '', g.total]); });
    r.porProducto.forEach(function (p) { filas.push(['producto', p.nombre, p.cantidad, p.total]); });
    var csv = '\ufeff' + filas.map(function (f) { return f.map(celdaCSV).join(';'); }).join('\r\n');
    U.descargar('ventas-' + r.mes + '.csv', csv, 'text/csv;charset=utf-8');
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
