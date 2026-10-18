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

  // ---------- Descompresor DEFLATE propio (RFC 1951) ----------
  // Se usa si el del navegador no está o falla con un archivo (Chrome informa
  // ese caso como "Failed to fetch").
  var ORDEN_LONG = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
  var BASE_LONG = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
  var EXTRA_LONG = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  var BASE_DIST = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
  var EXTRA_DIST = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];

  function arbol(longitudes, n) {
    var cuenta = new Uint16Array(16), simbolos = new Uint16Array(n), desde = new Uint16Array(16), i;
    for (i = 0; i < n; i++) cuenta[longitudes[i]]++;
    cuenta[0] = 0;
    for (i = 1; i < 16; i++) desde[i] = desde[i - 1] + cuenta[i - 1];
    for (i = 0; i < n; i++) if (longitudes[i]) simbolos[desde[longitudes[i]]++] = i;
    return { cuenta: cuenta, simbolos: simbolos };
  }

  function inflarJS(entrada) {
    var pos = 0, bits = 0, nbits = 0;
    var salida = new Uint8Array(Math.max(1024, entrada.length * 4)), largo = 0;
    function asegurar(n) {
      if (largo + n <= salida.length) return;
      var nueva = new Uint8Array(Math.max(salida.length * 2, largo + n));
      nueva.set(salida.subarray(0, largo));
      salida = nueva;
    }
    function bit() {
      if (!nbits) {
        if (pos >= entrada.length) throw new Error('Datos comprimidos incompletos');
        bits = entrada[pos++]; nbits = 8;
      }
      var b = bits & 1; bits >>= 1; nbits--; return b;
    }
    function leerBits(n) { var v = 0; for (var i = 0; i < n; i++) v |= bit() << i; return v; }
    // Decodificación canónica de Huffman (como tinf).
    function simbolo(a) {
      var actual = 0, l = 0, suma = 0;
      do {
        actual = 2 * actual + bit();
        l++;
        if (l > 15) throw new Error('Datos comprimidos inválidos');
        suma += a.cuenta[l];
        actual -= a.cuenta[l];
      } while (actual >= 0);
      return a.simbolos[suma + actual];
    }
    var fijoLit, fijoDist;
    function fijos() {
      if (!fijoLit) {
        var l = new Uint8Array(288), i;
        for (i = 0; i < 144; i++) l[i] = 8;
        for (; i < 256; i++) l[i] = 9;
        for (; i < 280; i++) l[i] = 7;
        for (; i < 288; i++) l[i] = 8;
        fijoLit = arbol(l, 288);
        var d = new Uint8Array(30); for (i = 0; i < 30; i++) d[i] = 5;
        fijoDist = arbol(d, 30);
      }
    }
    var final;
    do {
      final = bit();
      var tipo = leerBits(2);
      if (tipo === 0) {
        bits = 0; nbits = 0;
        var len = entrada[pos] | (entrada[pos + 1] << 8);
        pos += 4;
        asegurar(len);
        salida.set(entrada.subarray(pos, pos + len), largo);
        largo += len; pos += len;
        continue;
      }
      var lit, dist;
      if (tipo === 1) { fijos(); lit = fijoLit; dist = fijoDist; }
      else if (tipo === 2) {
        var hlit = leerBits(5) + 257, hdist = leerBits(5) + 1, hclen = leerBits(4) + 4, i;
        var lc = new Uint8Array(19);
        for (i = 0; i < hclen; i++) lc[ORDEN_LONG[i]] = leerBits(3);
        var ac = arbol(lc, 19), ls = new Uint8Array(hlit + hdist);
        for (i = 0; i < hlit + hdist;) {
          var sym = simbolo(ac);
          if (sym < 16) ls[i++] = sym;
          else {
            var rep = 0, val = 0;
            if (sym === 16) { val = ls[i - 1]; rep = 3 + leerBits(2); }
            else if (sym === 17) rep = 3 + leerBits(3);
            else rep = 11 + leerBits(7);
            while (rep--) ls[i++] = val;
          }
        }
        lit = arbol(ls.subarray(0, hlit), hlit);
        dist = arbol(ls.subarray(hlit), hdist);
      } else throw new Error('Bloque comprimido inválido');
      for (;;) {
        var s = simbolo(lit);
        if (s < 256) { asegurar(1); salida[largo++] = s; }
        else if (s === 256) break;
        else {
          s -= 257;
          var n = BASE_LONG[s] + leerBits(EXTRA_LONG[s]);
          var ds = simbolo(dist);
          var d = BASE_DIST[ds] + leerBits(EXTRA_DIST[ds]);
          asegurar(n);
          for (var k = 0; k < n; k++, largo++) salida[largo] = salida[largo - d];
        }
      }
    } while (!final);
    return salida.slice(0, largo);
  }

  function inflar(bytes) {
    var respaldo = function () {
      return new Promise(function (ok, mal) { try { ok(inflarJS(bytes)); } catch (e) { mal(e); } });
    };
    if (typeof global.DecompressionStream !== 'function') return respaldo();
    try {
      var flujo = new Blob([bytes]).stream().pipeThrough(new global.DecompressionStream('deflate-raw'));
      return new Response(flujo).arrayBuffer().then(function (b) { return new Uint8Array(b); }, respaldo);
    } catch (e) {
      return respaldo();
    }
  }

  // solo: función que dice qué archivos descomprimir (por nombre); los demás se listan sin abrir.
  function leer(buffer, solo) {
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
      var bandera = u16(v, pos + 8);
      var metodo = u16(v, pos + 10);
      var comprimido = u32(v, pos + 20);
      var largoNombre = u16(v, pos + 28), largoExtra = u16(v, pos + 30), largoComentario = u16(v, pos + 32);
      var local = u32(v, pos + 42);
      var nombre = decodificador.decode(bytes.subarray(pos + 46, pos + 46 + largoNombre));
      pos += 46 + largoNombre + largoExtra + largoComentario;
      if (/\/$/.test(nombre)) continue; // carpeta
      var inicio = local + 30 + u16(v, local + 26) + u16(v, local + 28);
      entradas.push({ nombre: nombre, metodo: metodo, cifrado: !!(bandera & 1), datos: bytes.subarray(inicio, inicio + comprimido) });
    }
    // Cada archivo se abre por separado: si uno falla (por ejemplo el PDF) los demás siguen.
    return Promise.all(entradas.map(function (e) {
      if (solo && !solo(e.nombre)) return { nombre: e.nombre, datos: null };
      if (e.cifrado) return { nombre: e.nombre, datos: null, error: 'el ZIP tiene contraseña' };
      if (e.metodo === 0) return { nombre: e.nombre, datos: e.datos };
      if (e.metodo !== 8) return { nombre: e.nombre, datos: null, error: 'método de compresión ' + e.metodo + ' no soportado' };
      return inflar(e.datos).then(function (d) { return { nombre: e.nombre, datos: d }; },
        function (err) { return { nombre: e.nombre, datos: null, error: err.message }; });
    }));
  }

  function texto(bytes) {
    var cabeza = new TextDecoder('latin1').decode(bytes.subarray(0, 200));
    var m = cabeza.match(/encoding=["']([\w-]+)["']/i);
    var cod = m && /8859|latin|1252/i.test(m[1]) ? 'windows-1252' : 'utf-8';
    var t = new TextDecoder(cod).decode(bytes);
    return t.charCodeAt(0) === 0xFEFF ? t.slice(1) : t;
  }

  global.LectorZip = { leer: leer, texto: texto, _inflarJS: inflarJS };
})(window);
