/*
 * Actualizaciones automáticas, instalación como aplicación y paso de datos.
 *
 * - Abierto desde la dirección web (https), registra el service worker (sw.js):
 *   la app queda guardada en el equipo y funciona sin internet. Cuando se
 *   publica una versión, se descarga sola y aparece el aviso "Hay una versión
 *   nueva"; al pulsar Actualizar (o al volver a abrir el POS) queda aplicada.
 * - Abierto como archivo (file://, la copia del ZIP), no hay actualizaciones:
 *   Respaldo ofrece "Pasar a la versión con actualizaciones", que abre la
 *   dirección web y le envía los datos de este equipo (el usuario confirma).
 */
(function (global) {
  'use strict';

  var CADA_CUANTO = 30 * 60 * 1000; // buscar versión nueva cada 30 minutos
  var registro = null;
  var esperando = null;
  var instalador = null; // evento beforeinstallprompt
  var recargando = false;
  var aplicando = false; // el usuario pulsó "Actualizar ahora"

  function enLinea() { return /^https?:$/.test(global.location.protocol); }
  function enMarco() { try { return global.top !== global; } catch (e) { return true; } }
  function soportado() { return enLinea() && !enMarco() && 'serviceWorker' in global.navigator; }

  function urlOnline() {
    var c = DB.config();
    return String(c.urlActualizaciones || '').trim();
  }

  // ---------- Aviso de versión nueva ----------
  function mostrarAviso(trabajador) {
    esperando = trabajador;
    global.fetch('version.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return {}; }).then(function (v) {
      var previo = document.getElementById('aviso-version');
      if (previo) previo.parentNode.removeChild(previo);
      var div = document.createElement('div');
      div.id = 'aviso-version';
      div.className = 'aviso-version';
      div.setAttribute('role', 'status');
      div.innerHTML = '<div><strong>Hay una versión nueva del POS' + (v.version ? ' (' + U.esc(v.version) + ')' : '') + '.</strong>' +
        (v.notas ? ' <span>' + U.esc(v.notas) + '</span>' : '') +
        ' <small>Los datos no se tocan.</small></div>' +
        '<div class="aviso-version-botones"><button type="button" class="boton boton-primario" id="btn-actualizar-ya">Actualizar ahora</button>' +
        '<button type="button" class="boton boton-texto" id="btn-actualizar-luego">Más tarde</button></div>';
      document.body.appendChild(div);
      document.getElementById('btn-actualizar-ya').addEventListener('click', Actualizaciones.aplicar);
      document.getElementById('btn-actualizar-luego').addEventListener('click', function () {
        div.parentNode.removeChild(div);
        U.aviso('Se actualizará la próxima vez que abra el POS.', 'ok', 5000);
      });
    });
  }

  function vigilar(reg) {
    registro = reg;
    if (reg.waiting && global.navigator.serviceWorker.controller) mostrarAviso(reg.waiting);
    reg.addEventListener('updatefound', function () {
      var nuevo = reg.installing;
      if (!nuevo) return;
      nuevo.addEventListener('statechange', function () {
        // Si ya había una versión controlando la página, la nueva queda esperando.
        if (nuevo.state === 'installed' && global.navigator.serviceWorker.controller) mostrarAviso(nuevo);
      });
    });
    setInterval(function () { reg.update().catch(function () {}); }, CADA_CUANTO);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') reg.update().catch(function () {});
    });
  }

  // ---------- Paso de datos desde la copia en carpeta ----------
  function resumenDatos(texto) {
    var d = JSON.parse(texto);
    var n = function (t) { return Array.isArray(d[t]) ? d[t].length : 0; };
    return n('productos') + ' productos, ' + n('ventas') + ' ventas, ' + n('turnos') + ' turnos, ' + n('usuarios') + ' usuarios';
  }

  function recibirDatos() {
    if (!/[?&]importar=1/.test(global.location.search) || !global.opener) return;
    global.addEventListener('message', function (e) {
      if (e.source !== global.opener || !e.data || e.data.tipo !== 'pos-respaldo') return;
      var texto = e.data.datos;
      var actual = DB.datos();
      var conDatos = actual.ventas.length > 0;
      var detalle;
      try { detalle = resumenDatos(texto); } catch (err) { U.aviso('Los datos recibidos no son válidos.', 'error', 6000); return; }
      U.modal({
        titulo: 'Pasar los datos del POS anterior',
        cuerpo: '<p>Se recibieron los datos de la copia en carpeta de este equipo: <strong>' + U.esc(detalle) + '</strong>.</p>' +
          (conDatos ? '<p class="alerta">Esta copia ya tiene ' + actual.ventas.length + ' ventas. Si continúa, se reemplazan por los datos recibidos.</p>' : '') +
          '<p class="tenue pequeno">Después de pasar los datos, use siempre esta versión (la de la dirección web): se actualiza sola.</p>',
        botones: [
          { texto: 'Cancelar', clase: 'boton-secundario' },
          { texto: 'Pasar los datos', clase: 'boton-primario', accion: function (cerrar) {
            DB.importar(texto);
            // El enlace de cierres apunta a esta dirección, no a la de la copia anterior.
            DB.tx(function (db) { db.config.urlApp = global.location.origin + global.location.pathname.replace(/index\.html$/, ''); });
            try { global.opener.postMessage({ tipo: 'pos-importado' }, '*'); } catch (err) { /* la otra ventana se cerró */ }
            cerrar();
            global.history.replaceState(null, '', global.location.pathname);
            U.aviso('Datos pasados. Inicie sesión con sus usuarios de siempre.', 'ok', 7000);
            App.renderizar();
          } }
        ]
      });
    });
    // Avisa a la ventana anterior que ya puede enviar los datos.
    global.opener.postMessage({ tipo: 'pos-listo' }, '*');
  }

  var Actualizaciones = {
    soportado: soportado,
    enLinea: enLinea,
    urlOnline: urlOnline,

    estado: function () {
      if (!enLinea()) return 'archivo';
      if (enMarco()) return 'marco';
      if (!('serviceWorker' in global.navigator)) return 'sin-soporte';
      return esperando ? 'pendiente' : registro ? 'activo' : 'iniciando';
    },

    instalable: function () { return !!instalador; },
    instalada: function () {
      return (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) || global.navigator.standalone === true;
    },

    instalar: function () {
      if (!instalador) return Promise.resolve(false);
      instalador.prompt();
      return instalador.userChoice.then(function (r) { instalador = null; return r.outcome === 'accepted'; });
    },

    buscar: function () {
      if (!registro) return Promise.reject(new Error('Las actualizaciones automáticas solo funcionan abriendo el POS desde su dirección web.'));
      return registro.update().then(function () {
        return new Promise(function (ok) { setTimeout(ok, 1500); });
      }).then(function () { return !!(registro.waiting || registro.installing || esperando); });
    },

    aplicar: function () {
      var w = esperando || (registro && registro.waiting);
      aplicando = true;
      if (w) w.postMessage('activar');
      else global.location.reload();
    },

    // Desde la copia en carpeta: abre la versión web y le envía los datos de este equipo.
    pasarAOnline: function () {
      var destino = urlOnline();
      if (!destino) { U.aviso('Falta la dirección de la versión en línea en Configuración.', 'error'); return; }
      var origen;
      try { origen = new URL(destino).origin; } catch (e) { U.aviso('La dirección de la versión en línea no es válida.', 'error'); return; }
      var ventana = global.open(destino.replace(/#.*$/, '').replace(/\?.*$/, '') + '?importar=1', '_blank');
      if (!ventana) { U.aviso('El navegador bloqueó la ventana. Permita ventanas emergentes e intente de nuevo.', 'error', 6000); return; }
      var enviado = false;
      function alRecibir(e) {
        if (e.source !== ventana || !e.data) return;
        if (e.data.tipo === 'pos-listo' && !enviado) {
          enviado = true;
          ventana.postMessage({ tipo: 'pos-respaldo', datos: DB.exportar() }, origen);
        } else if (e.data.tipo === 'pos-importado') {
          global.removeEventListener('message', alRecibir);
          U.aviso('Los datos quedaron en la versión en línea. Desde ahora use esa ventana (o el ícono instalado).', 'ok', 9000);
        }
      }
      global.addEventListener('message', alRecibir);
      U.aviso('Se abrió la versión en línea. Confirme allí el paso de los datos.', 'ok', 7000);
    }
  };

  global.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    instalador = e;
  });

  // Arranque (después de que DB y App están listos).
  global.addEventListener('load', function () {
    if (!enLinea() || enMarco()) return;
    // El enlace de los cierres por WhatsApp apunta a esta misma dirección si aún tenía el valor de fábrica.
    try {
      var cfg = DB.config();
      var aqui = global.location.origin + global.location.pathname.replace(/index\.html$/, '');
      if (/claude\.ai\/artifact/.test(cfg.urlApp || '') || !cfg.urlApp) {
        DB.tx(function (db) { db.config.urlApp = aqui; });
      }
    } catch (e) { /* sin almacenamiento */ }
    recibirDatos();
    if (!soportado()) return;
    // Solo se recarga al aplicar una versión nueva; la primera instalación no recarga la página.
    var habiaControlador = !!global.navigator.serviceWorker.controller;
    global.navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (recargando || !(aplicando || habiaControlador)) return;
      recargando = true;
      global.location.reload();
    });
    global.navigator.serviceWorker.register('sw.js').then(vigilar).catch(function (err) {
      if (global.console) global.console.warn('No se pudo activar el modo sin internet:', err);
    });
  });

  global.Actualizaciones = Actualizaciones;
})(window);
