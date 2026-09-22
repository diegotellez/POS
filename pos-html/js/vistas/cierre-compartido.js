/*
 * Detalle de un cierre de caja abierto desde el enlace del mensaje de WhatsApp
 * (#cierre-...). Es de solo lectura, no pide iniciar sesión y no usa los datos
 * del equipo que lo abre: todo viene dentro del enlace.
 */
(function () {
  'use strict';

  function render(raiz, token) {
    var r;
    try {
      r = POS.Reportes.decodificarCierre(token);
    } catch (err) {
      raiz.className = 'app-publica';
      raiz.innerHTML = '<section class="tarjeta cierre-publico"><h1>Enlace no válido</h1>' +
        '<p class="tenue">Este enlace de cierre está incompleto o dañado. Pide que lo reenvíen desde la caja.</p></section>';
      return;
    }
    var fmt = { moneda: r.moneda, decimales: r.decimales };
    function $(v) { return U.dinero(v, fmt); }
    var a = r.arqueo;
    var cuadre = a.diferencia === null ? '' : a.diferencia === 0 ? 'Cuadre exacto' : a.diferencia < 0 ? 'Faltante' : 'Sobrante';

    raiz.className = 'app-publica';
    raiz.innerHTML =
      '<section class="tarjeta cierre-publico">' +
      '<p class="eyebrow">' + U.esc(r.negocio) + '</p>' +
      '<h1>Cierre de caja #' + r.turno.id + '</h1>' +
      '<p class="tenue">' + U.esc(r.turno.fecha_hora_apertura) + ' → ' + U.esc(r.turno.fecha_hora_cierre || 'en curso') +
      (r.turno.usuario_cierre ? ' · cerró ' + U.esc(r.turno.usuario_cierre) : '') + '</p>' +
      '<div class="cifra-principal"><span>Vendido</span><strong>' + $(r.totalVentas) + '</strong>' +
      '<small class="tenue">' + r.cantidadVentas + ' venta' + (r.cantidadVentas === 1 ? '' : 's') +
      (r.cantidadAnuladas ? ' · ' + r.cantidadAnuladas + ' anulada' + (r.cantidadAnuladas === 1 ? '' : 's') : '') +
      (r.cambios.cantidad ? ' · ' + r.cambios.cantidad + ' cambio' + (r.cambios.cantidad === 1 ? '' : 's') +
        (r.cambios.saldoRetenido ? ' (saldo no devuelto ' + $(r.cambios.saldoRetenido) + ')' : '') +
        (r.cambios.devuelto ? ' · devuelto ' + $(r.cambios.devuelto) : '') : '') + '</small></div>' +

      '<div class="secciones">' +
      '<div><h3>Formas de pago</h3>' + filas(r.porMetodoPago.map(function (m) {
        return [m.metodo_pago.charAt(0) + m.metodo_pago.slice(1).toLowerCase(), $(m.total)];
      })) + '</div>' +
      '<div><h3>Arqueo de caja' + (cuadre ? ' <span class="etiqueta ' + (a.diferencia < 0 ? 'etiqueta-alerta' : '') + '">' + cuadre + '</span>' : '') + '</h3>' +
      filas([
        ['Base inicial', $(a.baseInicial)],
        ['Ventas en efectivo', $(a.efectivoVentas)],
        ['Efectivo esperado', $(a.efectivoEsperado)],
        ['Efectivo contado', a.efectivoContado === null ? '—' : $(a.efectivoContado)],
        ['Diferencia', a.diferencia === null ? '—' : '<span class="' + (a.diferencia < 0 ? 'alerta' : '') + '">' + $(a.diferencia) + '</span>']
      ]) + '</div>' +
      (r.porUsuario.length > 1 || (r.porUsuario[0] && r.turno.usuario_cierre !== r.porUsuario[0].nombre_usuario)
        ? '<div><h3>Por cajero</h3>' + filas(r.porUsuario.map(function (u) {
          return [U.esc(u.nombre_usuario) + ' <small class="tenue">(' + u.cantidad_ventas + ')</small>', $(u.total)];
        })) + '</div>'
        : '') +
      '</div>' +

      '<h3>Productos vendidos (' + r.porProducto.length + ')</h3>' +
      (r.porProducto.length
        ? '<div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Total</th></tr></thead><tbody>' +
          r.porProducto.map(function (p) {
            return '<tr><td>' + U.esc(p.nombre) + '</td><td class="num">' + p.cantidad + '</td><td class="num">' + $(p.total) + '</td></tr>';
          }).join('') + '</tbody></table></div>'
        : '<p class="tenue">No hubo ventas en este turno.</p>') +
      '<p class="tenue pequeno pie-publico">Resumen enviado desde la caja al momento del cierre. No se actualiza si luego hay cambios.</p>' +
      '</section>';
  }

  function filas(pares) {
    if (!pares.length) return '<p class="tenue">Sin datos</p>';
    return '<dl class="pares">' + pares.map(function (p) { return '<dt>' + p[0] + '</dt><dd>' + p[1] + '</dd>'; }).join('') + '</dl>';
  }

  App.cierreCompartido = render;
})();
