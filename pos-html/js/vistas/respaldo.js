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
      op('ayudante', 'Ayudante de Windows (recomendado: cajón conectado a la impresora)') +
      op('serial', 'Directo: orden ESC/POS por USB/serial (Chrome o Edge)') +
      '</select></label>' +
      '<div class="cajon-impresion tenue pequeno">En Windows: <b>Panel de control &gt; Dispositivos e impresoras</b>, clic derecho en la impresora de tickets &gt; ' +
      '<b>Preferencias de impresión</b> y active <b>Abrir cajón</b> (Cash drawer / Open drawer) antes o después de imprimir. ' +
      'Para que el ticket salga sin la ventana de impresión, abra el POS en Chrome con la opción <code>--kiosk-printing</code> (ver el manual de instalación).</div>' +
      '<div class="cajon-ayudante tenue pequeno">Para el cajón conectado a la impresora (cable RJ11 en el puerto DK de la impresora). ' +
      'Se instala una vez en el PC de la caja: descargue el <a href="ayudante-cajon.zip" download>ayudante del cajón</a>, descomprímalo en ' +
      '<code>C:\\POS\\ayudante-cajon</code> y ejecute <b>instalar.bat</b> (el cajón se abre en la prueba). Luego pulse Guardar y Probar apertura: ' +
      'Chrome preguntará si permite abrir "Abrir cajón POS"; marque <b>Permitir siempre</b>. No imprime nada y no depende del controlador de la impresora.</div>' +
      '<div class="cajon-serial">' +
      '<div class="fila-doble">' +
      '<label class="campo solo-serial"><span>Velocidad (baudios)</span><select name="cajonBaudios">' +
      [9600, 19200, 38400, 115200].map(function (b) { return '<option' + (Number(cfg.cajonBaudios) === b ? ' selected' : '') + '>' + b + '</option>'; }).join('') + '</select></label>' +
      '<label class="campo"><span>Pin del cajón</span><select name="cajonPin"><option value="0"' + (cfg.cajonPin !== 1 ? ' selected' : '') + '>Pin 2 (lo normal)</option><option value="1"' + (cfg.cajonPin === 1 ? ' selected' : '') + '>Pin 5</option></select></label>' +
      '</div>' +
      '<p class="tenue pequeno solo-serial" id="estado-serial"></p>' +
      '<button type="button" class="boton boton-secundario solo-serial" id="btn-conectar-cajon">Conectar impresora</button> ' +
      '</div>' +
      '<div class="acciones-reporte">' +
      '<button class="boton boton-primario" type="submit">Guardar</button>' +
      '<button type="button" class="boton boton-secundario" id="btn-probar-cajon">Probar apertura</button>' +
      '<button type="button" class="boton boton-secundario" id="btn-ticket-prueba">Imprimir ticket de prueba</button>' +
      '</div>' +
      '</form></section>';
  }

  function activarCajon(cont, cfg) {
    var f = U.$('#form-cajon', cont);
    function mostrar() {
      U.$('.cajon-impresion', f).style.display = f.cajonModo.value === 'impresion' ? '' : 'none';
      // El pin sirve para los modos directo y ayudante; velocidad y conexión, solo para el directo.
      U.$('.cajon-serial', f).style.display = f.cajonModo.value === 'serial' || f.cajonModo.value === 'ayudante' ? '' : 'none';
      U.$$('.solo-serial', f).forEach(function (el) { el.style.display = f.cajonModo.value === 'serial' ? '' : 'none'; });
      U.$('.cajon-ayudante', f).style.display = f.cajonModo.value === 'ayudante' ? '' : 'none';
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
    U.$('#btn-ticket-prueba', f).addEventListener('click', function () {
      U.imprimirHTML(POS.Documentos.pruebaHTML(), 300);
    });
    U.$('#btn-probar-cajon', f).addEventListener('click', function () {
      var modo = f.cajonModo.value;
      if (modo === 'ayudante') {
        Cajon.enviarAyudante();
        U.aviso('Orden enviada al ayudante. Si Chrome pregunta, marque "Permitir siempre" y pulse Abrir. Si no abre, revise registro.txt en la carpeta del ayudante.', 'ok', 8000);
      } else if (modo === 'serial') {
        Cajon.abrir().then(function () { U.aviso('Orden de apertura enviada', 'ok'); }, function (err) { U.aviso(err.message, 'error', 6000); });
      } else if (modo === 'impresion') {
        U.imprimirHTML('<!doctype html><meta charset="utf-8"><style>body{font:12px monospace;margin:0;padding:4px}</style><div>Prueba de cajón · ' + U.esc(U.ahora()) + '</div>', 300);
      } else {
        U.aviso('Elija un modo de apertura primero', 'alerta');
      }
    });
  }

  function seccionSoporte() {
    var c = Soporte.contacto();
    return '<section class="tarjeta"><h2>' + U.icono('chat') + ' Soporte y solicitudes</h2>' +
      '<p class="tenue pequeno">Reporte errores, pida mejoras o reportes nuevos al proveedor y vea cuándo quedan publicados. ' +
      'Los errores inesperados se registran y se avisan solos.' +
      (c.whatsapp || c.url || c.correo ? '' : ' <span class="alerta">Aún no hay contacto del proveedor configurado.</span>') + '</p>' +
      '<div class="acciones-reporte"><a class="boton boton-secundario" href="#/soporte">' + U.icono('chat') + ' Abrir Soporte</a></div></section>';
  }

  function seccionActualizaciones(cfg) {
    var estado = Actualizaciones.estado();
    var html = '<section class="tarjeta actualizaciones"><h2>' + U.icono('descargar') + ' Actualizaciones automáticas</h2>';
    if (estado === 'archivo') {
      html += '<p>Esta copia se abrió desde <b>una carpeta del equipo</b>: funciona, pero <b>no se actualiza sola</b>.</p>' +
        '<p class="tenue pequeno">La versión en línea queda guardada en el equipo (funciona sin internet) y recibe las versiones nuevas automáticamente. ' +
        'El botón abre la versión en línea y le pasa los datos de este equipo (productos, ventas, usuarios, configuración); allí confirma.</p>' +
        '<div class="acciones-reporte"><button type="button" class="boton boton-primario" id="btn-pasar-online">Pasar a la versión con actualizaciones</button></div>';
    } else if (estado === 'marco') {
      html += '<p class="tenue">Esta es una vista de demostración. Las actualizaciones automáticas funcionan abriendo el POS desde su dirección web.</p>';
    } else if (estado === 'sin-soporte') {
      html += '<p class="alerta">Este navegador no permite el modo sin internet ni las actualizaciones automáticas. Use Chrome o Edge.</p>';
    } else {
      html += '<p class="ok"><b>Activas.</b> Versión ' + U.esc(App.version) + '. El POS queda guardado en el equipo y funciona sin internet; ' +
        'cuando hay una versión nueva aparece un aviso para actualizar.</p>' +
        (Actualizaciones.instalada() ? '<p class="tenue pequeno">Instalado como aplicación en este equipo.</p>' : '') +
        '<div class="acciones-reporte"><button type="button" class="boton boton-secundario" id="btn-buscar-act">Buscar actualizaciones ahora</button>' +
        (Actualizaciones.instalable() && !Actualizaciones.instalada() ? '<button type="button" class="boton boton-primario" id="btn-instalar-app">' + U.icono('descargar') + ' Instalar como aplicación</button>' : '') +
        '</div>';
    }
    html += '<details class="ajuste-base"><summary class="tenue pequeno">Dirección de la versión en línea</summary>' +
      '<form id="form-url-act" class="form-linea"><label class="campo"><span>Dirección</span><input name="urlActualizaciones" value="' + U.esc(cfg.urlActualizaciones || '') + '"></label>' +
      '<button class="boton boton-secundario" type="submit">Guardar</button></form></details>';
    return html + '</section>';
  }

  function activarActualizaciones(cont) {
    var b = U.$('#btn-pasar-online', cont);
    if (b) b.addEventListener('click', function () { Actualizaciones.pasarAOnline(); });
    var bb = U.$('#btn-buscar-act', cont);
    if (bb) bb.addEventListener('click', function () {
      bb.disabled = true;
      Actualizaciones.buscar().then(function (hay) {
        U.aviso(hay ? 'Hay una versión nueva: use el aviso de arriba para actualizar.' : 'Ya tiene la última versión (' + App.version + ').', 'ok', 5000);
      }, function (err) { U.aviso(err.message, 'error', 6000); }).then(function () { bb.disabled = false; });
    });
    var bi = U.$('#btn-instalar-app', cont);
    if (bi) bi.addEventListener('click', function () {
      Actualizaciones.instalar().then(function (ok) { if (ok) U.aviso('POS instalado: ábralo desde el ícono del escritorio.', 'ok', 6000); App.renderizar(); });
    });
    var f = U.$('#form-url-act', cont);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      try {
        POS.Config.guardar(Object.assign(POS.Config.obtener(), { urlActualizaciones: f.urlActualizaciones.value }));
        U.aviso('Dirección guardada', 'ok');
      } catch (err) { U.error(err); }
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
      '<div class="fila-doble">' +
      '<label class="campo"><span>Ancho que imprime la térmica (mm)</span><input name="ticketAnchoUtil" type="number" min="30" max="80" step="1" value="' + (cfg.ticketAnchoUtil || '') + '" placeholder="Automático: 48 (58 mm) o 72 (80 mm)"></label>' +
      '<label class="campo"><span>Margen izquierdo del ticket (mm)</span><input name="ticketMargenIzq" type="number" min="0" max="10" step="0.5" value="' + (cfg.ticketMargenIzq || 0) + '"></label>' +
      '</div>' +
      '<p class="tenue pequeno">Si el ticket sale cortado a la derecha, baje el ancho (por ejemplo 46); si queda corrido a la izquierda, suba el margen. Pruébelo con "Imprimir ticket de prueba" (Cajón monedero).</p>' +
      '<label class="check"><input type="checkbox" name="permitirVentaSinStock"' + (cfg.permitirVentaSinStock ? ' checked' : '') + '> Permitir vender productos sin stock (el stock queda negativo)</label>' +
      '<p class="tenue pequeno">Desmarcado (recomendado): no se puede vender ni entregar en un cambio más de lo que hay en inventario.</p>' +
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
      '<div class="peligro-opcion"><div><b>Iniciar la fase productiva</b><p class="tenue pequeno">Borra las compras, ventas, cambios, turnos, gastos y movimientos de prueba. ' +
      'Conserva productos, precios, categorías, usuarios, configuración, proveedores y empleados. La numeración vuelve a empezar en 1.' +
      (cfg.inicioProduccion ? ' <br>Fase productiva iniciada el ' + U.esc(cfg.inicioProduccion) + '.' : '') + '</p></div>' +
      '<button class="boton boton-secundario boton-peligro" id="btn-produccion">Borrar datos de prueba</button></div>' +
      '<div class="peligro-opcion"><div><b>Borrar todos los datos</b><p class="tenue pequeno">Borra todo lo de este navegador y vuelve a los datos de ejemplo.</p></div>' +
      '<button class="boton boton-secundario boton-peligro" id="btn-reiniciar">Borrar todos los datos</button></div>' +
      '</section>' +
      '</div>' +
      '<div class="dos-columnas">' + seccionCajon(cfg) + seccionEmpleados() + '</div>' +
      seccionActualizaciones(cfg) +
      seccionSoporte();

    activarActualizaciones(cont);

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

    U.$('#btn-produccion', cont).addEventListener('click', function () {
      var r = POS.Mantenimiento.resumenPrueba();
      U.modal({
        titulo: 'Iniciar la fase productiva',
        cuerpo: '<p>Se borrarán de forma definitiva: <strong>' + r.compras + ' compras</strong>, <strong>' + r.ventas + ' ventas</strong>, ' + r.cambios + ' cambios, ' +
          r.turnos + ' turnos de caja, ' + r.gastos + ' gastos, el historial de inventario y la auditoría de prueba.</p>' +
          '<p class="tenue pequeno">Se conservan los productos con sus precios de compra y venta, categorías, usuarios y contraseñas, configuración, proveedores y empleados.</p>' +
          '<p><button type="button" class="boton boton-secundario" id="btn-respaldo-antes">' + U.icono('descargar') + ' Descargar respaldo antes</button></p>' +
          '<fieldset class="opciones-produccion"><legend>Stock de los productos (' + r.productosConStock + ' tienen stock)</legend>' +
          '<label class="check"><input type="radio" name="stock" value="cero" checked> Dejar todo en 0 y registrar después el inventario real (recomendado)</label>' +
          '<label class="check"><input type="radio" name="stock" value="conservar"> Conservar el stock actual (ya es el conteo real)</label></fieldset>' +
          '<label class="check"><input type="checkbox" name="borrarCodigos"> Borrar también los códigos de proveedor aprendidos (si se asociaron mal en las pruebas)</label>' +
          '<label class="campo"><span>Escriba <strong>INICIAR</strong> para confirmar</span><input name="confirmacion" autocomplete="off"></label>',
        alAbrir: function (raiz) {
          U.$('#btn-respaldo-antes', raiz).addEventListener('click', function () {
            U.descargar('pos-respaldo-antes-de-produccion-' + U.marcaArchivo() + '.json', DB.exportar(), 'application/json');
          });
        },
        botones: [
          { texto: 'Cancelar', clase: 'boton-secundario' },
          {
            texto: 'Borrar datos de prueba',
            clase: 'boton-primario boton-peligro-lleno',
            accion: function (cerrar, raiz) {
              if (U.$('[name=confirmacion]', raiz).value.trim().toUpperCase() !== 'INICIAR') throw new Error('Escriba INICIAR para confirmar');
              POS.Mantenimiento.iniciarProduccion({
                stockEnCero: U.$('[name=stock]:checked', raiz).value === 'cero',
                borrarCodigosProveedor: U.$('[name=borrarCodigos]', raiz).checked
              });
              // Lo que está a medio hacer en este navegador (ticket, factura en borrador, facturas por cargar).
              ['pos_html_carrito', 'pos_html_borrador_compra', 'pos_html_cola_facturas'].forEach(function (k) {
                try { window.localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ }
              });
              cerrar();
              // Se recarga para que el ticket o la factura que estaban en pantalla no vuelvan a guardarse.
              try { window.sessionStorage.setItem('pos_aviso_al_cargar', 'Fase productiva iniciada. Abra el primer turno de caja con la base real.'); } catch (e) { /* sin almacenamiento */ }
              App.ir('turno');
              window.location.reload();
            }
          }
        ]
      });
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
