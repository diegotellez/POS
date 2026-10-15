/* Configuración del negocio y respaldo/restauración de datos (solo administrador). */
(function () {
  'use strict';

  var LIMITE_APROX = 5 * 1024 * 1024; // la mayoría de navegadores permite ~5 MB por sitio

  function kb(bytes) {
    return (bytes / 1024).toFixed(0) + ' KB';
  }

  function seccionCajon(cfg) {
    var modo = cfg.cajonModo || 'ninguno';
    function op(v, t) { return '<option value="' + v + '"' + (modo === v ? ' selected' : '') + '>' + t + '</option>'; }
    return '<section class="tarjeta">' +
      '<h2>' + U.icono('caja') + ' Cajón monedero</h2>' +
      '<p class="tenue pequeno">El cajón va conectado a la impresora de tickets y se abre solo al cobrar en efectivo (ventas, cambios con excedente y gastos en efectivo).</p>' +
      '<form id="form-cajon">' +
      '<label class="campo"><span>Cómo se abre</span><select name="cajonModo">' +
      op('ninguno', 'No abrir automáticamente') +
      op('impresion', 'Al imprimir: el ticket se imprime solo y la impresora abre el cajón') +
      op('serial', 'Directo: orden ESC/POS por USB/serial (Chrome o Edge)') +
      '</select></label>' +
      '<div class="cajon-impresion tenue pequeno">En Windows: <b>Panel de control &gt; Dispositivos e impresoras</b>, clic derecho en la impresora de tickets &gt; ' +
      '<b>Preferencias de impresión</b> y active <b>Abrir cajón</b> (Cash drawer / Open drawer) antes o después de imprimir. ' +
      'Para que el ticket salga sin la ventana de impresión, abra el POS en Chrome con la opción <code>--kiosk-printing</code> (ver el manual de instalación).</div>' +
      '<div class="cajon-serial">' +
      '<div class="fila-doble">' +
      '<label class="campo"><span>Velocidad (baudios)</span><select name="cajonBaudios">' +
      [9600, 19200, 38400, 115200].map(function (b) { return '<option' + (Number(cfg.cajonBaudios) === b ? ' selected' : '') + '>' + b + '</option>'; }).join('') + '</select></label>' +
      '<label class="campo"><span>Pin del cajón</span><select name="cajonPin"><option value="0"' + (cfg.cajonPin !== 1 ? ' selected' : '') + '>Pin 2 (lo normal)</option><option value="1"' + (cfg.cajonPin === 1 ? ' selected' : '') + '>Pin 5</option></select></label>' +
      '</div>' +
      '<p class="tenue pequeno" id="estado-serial"></p>' +
      '<button type="button" class="boton boton-secundario" id="btn-conectar-cajon">Conectar impresora</button> ' +
      '</div>' +
      '<div class="acciones-reporte">' +
      '<button class="boton boton-primario" type="submit">Guardar</button>' +
      '<button type="button" class="boton boton-secundario" id="btn-probar-cajon">Probar apertura</button>' +
      '</div>' +
      '</form></section>';
  }

  function activarCajon(cont, cfg) {
    var f = U.$('#form-cajon', cont);
    function mostrar() {
      U.$('.cajon-impresion', f).style.display = f.cajonModo.value === 'impresion' ? '' : 'none';
      U.$('.cajon-serial', f).style.display = f.cajonModo.value === 'serial' ? '' : 'none';
      var estado = U.$('#estado-serial', f);
      if (!Cajon.serialDisponible()) {
        estado.innerHTML = '<span class="alerta">Este navegador no permite la conexión directa. Use Chrome o Edge en el PC (dentro del artefacto no funciona).</span>';
      } else {
        Cajon.conectado().then(function (ok) {
          estado.innerHTML = ok ? '<span class="ok">Impresora autorizada.</span>' : 'Aún no hay impresora autorizada: pulse "Conectar impresora" y elíjala de la lista.';
        });
      }
    }
    f.cajonModo.addEventListener('change', mostrar);
    mostrar();
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      try {
        POS.Config.guardar(Object.assign(POS.Config.obtener(), U.leerForm(f)));
        U.aviso('Cajón configurado', 'ok');
        App.renderizar();
      } catch (err) { U.error(err); }
    });
    U.$('#btn-conectar-cajon', f).addEventListener('click', function () {
      Cajon.conectar().then(function () { U.aviso('Impresora autorizada', 'ok'); mostrar(); }, function (err) {
        if (err && err.name === 'NotFoundError') return; // canceló la selección
        U.aviso(err.message, 'error', 6000);
      });
    });
    U.$('#btn-probar-cajon', f).addEventListener('click', function () {
      var modo = f.cajonModo.value;
      if (modo === 'serial') {
        Cajon.abrir().then(function () { U.aviso('Orden de apertura enviada', 'ok'); }, function (err) { U.aviso(err.message, 'error', 6000); });
      } else if (modo === 'impresion') {
        U.imprimirHTML('<!doctype html><meta charset="utf-8"><style>body{font:12px monospace;margin:0;padding:4px}</style><div>Prueba de cajón · ' + U.esc(U.ahora()) + '</div>', 300);
      } else {
        U.aviso('Elija un modo de apertura primero', 'alerta');
      }
    });
  }

  function seccionEmpleados() {
    var lista = POS.Empleados.listar();
    return '<section class="tarjeta">' +
      '<h2>' + U.icono('usuarios') + ' Empleados y sueldo semanal</h2>' +
      '<p class="tenue pequeno">Se usan en Turno de caja &gt; Gastos &gt; Sueldos para registrar adelantos y el pago de la semana (lunes a domingo).</p>' +
      '<div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Nombre</th><th class="num">Sueldo semanal</th><th>Activo</th><th></th></tr></thead><tbody>' +
      (lista.length ? lista.map(function (e) {
        return '<tr data-emp="' + e.id + '"><td><input name="nombre" value="' + U.esc(e.nombre) + '"></td>' +
          '<td class="num"><input name="sueldo" type="number" min="0" step="any" value="' + e.sueldo_semanal + '"></td>' +
          '<td><input type="checkbox" name="activo"' + (e.activo ? ' checked' : '') + ' aria-label="Activo"></td>' +
          '<td><button type="button" class="boton boton-texto" data-guardar-emp="' + e.id + '">Guardar</button></td></tr>';
      }).join('') : '<tr><td colspan="4" class="tenue vacio">Aún no hay empleados.</td></tr>') +
      '</tbody></table></div>' +
      '<form id="form-empleado" class="form-linea">' +
      '<label class="campo"><span>Nombre</span><input name="nombre" required placeholder="Ej. Laura Gómez"></label>' +
      '<label class="campo"><span>Sueldo semanal</span><input name="sueldoSemanal" type="number" min="0" step="any" required></label>' +
      '<button class="boton boton-primario" type="submit">' + U.icono('mas') + ' Agregar</button>' +
      '</form></section>';
  }

  function activarEmpleados(cont) {
    var f = U.$('#form-empleado', cont);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      try {
        var emp = POS.Empleados.guardar(U.leerForm(f));
        U.aviso('Empleado ' + emp.nombre + ' agregado', 'ok');
        App.renderizar();
      } catch (err) { U.error(err); }
    });
    U.$$('[data-guardar-emp]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var fila = b.closest('tr');
        try {
          POS.Empleados.guardar({
            id: Number(b.getAttribute('data-guardar-emp')),
            nombre: U.$('[name=nombre]', fila).value,
            sueldoSemanal: U.$('[name=sueldo]', fila).value,
            activo: U.$('[name=activo]', fila).checked
          });
          U.aviso('Empleado actualizado', 'ok');
          App.renderizar();
        } catch (err) { U.error(err); }
      });
    });
  }

  function render(cont) {
    var cfg = POS.Config.obtener();
    var tam = DB.tamano();
    var pct = Math.min(100, Math.round((tam / LIMITE_APROX) * 100));

    cont.innerHTML =
      '<div class="dos-columnas">' +
      '<section class="tarjeta">' +
      '<h2>' + U.icono('ajustes') + ' Configuración</h2>' +
      '<form id="form-config">' +
      '<label class="campo"><span>Nombre del negocio</span><input name="nombreNegocio" value="' + U.esc(cfg.nombreNegocio) + '"></label>' +
      '<div class="fila-doble">' +
      '<label class="campo"><span>NIT / RUT</span><input name="nit" value="' + U.esc(cfg.nit) + '"></label>' +
      '<label class="campo"><span>Dirección</span><input name="direccion" value="' + U.esc(cfg.direccion) + '"></label>' +
      '</div>' +
      '<div class="fila-doble">' +
      '<label class="campo"><span>Símbolo de moneda</span><input name="moneda" value="' + U.esc(cfg.moneda) + '" maxlength="4"></label>' +
      '<label class="campo"><span>Decimales</span><select name="decimales">' +
      '<option value="2"' + (cfg.decimales !== 0 ? ' selected' : '') + '>2 (1,234.50)</option>' +
      '<option value="0"' + (cfg.decimales === 0 ? ' selected' : '') + '>0 (1.235)</option>' +
      '</select></label>' +
      '</div>' +
      '<div class="fila-doble">' +
      '<label class="campo"><span>Ancho del ticket</span><select name="anchoTicket">' +
      '<option value="80"' + (cfg.anchoTicket !== 58 ? ' selected' : '') + '>80 mm</option>' +
      '<option value="58"' + (cfg.anchoTicket === 58 ? ' selected' : '') + '>58 mm</option>' +
      '</select></label>' +
      '<label class="campo"><span>WhatsApp para reportes</span><input name="whatsapp" value="' + U.esc(cfg.whatsapp) + '" placeholder="Ej. 573001234567"></label>' +
      '</div>' +
      '<label class="campo"><span>Enlace de la app para ver cierres</span><input name="urlApp" value="' + U.esc(cfg.urlApp) + '" placeholder="https://..."></label>' +
      '<p class="tenue pequeno">Va al final del mensaje de cierre. Quien lo abra ve el detalle de ese cierre sin iniciar sesión; deja vacío para no incluir enlace.</p>' +
      '<label class="campo"><span>Mensaje al pie del ticket</span><input name="mensajeTicket" value="' + U.esc(cfg.mensajeTicket) + '"></label>' +
      '<button class="boton boton-primario" type="submit">Guardar configuración</button>' +
      '</form>' +
      '</section>' +

      '<section class="tarjeta">' +
      '<h2>' + U.icono('respaldo') + ' Respaldo de datos</h2>' +
      '<p class="tenue">Los datos se guardan <strong>en este navegador, en este equipo</strong>. Si se borran los datos del navegador se pierden, así que descarga un respaldo con frecuencia (por ejemplo al cerrar cada turno) y guárdalo en una USB o en una carpeta sincronizada con Google Drive.</p>' +
      '<div class="uso"><div class="uso-barra"><span style="width:' + pct + '%"></span></div>' +
      '<small class="tenue">Espacio usado: ' + kb(tam) + ' de ~' + kb(LIMITE_APROX) + ' (' + pct + '%)</small></div>' +
      '<p class="tenue pequeno">Versión del sistema: ' + App.version + '</p>' +
      '<p class="tenue pequeno">Si la descarga no arranca, usa "Copiar respaldo" y pega el texto en un archivo .json.</p>' +
      (!DB.persistente ? '<p class="alerta">Este navegador no permite guardar datos (¿modo privado?). Descarga un respaldo antes de cerrar.</p>' : '') +
      '<div class="acciones-reporte">' +
      '<button class="boton boton-primario" id="btn-exportar">' + U.icono('descargar') + ' Descargar respaldo</button>' +
      '<button class="boton boton-secundario" id="btn-copiar">' + U.icono('respaldo') + ' Copiar respaldo</button>' +
      '<label class="boton boton-secundario">' + U.icono('subir') + ' Restaurar respaldo<input type="file" id="archivo" accept=".json,application/json" hidden></label>' +
      '</div>' +
      '<h3>Zona de peligro</h3>' +
      '<p class="tenue">Borra todos los datos de este navegador y vuelve a los datos de ejemplo.</p>' +
      '<button class="boton boton-secundario boton-peligro" id="btn-reiniciar">Borrar todos los datos</button>' +
      '</section>' +
      '</div>' +
      '<div class="dos-columnas">' + seccionCajon(cfg) + seccionEmpleados() + '</div>';

    activarCajon(cont, cfg);
    activarEmpleados(cont);

    var form = U.$('#form-config', cont);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      try {
        POS.Config.guardar(U.leerForm(form));
        U.aviso('Configuración guardada', 'ok');
        App.renderizar();
      } catch (err) {
        U.error(err);
      }
    });

    U.$('#btn-exportar', cont).addEventListener('click', function () {
      U.descargar('pos-respaldo-' + U.marcaArchivo() + '.json', DB.exportar(), 'application/json');
    });

    U.$('#btn-copiar', cont).addEventListener('click', function () {
      U.copiar(DB.exportar(), 'respaldo');
    });

    U.$('#archivo', cont).addEventListener('change', function (e) {
      var archivo = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!archivo) return;
      var lector = new FileReader();
      lector.onload = function () {
        U.confirmar('Se reemplazarán TODOS los datos actuales por los del archivo "' + archivo.name + '". ¿Continuar?', function () {
          try {
            DB.importar(String(lector.result));
            U.aviso('Respaldo restaurado', 'ok');
            App.renderizar();
          } catch (err) {
            U.aviso('No se pudo restaurar: ' + err.message, 'error', 6000);
          }
        }, 'Restaurar');
      };
      lector.onerror = function () {
        U.aviso('No se pudo leer el archivo', 'error');
      };
      lector.readAsText(archivo);
    });

    U.$('#btn-reiniciar', cont).addEventListener('click', function () {
      U.modal({
        titulo: 'Borrar todos los datos',
        cuerpo: '<p>Esta acción no se puede deshacer. Escribe <strong>BORRAR</strong> para confirmar.</p>' +
          '<label class="campo"><span>Confirmación</span><input name="confirmacion" autocomplete="off"></label>',
        botones: [
          { texto: 'Cancelar', clase: 'boton-secundario' },
          {
            texto: 'Borrar todo',
            clase: 'boton-primario boton-peligro-lleno',
            accion: function (cerrar, raiz) {
              if (U.$('[name=confirmacion]', raiz).value.trim().toUpperCase() !== 'BORRAR') {
                throw new Error('Escribe BORRAR para confirmar');
              }
              DB.reiniciar();
              POS.Auth.logout();
              POS.sembrar();
              cerrar();
              App.renderizar();
            }
          }
        ]
      });
    });
  }

  App.registrar('respaldo', { titulo: 'Respaldo y configuración', icono: 'respaldo', soloAdmin: true, render: render });
})();
