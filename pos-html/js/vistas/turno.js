/* Apertura y cierre (arqueo) del turno de caja. */
(function () {
  'use strict';

  // Resumen del último cierre hecho en esta pestaña; solo lo ve quien cerró.
  var ultimoCierre = null;
  var ultimoCierreUsuarioId = null;

  function render(cont, usuario) {
    if (ultimoCierre && ultimoCierreUsuarioId !== usuario.id) ultimoCierre = null;
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
      var cerrado = usuario.rol === 'ADMINISTRADOR' ? POS.Turnos.ultimoCerrado() : null;
      if (cerrado) {
        html +=
          '<div class="bloque-reabrir">' +
          '<h3>¿Cerraste la caja por error?</h3>' +
          '<p class="tenue">Puedes reabrir el turno #' + cerrado.id + ' (cerrado el ' + U.esc(cerrado.fecha_hora_cierre) + '). ' +
          'Vuelve a quedar abierto con todas sus ventas y se borra el arqueo; queda registrado en Auditoría.</p>' +
          '<button type="button" class="boton boton-secundario" id="btn-reabrir">' + U.icono('historial') + ' Reabrir turno #' + cerrado.id + '</button>' +
          '</div>';
      }
    }

    if (ultimoCierre) {
      var c = ultimoCierre;
      var numero = DB.config().whatsapp;
      var reporte = POS.Reportes.construir(c.id);
      html +=
        '<div class="resumen-cierre">' +
        '<h3>Resumen del cierre #' + c.id + '</h3>' +
        '<p>Efectivo esperado: ' + U.dinero(c.efectivoEsperado) + '</p>' +
        '<p>Efectivo contado: ' + U.dinero(c.efectivo_contado) + '</p>' +
        '<p class="' + (c.diferencia_arqueo < 0 ? 'alerta' : '') + '">Diferencia: ' + U.dinero(c.diferencia_arqueo) + POS.etiquetaDiferencia(c.diferencia_arqueo) + '</p>' +
        '<p>Total vendido: <strong>' + U.dinero(reporte.totalVentas) + '</strong> en ' + reporte.cantidadVentas + ' venta(s)</p>' +
        (reporte.porProducto.length
          ? '<div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Total</th></tr></thead><tbody>' +
            reporte.porProducto.map(function (p) {
              return '<tr><td>' + U.esc(p.nombre) + '</td><td class="num">' + p.cantidad + '</td><td class="num">' + U.dinero(p.total) + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<p class="tenue">No hubo ventas en este turno.</p>') +
        '<div class="acciones-reporte">' +
        (numero
          ? '<a class="boton boton-primario" target="_blank" rel="noopener" href="' + U.esc(POS.Reportes.urlWhatsApp(reporte)) + '">' +
            U.icono('chat') + ' Enviar resumen por WhatsApp a +' + U.esc(numero) + '</a>'
          : '<span class="tenue pequeno">Configura un número de WhatsApp en "Respaldo y configuración" para que el cierre se envíe al cerrar la caja.</span>') +
        (usuario.rol === 'ADMINISTRADOR' ? '<a class="boton boton-texto" href="#/reportes?turno=' + c.id + '">Ver reporte completo</a>' : '') +
        '</div></div>';
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

    var btnReabrir = U.$('#btn-reabrir', cont);
    if (btnReabrir) {
      btnReabrir.addEventListener('click', function () {
        var t = POS.Turnos.ultimoCerrado();
        U.confirmar('¿Reabrir el turno #' + t.id + '? Se deshace el cierre y su arqueo, y podrás seguir vendiendo en ese turno.', function () {
          POS.Turnos.reabrir(t.id);
          ultimoCierre = null;
          U.aviso('Turno #' + t.id + ' reabierto', 'ok');
          render(cont, usuario);
        }, 'Reabrir turno');
      });
    }

    var fCerrar = U.$('#form-cerrar', cont);
    if (fCerrar) {
      fCerrar.addEventListener('submit', function (e) {
        e.preventDefault();
        var valor = fCerrar.efectivo.value;
        U.confirmar('¿Cerrar el turno #' + turno.id + ' con ' + U.dinero(valor) + ' contados? Después no podrás registrar ventas en este turno.', function () {
          ultimoCierre = POS.Turnos.cerrar(turno.id, valor);
          ultimoCierreUsuarioId = usuario.id;
          U.aviso('Turno #' + turno.id + ' cerrado', 'ok');
          // Abre WhatsApp con el número configurado y el resumen escrito (falta tocar "Enviar").
          // Si el navegador bloquea la ventana, queda el botón en el resumen.
          var numero = DB.config().whatsapp;
          if (numero) {
            var ventana = null;
            try { ventana = window.open(POS.Reportes.urlWhatsApp(POS.Reportes.construir(turno.id)), '_blank'); } catch (err) { ventana = null; }
            if (!ventana) U.aviso('Toca "Enviar resumen por WhatsApp" para mandar el cierre.', 'alerta', 6000);
          }
          render(cont, usuario);
        }, 'Cerrar turno');
      });
    }
  }

  App.registrar('turno', { titulo: 'Turno de caja', icono: 'reloj', render: render });
})();
