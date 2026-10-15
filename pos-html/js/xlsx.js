/*
 * Generador mínimo de archivos Excel (.xlsx) sin librerías ni internet.
 *
 * Un .xlsx es un ZIP con varios XML. Aquí se arma el ZIP sin compresión
 * ("stored"), que Excel, LibreOffice y Google Sheets abren sin problema.
 *
 * Uso:
 *   var bytes = XLSX.libro([
 *     { nombre: 'Ventas', anchos: [14, 30, 12], filtro: true,
 *       filas: [['Fecha', 'Producto', 'Valor'], ['2026-10-01', 'Dolex', { v: 14000, s: 'moneda' }]] }
 *   ]);
 * La primera fila de cada hoja es el encabezado (negrita, fija al desplazarse).
 * Celdas: número, texto, null, o { v, s } con s = 'moneda' | 'pct' | 'negrita' | 'total' | 'totalMoneda'.
 */
(function (global) {
  'use strict';

  // ---------- ZIP (sin compresión) ----------
  var TABLA_CRC = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = TABLA_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function utf8(texto) {
    if (global.TextEncoder) return new TextEncoder().encode(texto);
    var s = unescape(encodeURIComponent(texto));
    var b = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }

  function zip(archivos) {
    var partes = [], central = [], desplazamiento = 0;
    function u16(v) { return [v & 0xFF, (v >>> 8) & 0xFF]; }
    function u32(v) { return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; }
    archivos.forEach(function (a) {
      var nombre = utf8(a.nombre);
      var datos = utf8(a.contenido);
      var crc = crc32(datos);
      // versión 20, bandera 0x0800 (nombres UTF-8), método 0 (stored), fecha fija
      var comun = [].concat(u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(datos.length), u32(datos.length), u16(nombre.length));
      var local = new Uint8Array([].concat(u32(0x04034B50), comun, u16(0)));
      partes.push(local, nombre, datos);
      central.push(new Uint8Array([].concat(u32(0x02014B50), u16(20), comun, u16(0), u16(0), u16(0), u16(0), u32(0), u32(desplazamiento))), nombre);
      desplazamiento += local.length + nombre.length + datos.length;
    });
    var tamCentral = central.reduce(function (s, p) { return s + p.length; }, 0);
    var fin = new Uint8Array([].concat(u32(0x06054B50), u16(0), u16(0), u16(archivos.length), u16(archivos.length), u32(tamCentral), u32(desplazamiento), u16(0)));
    var todo = partes.concat(central, [fin]);
    var total = todo.reduce(function (s, p) { return s + p.length; }, 0);
    var salida = new Uint8Array(total), pos = 0;
    todo.forEach(function (p) { salida.set(p, pos); pos += p.length; });
    return salida;
  }

  // ---------- Hojas ----------
  var ESTILOS = { normal: 0, encabezado: 1, moneda: 2, total: 3, totalMoneda: 4, pct: 5, negrita: 6 };

  function esc(v) {
    return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  }

  function columna(i) {
    var s = '';
    i += 1;
    while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
    return s;
  }

  function celda(valor, ref, estiloFila) {
    var v = valor, s = estiloFila || 0;
    if (valor && typeof valor === 'object') { v = valor.v; if (valor.s) s = ESTILOS[valor.s] || 0; }
    if (v === null || v === undefined || v === '') return s ? '<c r="' + ref + '" s="' + s + '"/>' : '';
    if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"' + (s ? ' s="' + s + '"' : '') + '><v>' + v + '</v></c>';
    return '<c r="' + ref + '" t="inlineStr"' + (s ? ' s="' + s + '"' : '') + '><is><t xml:space="preserve">' + esc(v) + '</t></is></c>';
  }

  function hojaXML(h) {
    var filas = h.filas || [];
    var ncols = filas.reduce(function (m, f) { return Math.max(m, f.length); }, 1);
    var xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>';
    if (h.anchos && h.anchos.length) {
      xml += '<cols>' + h.anchos.map(function (w, i) {
        return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>';
      }).join('') + '</cols>';
    }
    xml += '<sheetData>' + filas.map(function (f, r) {
      var estiloFila = r === 0 ? ESTILOS.encabezado : 0;
      return '<row r="' + (r + 1) + '">' + f.map(function (v, c) { return celda(v, columna(c) + (r + 1), estiloFila); }).join('') + '</row>';
    }).join('') + '</sheetData>';
    if (h.filtro && filas.length > 1) xml += '<autoFilter ref="A1:' + columna(ncols - 1) + filas.length + '"/>';
    return xml + '</worksheet>';
  }

  var ESTILOS_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot;\\ #,##0"/></numFmts>' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE3F4EC"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="2"><border/><border><top style="thin"/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="7">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>' +
    '<xf numFmtId="164" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' +
    '<xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  function nombreHoja(n, usados) {
    var base = String(n || 'Hoja').replace(/[\\\/\?\*\[\]:]/g, ' ').slice(0, 31) || 'Hoja';
    var nombre = base, i = 2;
    while (usados[nombre.toLowerCase()]) nombre = base.slice(0, 28) + ' ' + (i++);
    usados[nombre.toLowerCase()] = true;
    return nombre;
  }

  function libro(hojas) {
    var usados = {};
    var nombres = hojas.map(function (h) { return nombreHoja(h.nombre, usados); });
    var archivos = [
      { nombre: '[Content_Types].xml', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        hojas.map(function (h, i) {
          return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
        }).join('') + '</Types>' },
      { nombre: '_rels/.rels', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>' },
      { nombre: 'xl/workbook.xml', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets>' + nombres.map(function (n, i) {
          return '<sheet name="' + esc(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
        }).join('') + '</sheets>' +
        (hojas.some(function (h) { return h.filtro; })
          ? '<definedNames>' + hojas.map(function (h, i) {
              if (!h.filtro || (h.filas || []).length < 2) return '';
              var nc = h.filas.reduce(function (m, f) { return Math.max(m, f.length); }, 1);
              return '<definedName name="_xlnm._FilterDatabase" localSheetId="' + i + '" hidden="1">\'' + esc(nombres[i].replace(/'/g, "''")) +
                '\'!$A$1:$' + columna(nc - 1) + '$' + h.filas.length + '</definedName>';
            }).join('') + '</definedNames>'
          : '') +
        '</workbook>' },
      { nombre: 'xl/_rels/workbook.xml.rels', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        hojas.map(function (h, i) {
          return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
        }).join('') +
        '<Relationship Id="rId' + (hojas.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>' },
      { nombre: 'xl/styles.xml', contenido: ESTILOS_XML }
    ];
    hojas.forEach(function (h, i) { archivos.push({ nombre: 'xl/worksheets/sheet' + (i + 1) + '.xml', contenido: hojaXML(h) }); });
    return zip(archivos);
  }

  global.XLSX = { libro: libro, TIPO: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
})(window);
