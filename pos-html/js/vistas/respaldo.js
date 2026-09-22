/* Configuración del negocio y respaldo/restauración de datos (solo administrador). */
(function () {
  'use strict';

  var LIMITE_APROX = 5 * 1024 * 1024; // la mayoría de navegadores permite ~5 MB por sitio

  function kb(bytes) {
    return (bytes / 1024).toFixed(0) + ' KB';
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
      '</div>';

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
