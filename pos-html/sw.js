/*
 * Service worker del POS: guarda una copia de la aplicación en el equipo para
 * que funcione sin internet y descarga las versiones nuevas en segundo plano.
 *
 * Cada versión usa su propio caché ("pos-<versión>"). Al publicar una versión
 * cambia este archivo (VERSION y la lista de archivos), el navegador lo detecta,
 * instala la versión nueva y la página muestra "Hay una versión nueva".
 * La lista de archivos la genera scripts/version.py: no editarla a mano.
 */
/* VERSION-INICIO */
var VERSION = '2.5';
/* VERSION-FIN */
/* ARCHIVOS-INICIO */
var ARCHIVOS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/estilos.css",
  "iconos/apple-touch-icon.png",
  "iconos/favicon-32.png",
  "iconos/icono-192.png",
  "iconos/icono-512.png",
  "iconos/icono-maskable-512.png",
  "js/actualizaciones.js",
  "js/app.js",
  "js/cajon.js",
  "js/catalogo-base.js",
  "js/db.js",
  "js/precios-texto.js",
  "js/servicios.js",
  "js/sha256.js",
  "js/util.js",
  "js/xlsx.js",
  "js/vistas/auditoria.js",
  "js/vistas/categorias.js",
  "js/vistas/cierre-compartido.js",
  "js/vistas/compras.js",
  "js/vistas/historial.js",
  "js/vistas/inventario.js",
  "js/vistas/precios.js",
  "js/vistas/productos.js",
  "js/vistas/reportes.js",
  "js/vistas/respaldo.js",
  "js/vistas/turno.js",
  "js/vistas/usuarios.js",
  "js/vistas/ventas.js"
];
/* ARCHIVOS-FIN */

var CACHE = 'pos-' + VERSION;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    // cache: 'reload' evita tomar archivos viejos del caché HTTP del navegador.
    return c.addAll(ARCHIVOS.map(function (a) { return new Request(a, { cache: 'reload' }); }));
  }));
});

// La página pide activar la versión nueva cuando el usuario pulsa "Actualizar".
self.addEventListener('message', function (e) {
  if (e.data === 'activar') self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (claves) {
    return Promise.all(claves.filter(function (k) { return k.indexOf('pos-') === 0 && k !== CACHE && k !== 'pos-extra'; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // version.json siempre se consulta en línea (si no hay internet, la copia guardada).
  if (/\/version\.json$/.test(url.pathname)) {
    e.respondWith(fetch(req, { cache: 'no-store' }).catch(function () { return caches.match(req, { ignoreSearch: true }); }));
    return;
  }
  // Abrir la aplicación: siempre la copia guardada (rápida y sin internet).
  if (req.mode === 'navigate') {
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(new URL('index.html', self.registration.scope).href).then(function (r) { return r || fetch(req); });
    }).catch(function () { return fetch(req); }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (r) {
    if (r) return r;
    // Lo que no está en la lista (por ejemplo los manuales PDF) se guarda al usarlo.
    return fetch(req).then(function (resp) {
      if (resp && resp.ok) {
        var copia = resp.clone();
        caches.open('pos-extra').then(function (c) { c.put(req, copia); });
      }
      return resp;
    });
  }));
});
