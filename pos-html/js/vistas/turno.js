/* Apertura y cierre (arqueo) del turno de caja. */
(function () {
  'use strict';

  var ultimoCierre = null;

  function render(cont, usuario) {
    var turno = POS.Turnos.actual();
    var html = '<div class="angosto"><section class="tarjeta">';

    if (turno) {
      var esperado = POS.Turnos.efectivoEsperado(turno.id);
      var ventas = POS.Ventas.listar({ turnoId: turno.id, estado: 'COMPLETADA', limite: 100000 });
      var totalVendido = ventas.reduce(function (a, v) { return a + v.total; }, 0);
      html +=
        '<h2>' + U.icono('abierto', 'ok') + ' Turno abierto #' + turno.id + '</h2>' +
        '<div class="metricas">' +
        '<div class="metrica"><span>Apertura</span><strong>' + U.esc(turno.fecha_hora_apertura) + '</strong></div>' +
        '<div class="metrica"><span>Base inicial</span><strong>' + U.dinero(turno.base_inicial_efectivo) + '</strong></div>' +
        '<div class="metrica"><span>Vendido (' + ventas.length + ')</span><strong>' + U.dinero(totalVendido) + '</strong></div>' +
        (usuario.rol === 'ADMINISTRADOR'
          ? '<div class="metrica"><span>Efectivo esperado</span><strong>' + U.dinero(esperado) + '</strong></div>'
          : '') +
        '</div>' +
        '<h3>Cerrar turno (arqueo)</h3>' +
        '<p class="tenue">Cuenta el efectivo que hay en caja e ingrésalo. El sistema calcula la diferencia contra lo esperado.</p>' +
        '<form id="form-cerrar" class="form-linea">' +
        '<label class="campo"><span>Efectivo contado</span><input name="efectivo" type="number" min="0" step="any" required></label>' +
        '<button class="boton boton-primario" type="submit">' + U.icono('candado') + ' Cerrar turno</button>' +
        '</form>';
    } else {
      html +=
        '<h2>' + U.icono('candado') + ' Abrir turno de caja</h2>' +
        '<p class="tenue">No hay un turno abierto. Registra la base inicial de efectivo.</p>' +
        '<form id="form-abrir" class="form-linea">' +
        '<label class="campo"><span>Base inicial de efectivo</span><input name="base" type="number" min="0" step="any" value="0" required></label>' +
        '<button class="boton boton-primario" type="submit">' + U.icono('abierto') + ' Abrir turno</button>' +
        '</form>';
    }

    if (ultimoCierre) {
      var c = ultimoCierre;
      html +=
        '<div class="resumen-cierre">' +
        '<h3>Resumen del cierre #' + c.id + '</h3>' +
        '<p>Efectivo esperado: ' + U.dinero(c.efectivoEsperado) + '</p>' +
        '<p>Efectivo contado: ' + U.dinero(c.efectivo_contado) + '</p>' +
        '<p class="' + (c.diferencia_arqueo < 0 ? 'alerta' : '') + '">Diferencia: ' + U.dinero(c.diferencia_arqueo) + POS.etiquetaDiferencia(c.diferencia_arqueo) + '</p>' +
        (usuario.rol === 'ADMINISTRADOR' ? '<a class="boton boton-texto" href="#/reportes?turno=' + c.id + '">Ver reporte completo</a>' : '') +
        '</div>';
    }
    html += '</section></div>';
    cont.innerHTML = html;

    var fAbrir = U.$('#form-abrir', cont);
    if (fAbrir) {
      fAbrir.addEventListener('submit', function (e) {
        e.preventDefault();
        try {
          var t = POS.Turnos.abrir(fAbrir.base.value);
          ultimoCierre = null;
          U.aviso('Turno #' + t.id + ' abierto', 'ok');
          App.ir('ventas');
        } catch (err) {
          U.error(err);
        }
      });
      fAbrir.base.select();
    }

    var fCerrar = U.$('#form-cerrar', cont);
    if (fCerrar) {
      fCerrar.addEventListener('submit', function (e) {
        e.preventDefault();
        var valor = fCerrar.efectivo.value;
        U.confirmar('¿Cerrar el turno #' + turno.id + ' con ' + U.dinero(valor) + ' contados? Después no podrás registrar ventas en este turno.', function () {
          ultimoCierre = POS.Turnos.cerrar(turno.id, valor);
          U.aviso('Turno #' + turno.id + ' cerrado', 'ok');
          render(cont, usuario);
        }, 'Cerrar turno');
      });
    }
  }

  App.registrar('turno', { titulo: 'Turno de caja', icono: 'reloj', render: render });
})();
