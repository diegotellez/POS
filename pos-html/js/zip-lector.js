/*
 * Lector mínimo de archivos ZIP en el navegador, sin librerías ni internet.
 * Lo usa Compras para abrir el ZIP de la factura electrónica que llega al
 * correo (XML de la DIAN + PDF). Los archivos comprimidos se descomprimen con
 * DecompressionStream('deflate-raw'), que traen Chrome, Edge, Firefox y Safari
 * recientes.
 *
 *   LectorZip.leer(arrayBuffer) -> Promise<[{ nombre, datos: Uint8Array }]>
 *   LectorZip.texto(bytes)      -> string (respeta encoding="ISO-8859-1" del XML)
 */
(function (global) {
  'use strict';

  function u16(v, i) { return v.getUint16(i, true); }
  function u32(v, i) { return v.getUint32(i, true); }

  function inflar(bytes) {
    if (typeof global.DecompressionStream !== 'function') {
      return Promise.reject(new Error('Este navegador no puede abrir archivos ZIP. Actualice Chrome o Edge, o descomprima el ZIP y suba el XML.'));
    }
    var flujo = new Blob([bytes]).stream().pipeThrough(new global.DecompressionStream('deflate-raw'));
    return new Response(flujo).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }

  function leer(buffer) {
    var bytes = new Uint8Array(buffer);
    var v = new DataView(buffer);
    // Fin del directorio central: firma 0x06054b50, buscando desde el final.
    var fin = -1;
    for (var i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (u32(v, i) === 0x06054b50) { fin = i; break; }
    }
    if (fin < 0) return Promise.reject(new Error('El archivo no es un ZIP válido'));
    var total = u16(v, fin + 10);
    var pos = u32(v, fin + 16);
    var decodificador = new TextDecoder('utf-8');
    var entradas = [];
    for (var n = 0; n < total; n++) {
      if (u32(v, pos) !== 0x02014b50) return Promise.reject(new Error('El ZIP está dañado'));
      var metodo = u16(v, pos + 10);
      var comprimido = u32(v, pos + 20);
      var largoNombre = u16(v, pos + 28), largoExtra = u16(v, pos + 30), largoComentario = u16(v, pos + 32);
      var local = u32(v, pos + 42);
      var nombre = decodificador.decode(bytes.subarray(pos + 46, pos + 46 + largoNombre));
      pos += 46 + largoNombre + largoExtra + largoComentario;
      if (/\/$/.test(nombre)) continue; // carpeta
      var inicio = local + 30 + u16(v, local + 26) + u16(v, local + 28);
      entradas.push({ nombre: nombre, metodo: metodo, datos: bytes.subarray(inicio, inicio + comprimido) });
    }
    return Promise.all(entradas.map(function (e) {
      if (e.metodo === 0) return Promise.resolve({ nombre: e.nombre, datos: e.datos });
      if (e.metodo !== 8) return Promise.resolve({ nombre: e.nombre, datos: null, error: 'método de compresión no soportado' });
      return inflar(e.datos).then(function (d) { return { nombre: e.nombre, datos: d }; });
    }));
  }

  function texto(bytes) {
    var cabeza = new TextDecoder('latin1').decode(bytes.subarray(0, 200));
    var m = cabeza.match(/encoding=["']([\w-]+)["']/i);
    var cod = m && /8859|latin|1252/i.test(m[1]) ? 'windows-1252' : 'utf-8';
    var t = new TextDecoder(cod).decode(bytes);
    return t.charCodeAt(0) === 0xFEFF ? t.slice(1) : t;
  }

  global.LectorZip = { leer: leer, texto: texto };
})(window);
