/* Apertura y cierre (arqueo) del turno de caja. */
(function () {
  'use strict';

  // Resumen del último cierre hecho en esta pestaña; solo lo ve quien cerró.
  var ultimoCierre = null;
  var ultimoCierreUsuarioId = null;

  // Semana de sueldos elegida en el formulario (lunes YYYY-MM-DD).
  var semanaSueldo = null;

  function opcionesSemana(actual) {
    var hoy = POS.Gastos.lunesDe();
    var p = hoy.split('-');
    var base = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    var html = '';
    for (var i = 0; i < 3; i++) {
      var d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - 7 * i);
      var l = POS.Gastos.lunesDe(d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate());
      html += '<option value="' + l + '"' + (l === actual ? ' selected' : '') + '>' + (i === 0 ? 'Esta semana' : i === 1 ? 'Semana pasada' : 'Hace 2 semanas') +
        ' (' + POS.Gastos.nombreSemana(l) + ')</option>';
    }
    return html;
  }

  function formularioGasto() {
    var empleados = POS.Empleados.listar({ soloActivos: true });
    return '<form id="form-gasto" class="form-gasto">' +
      '<label class="campo"><span>Tipo</span><select name="tipo">' + POS.Gastos.TIPOS.map(function (t) { return '<option>' + U.esc(t) + '</option>'; }).join('') + '</select></label>' +
      '<label class="campo"><span>Valor</span><input name="monto" type="number" min="0" step="any" required inputmode="numeric"></label>' +
      '<label class="campo"><span>Pagado con</span><select name="metodoPago">' + POS.Ventas.METODOS_PAGO.map(function (m) { return '<option value="' + m + '">' + POS.Ventas.nombreMetodo(m) + '</option>'; }).join('') + '</select></label>' +
      '<button class="boton boton-primario" type="submit">' + U.icono('mas') + ' Registrar</button>' +
      '<label class="campo g-ancho g-normal"><span>Concepto</span><input name="concepto" placeholder="Ej. Pedido Droguería Andina factura 4581"></label>' +
      (empleados.length
        ? '<label class="campo g-doble g-sueldo"><span>Empleado</span><select name="empleadoId">' +
            empleados.map(function (e) { return '<option value="' + e.id + '">' + U.esc(e.nombre) + ' · ' + U.dinero(e.sueldo_semanal) + '/semana</option>'; }).join('') + '</select></label>' +
          '<label class="campo g-sueldo"><span>Es</span><select name="claseSueldo"><option value="ADELANTO">Adelanto</option><option value="PAGO_SEMANA">Pago de la semana</option></select></label>' +
          '<label class="campo g-sueldo"><span>Semana</span><select name="semana">' + opcionesSemana(semanaSueldo || POS.Gastos.lunesDe()) + '</select></label>' +
          '<div class="g-ancho g-sueldo info-sueldo" id="info-sueldo"></div>' +
          '<label class="campo g-ancho g-sueldo"><span>Nota (opcional)</span><input name="notaSueldo" placeholder="Ej. adelanto para transporte"></label>'
        : '<p class="g-ancho g-sueldo aviso-inline">No hay empleados registrados. Un administrador los agrega, con su sueldo semanal, en Respaldo y configuración &gt; Empleados.</p>') +
      '</form>';
  }

  function panelSueldos() {
    var lunes = semanaSueldo || POS.Gastos.lunesDe();
    var filas = POS.Gastos.sueldosSemana(lunes);
    if (!filas.length) return '';
    return '<div class="sueldos-semana"><h3>Sueldos · semana del ' + U.esc(POS.Gastos.nombreSemana(lunes)) + '</h3>' +
      '<div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Empleado</th><th class="num">Sueldo</th><th class="num">Adelantos</th><th class="num">Pagado</th><th class="num">Pendiente</th></tr></thead><tbody>' +
      filas.map(function (f) {
        return '<tr><td>' + U.esc(f.nombre) + '</td><td class="num">' + U.dinero(f.sueldo_semanal) + '</td><td class="num">' + U.dinero(f.adelantos) + '</td>' +
          '<td class="num">' + U.dinero(f.pagado) + '</td><td class="num ' + (f.pendiente < 0 ? 'alerta' : f.pendiente === 0 ? 'ok' : '') + '"><strong>' + U.dinero(f.pendiente) + '</strong></td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  // Administrador: los turnos abiertos de los demás usuarios.
  function panelTurnosAbiertos(usuario, propio) {
    if (usuario.rol !== 'ADMINISTRADOR') return '';
    var otros = POS.Turnos.abiertos().filter(function (t) { return !propio || t.id !== propio.id; });
    if (!otros.length) return '';
    return '<div class="turnos-otros"><h3>Otros turnos abiertos</h3><div class="tabla-contenedor"><table class="tabla"><thead><tr>' +
      '<th>Turno</th><th>Usuario</th><th>Apertura</th><th class="num">Base</th><th class="num">Vendido</th><th class="num">Efectivo esperado</th><th></th></tr></thead><tbody>' +
      otros.map(function (t) {
        return '<tr><td>#' + t.id + '</td><td>' + U.esc(t.usuario_apertura) + '</td><td>' + U.esc(t.fecha_hora_apertura) + '</td>' +
          '<td class="num">' + U.dinero(t.base_inicial_efectivo) + '</td><td class="num">' + U.dinero(t.vendido) + ' <small class="tenue">(' + t.cantidadVentas + ')</small></td>' +
          '<td class="num">' + U.dinero(t.efectivoEsperado) + '</td>' +
          '<td class="acciones"><button type="button" class="boton boton-texto" data-cerrar-otro="' + t.id + '">Cerrar</button></td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  function render(cont, usuario) {
    if (ultimoCierre && ultimoCierreUsuarioId !== usuario.id) ultimoCierre = null;
    var turno = POS.Turnos.actual();
    var html = '<div class="angosto"><section class="tarjeta">';

    if (turno) {
      var esperado = POS.Turnos.efectivoEsperado(turno.id);
      var ventas = POS.Ventas.listar({ turnoId: turno.id, estado: 'COMPLETADA', limite: 100000 });
      var totalVendido = ventas.reduce(function (a, v) { return a + v.total; }, 0);
      var gastos = POS.Gastos.listar({ turnoId: turno.id });
      var gastosActivos = gastos.filter(function (g) { return g.estado !== 'ANULADO'; });
      var totalGastos = gastosActivos.reduce(function (a, g) { return a + g.monto; }, 0);
      var esAdmin = usuario.rol === 'ADMINISTRADOR';
      html +=
        '<h2>' + U.icono('abierto', 'ok') + ' Tu turno #' + turno.id + ' <small class="tenue">· ' + U.esc(usuario.nombreUsuario) + '</small></h2>' +
        '<div class="metricas">' +
        '<div class="metrica"><span>Apertura</span><strong>' + U.esc(turno.fecha_hora_apertura) + '</strong></div>' +
        '<div class="metrica"><span>Base inicial</span><strong>' + U.dinero(turno.base_inicial_efectivo) + '</strong></div>' +
        '<div class="metrica"><span>Vendido (' + ventas.filter(function (v) { return v.tipo !== 'CAMBIO'; }).length + ')</span><strong>' + U.dinero(totalVendido) + '</strong></div>' +
        '<div class="metrica"><span>Gastos y pedidos (' + gastosActivos.length + ')</span><strong>' + U.dinero(totalGastos) + '</strong></div>' +
        (usuario.rol === 'ADMINISTRADOR'
          ? '<div class="metrica"><span>Efectivo esperado</span><strong>' + U.dinero(esperado) + '</strong></div>'
          : '') +
        '</div>' +
        '<details class="ajuste-base"><summary class="tenue pequeno">¿La base quedó mal? Corregir la base inicial</summary>' +
        '<form id="form-base" class="fila-ajuste-base">' +
        '<label class="campo"><span>Base correcta</span><input name="base" type="number" min="0" step="any" value="' + turno.base_inicial_efectivo + '" required></label>' +
        '<label class="campo"><span>Motivo</span><input name="motivo" placeholder="Ej. se contó mal al abrir"></label>' +
        '<button class="boton boton-secundario" type="submit">Guardar base</button></form></details>' +

        '<div class="gastos-turno">' +
        '<h3>' + U.icono('caja') + ' Gastos y pedidos pagados en este turno</h3>' +
        '<p class="tenue pequeno">Registre lo que se paga con dinero de la caja: pedidos, servicios y sueldos. ' +
        'Lo pagado en efectivo se descuenta del efectivo esperado al cerrar.</p>' +
        formularioGasto() +
        (gastos.length
          ? '<div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Hora</th><th>Concepto</th><th>Tipo</th><th>Pago</th><th class="num">Valor</th><th></th></tr></thead><tbody>' +
            gastos.map(function (g) {
              var anulado = g.estado === 'ANULADO';
              return '<tr' + (anulado ? ' class="fila-anulada"' : '') + '><td>' + U.esc(g.fecha_hora.slice(11, 16)) + '</td>' +
                '<td>' + U.esc(g.concepto) + '<br><small class="tenue">' + U.esc(g.nombre_usuario) + '</small></td>' +
                '<td>' + U.esc(g.tipo) + '</td><td>' + U.esc(POS.Ventas.nombreMetodo(g.metodo_pago)) + '</td>' +
                '<td class="num">' + U.dinero(g.monto) + '</td>' +
                '<td class="acciones">' + (anulado
                  ? '<span class="etiqueta etiqueta-alerta" title="' + U.esc(g.motivo_anulacion) + '">ANULADO</span>'
                  : esAdmin ? '<button type="button" class="boton boton-texto boton-peligro" data-anular-gasto="' + g.id + '">Anular</button>' : '') +
                '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<p class="tenue pequeno">Aún no hay gastos en este turno.</p>') +
        '</div>' +
        panelSueldos() +
        '<h3>Cerrar turno (arqueo)</h3>' +
        '<p class="tenue">Cuenta el efectivo que hay en caja e ingrésalo. El sistema calcula la diferencia contra lo esperado.</p>' +
        '<form id="form-cerrar" class="form-linea">' +
        '<label class="campo"><span>Efectivo contado</span><input name="efectivo" type="number" min="0" step="any" required></label>' +
        '<button class="boton boton-primario" type="submit">' + U.icono('candado') + ' Cerrar turno</button>' +
        '</form>';
    } else {
      html +=
        '<h2>' + U.icono('candado') + ' Abrir turno de caja</h2>' +
        '<p class="tenue">No tienes un turno abierto, <b>' + U.esc(usuario.nombreUsuario) + '</b>. Cada usuario trabaja en su propio turno: registra tu base inicial de efectivo ' +
        '(el dinero con el que empiezas). Tus ventas, cambios y gastos quedan en tu turno y al final lo cierras con tu arqueo. La base se puede corregir después.</p>' +
        '<form id="form-abrir" class="form-linea">' +
        '<label class="campo"><span>Base inicial de efectivo</span><input name="base" type="number" min="0" step="any" value="0" required></label>' +
        '<button class="boton boton-primario" type="submit">' + U.icono('abierto') + ' Abrir turno</button>' +
        '</form>';
    }
    // Reabrir (administrador): el último turno de cada usuario, si lo cerró y no ha abierto otro.
    if (usuario.rol === 'ADMINISTRADOR') {
      var abiertosIds = POS.Turnos.abiertos().map(function (t) { return t.usuario_apertura_id; });
      var cerrados = POS.Turnos.ultimosCerrados().filter(function (t) { return abiertosIds.indexOf(t.usuario_apertura_id) === -1; });
      if (cerrados.length) {
        html += '<div class="bloque-reabrir"><h3>¿Se cerró un turno por error?</h3>' +
          '<p class="tenue">Puedes reabrir el último turno cerrado de cada usuario. Vuelve a quedar abierto con todas sus ventas y se borra el arqueo; queda registrado en Auditoría.</p>' +
          cerrados.map(function (c) {
            return '<p><button type="button" class="boton boton-secundario" data-reabrir="' + c.id + '">' + U.icono('historial') + ' Reabrir turno #' + c.id + ' de ' + U.esc(c.usuario_apertura) + '</button> ' +
              '<small class="tenue">cerrado el ' + U.esc(c.fecha_hora_cierre) + '</small></p>';
          }).join('') + '</div>';
      }
    }

    html += panelTurnosAbiertos(usuario, turno);

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
        '<p>Total vendido: <strong>' + U.dinero(reporte.totalVentas) + '</strong> en ' + reporte.cantidadVentas + ' venta(s)' +
        (reporte.gastos.cantidad ? '<br>Gastos y pedidos pagados: ' + U.dinero(reporte.gastos.total) + ' (en efectivo ' + U.dinero(reporte.gastos.efectivo) + ')' : '') + '</p>' +
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

    U.$$('[data-reabrir]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = Number(b.getAttribute('data-reabrir'));
        U.confirmar('¿Reabrir el turno #' + id + '? Se deshace el cierre y su arqueo, y su dueño podrá seguir vendiendo en ese turno.', function () {
          POS.Turnos.reabrir(id);
          ultimoCierre = null;
          U.aviso('Turno #' + id + ' reabierto', 'ok');
          render(cont, usuario);
        }, 'Reabrir turno');
      });
    });

    // Administrador: cerrar el turno de otro usuario (por ejemplo, si se fue sin cerrar).
    U.$$('[data-cerrar-otro]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = Number(b.getAttribute('data-cerrar-otro'));
        var t = POS.Turnos.abiertos().filter(function (x) { return x.id === id; })[0];
        U.modal({
          titulo: 'Cerrar el turno #' + id + ' de ' + t.usuario_apertura,
          cuerpo: '<p class="tenue">Efectivo esperado: <strong>' + U.dinero(t.efectivoEsperado) + '</strong>. Cuente el efectivo de ese turno e ingréselo.</p>' +
            '<label class="campo"><span>Efectivo contado</span><input name="efectivo" type="number" min="0" step="any"></label>',
          botones: [{ texto: 'Cancelar', clase: 'boton-secundario' }, { texto: 'Cerrar turno', clase: 'boton-primario', accion: function (cerrar, raiz) {
            var r = POS.Turnos.cerrar(id, U.$('[name=efectivo]', raiz).value);
            cerrar();
            U.aviso('Turno #' + id + ' cerrado. Diferencia: ' + U.dinero(r.diferencia_arqueo), 'ok', 6000);
            render(cont, usuario);
          } }]
        });
      });
    });

    var fBase = U.$('#form-base', cont);
    if (fBase) {
      fBase.addEventListener('submit', function (e) {
        e.preventDefault();
        try {
          var t = POS.Turnos.ajustarBase(turno.id, fBase.base.value, fBase.motivo.value);
          U.aviso('Base del turno #' + t.id + ' corregida a ' + U.dinero(t.base_inicial_efectivo), 'ok');
          render(cont, usuario);
        } catch (err) { U.error(err); }
      });
    }

    var fGasto = U.$('#form-gasto', cont);
    if (fGasto) {
      // Sueldos: muestra cuánto lleva pagado el empleado en la semana y sugiere el saldo.
      var infoSueldo = function () {
        var esSueldo = fGasto.tipo.value === 'Sueldos';
        fGasto.classList.toggle('es-sueldo', esSueldo);
        fGasto.concepto.required = !esSueldo;
        var caja = U.$('#info-sueldo', fGasto);
        if (!esSueldo || !caja) return;
        semanaSueldo = fGasto.semana.value;
        var f = POS.Gastos.sueldosSemana(semanaSueldo).filter(function (x) { return x.empleado_id === Number(fGasto.empleadoId.value); })[0];
        if (!f) { caja.innerHTML = ''; return; }
        caja.innerHTML = 'Sueldo semanal <strong>' + U.dinero(f.sueldo_semanal) + '</strong> · adelantos ' + U.dinero(f.adelantos) +
          ' · pagado ' + U.dinero(f.pagado) + ' · <span class="' + (f.pendiente <= 0 ? 'alerta' : 'ok') + '">pendiente <strong>' + U.dinero(f.pendiente) + '</strong></span>';
        if (fGasto.claseSueldo.value === 'PAGO_SEMANA' && f.pendiente > 0) fGasto.monto.value = f.pendiente;
      };
      ['tipo', 'empleadoId', 'claseSueldo', 'semana'].forEach(function (n) {
        if (fGasto[n]) fGasto[n].addEventListener('change', infoSueldo);
      });
      infoSueldo();
      fGasto.addEventListener('submit', function (e) {
        e.preventDefault();
        try {
          var datos = U.leerForm(fGasto);
          if (datos.tipo === 'Sueldos') {
            datos.concepto = datos.notaSueldo;
            var f = POS.Gastos.sueldosSemana(datos.semana).filter(function (x) { return x.empleado_id === Number(datos.empleadoId); })[0];
            if (f && Number(datos.monto) > f.pendiente + 0.01 &&
                !window.confirm('Con este pago ' + f.nombre + ' recibiría más que su sueldo semanal (pendiente: ' + U.dinero(f.pendiente) + '). ¿Registrar de todas formas?')) {
              return;
            }
          }
          var g = POS.Gastos.registrar(datos);
          U.aviso('Gasto registrado: ' + g.concepto + ' ' + U.dinero(g.monto), 'ok');
          if (g.metodo_pago === 'EFECTIVO') {
            Cajon.porEfectivo(function () {
              U.imprimirHTML(POS.Documentos.egresoHTML(g), 380);
            });
          }
          render(cont, usuario);
          var c = U.$('#form-gasto [name=monto]', cont);
          if (c) c.focus();
        } catch (err) { U.error(err); }
      });
    }
    U.$$('[data-anular-gasto]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = Number(b.getAttribute('data-anular-gasto'));
        U.modal({
          titulo: 'Anular gasto',
          cuerpo: '<label class="campo"><span>Motivo</span><input name="motivo" placeholder="Ej. se registró dos veces"></label>',
          botones: [
            { texto: 'Cancelar', clase: 'boton-secundario' },
            { texto: 'Anular gasto', clase: 'boton-primario boton-peligro-lleno', accion: function (cerrar, raiz) {
              POS.Gastos.anular(id, U.$('[name=motivo]', raiz).value);
              cerrar();
              U.aviso('Gasto anulado', 'ok');
              render(cont, usuario);
            } }
          ]
        });
      });
    });

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
