/*
 * Interpreta listas de precios escritas o dictadas en lenguaje natural, como
 * las que llegan por WhatsApp (texto o audio transcrito):
 *
 *   "Dolex niños 10+, 14 mil"
 *   "Advil max a 8.500. Noxpirin 3500; Buscapina catorce mil quinientos"
 *
 * y busca a qué producto del catálogo corresponde cada renglón. No usa
 * internet: todo se resuelve en el navegador.
 */
(function (global) {
  'use strict';

  // ---------- Normalización ----------
  function sinTildes(texto) {
    var mapa = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'ñ': 'n' };
    return String(texto || '').toLowerCase().replace(/[áéíóúüñ]/g, function (c) { return mapa[c]; });
  }

  // ---------- Números escritos en palabras ----------
  var UNIDADES = {
    cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
    diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
    dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintidos: 22, veintitres: 23,
    veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
    treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
    cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500,
    seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900
  };

  function esPalabraNumero(p) {
    return UNIDADES.hasOwnProperty(p) || p === 'mil' || p === 'y';
  }

  // "catorce mil quinientos" -> 14500 ; "mil doscientos" -> 1200
  function palabrasANumero(palabras) {
    var total = 0;
    var actual = 0;
    palabras.forEach(function (p) {
      if (p === 'y') return;
      if (p === 'mil') {
        total += (actual || 1) * 1000;
        actual = 0;
      } else {
        actual += UNIDADES[p];
      }
    });
    return total + actual;
  }

  // Reemplaza secuencias de números en palabras por dígitos. Una palabra
  // suelta como "una" o "un" solo cuenta si va seguida de "mil" ("una caja" no es un número).
  function convertirPalabras(texto) {
    var tokens = texto.split(/(\s+)/);
    var salida = [];
    var i = 0;
    while (i < tokens.length) {
      var palabra = sinTildes(tokens[i]).replace(/[^a-z]/g, '');
      if (palabra && UNIDADES.hasOwnProperty(palabra) || palabra === 'mil') {
        var grupo = [];
        var j = i;
        var ultimoNumero = i;
        while (j < tokens.length) {
          var limpio = sinTildes(tokens[j]).replace(/[^a-z]/g, '');
          if (/^\s+$/.test(tokens[j])) { j++; continue; }
          if (!esPalabraNumero(limpio)) break;
          grupo.push(limpio);
          ultimoNumero = j;
          if (/[,.;:]$/.test(tokens[j])) break; // la puntuación corta el número
          j++;
        }
        while (grupo.length && grupo[grupo.length - 1] === 'y') grupo.pop();
        var soloArticulo = grupo.length === 1 && (grupo[0] === 'un' || grupo[0] === 'una' || grupo[0] === 'uno');
        if (grupo.length && !soloArticulo) {
          var fin = tokens[ultimoNumero].match(/[,.;:]+$/);
          var valor = palabrasANumero(grupo);
          // "14 mil", "14,5 mil quinientos": la cifra anterior multiplica al "mil"
          if (grupo[0] === 'mil') {
            var k = salida.length - 1;
            while (k >= 0 && /^\s+$/.test(salida[k])) k--;
            if (k >= 0 && /^\$?\d+([.,]\d+)?$/.test(salida[k])) {
              var cifra = Number(salida[k].replace('$', '').replace(',', '.'));
              valor = Math.round(cifra * 1000) + palabrasANumero(grupo.slice(1));
              salida.length = k;
            }
          }
          salida.push(String(valor) + (fin ? fin[0] : ''));
          i = ultimoNumero + 1;
          continue;
        }
      }
      salida.push(tokens[i]);
      i++;
    }
    return salida.join('');
  }

  // ---------- Precios ----------
  // Un número es precio si va seguido de "mil/k/lucas/pesos", o si es >= 100 y no
  // es parte de la presentación (mg, ml, g, x 10, 10+, 1%...).
  var UNIDAD_PRESENTACION = /^\s*(\+|%|(?:mg|mcg|g|gr|grs|gramos|kg|ml|cc|l|lt|litro|litros|oz|onzas|ui|cm|mm|m|%|\+|tabletas?|tab|capsulas?|caps|grageas?|sobres?|unidades?|und|un|ampollas?|comprimidos?|pastillas?|pulgadas?|horas?|dias?|anos?|meses|etapa)\b)/;

  var PATRON_NUMERO = /\$?\s*(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)(\s*(?:mil|k|lucas?|luks?)\b)?(\s*pesos\b)?/gi;

  function valorNumero(texto, conMil) {
    var t = texto;
    // 14.500 / 14,500 -> separador de miles ; 14,5 / 14.5 -> decimal
    if (/^\d{1,3}([.,]\d{3})+$/.test(t)) t = t.replace(/[.,]/g, '');
    else t = t.replace(',', '.');
    var n = Number(t);
    if (!isFinite(n)) return null;
    return conMil ? Math.round(n * 1000) : n;
  }

  function buscarPrecios(texto) {
    var encontrados = [];
    var m;
    PATRON_NUMERO.lastIndex = 0;
    while ((m = PATRON_NUMERO.exec(texto)) !== null) {
      var inicio = m.index;
      var fin = m.index + m[0].length;
      var conMil = !!m[2];
      var antes = sinTildes(texto.slice(Math.max(0, inicio - 3), inicio));
      var despues = sinTildes(texto.slice(fin, fin + 14));
      if (!conMil && !m[3]) {
        if (/x\s*$/.test(antes)) continue; // "x 10 tabletas"
        if (UNIDAD_PRESENTACION.test(despues)) continue; // "500 mg", "10+"
        if (/^\s*\/|^\s*[\/x]\s*\d/.test(despues)) continue; // "150 mg/5 ml", "7,5 x 7,5"
      }
      var valor = valorNumero(m[1], conMil);
      if (valor === null) continue;
      if (!conMil && valor < 100) continue;
      encontrados.push({ inicio: inicio + (m[0].length - m[0].replace(/^\$?\s*/, '').length), fin: fin, valor: valor });
    }
    return encontrados;
  }

  var CONECTORES_FINALES = /[\s,;:=\-–—$]+$|\s+(a|en|vale|valen|cuesta|cuestan|precio|por|de|sale|queda|quedan|son)$/i;

  function limpiarNombre(texto) {
    var t = texto.replace(/^[\s,.;:\-–—y]+/i, '').replace(/^(y|e|luego|despues|después|el|la|los|las)\s+/i, '');
    var anterior;
    do {
      anterior = t;
      t = t.replace(CONECTORES_FINALES, '');
    } while (t !== anterior);
    return t.replace(/\s+/g, ' ').trim();
  }

  /*
   * Devuelve [{ original, nombre, precio }]. Cada precio encontrado cierra un
   * renglón; lo escrito antes del precio (desde el precio anterior) es el nombre.
   * Los saltos de línea también separan renglones.
   */
  function interpretar(texto) {
    var resultado = [];
    String(texto || '').split(/\r?\n/).forEach(function (linea) {
      var convertido = convertirPalabras(linea);
      var precios = buscarPrecios(convertido);
      var desde = 0;
      precios.forEach(function (p) {
        var nombre = limpiarNombre(convertido.slice(desde, p.inicio));
        if (nombre) {
          resultado.push({ original: convertido.slice(desde, p.fin).replace(/^[\s,.;]+/, '').trim(), nombre: nombre, precio: p.valor });
        }
        desde = p.fin;
      });
      var resto = limpiarNombre(convertido.slice(desde).replace(/^[\s.]+/, ''));
      if (resto && /[a-z]/i.test(resto)) {
        resultado.push({ original: resto, nombre: resto, precio: null });
      }
    });
    return resultado;
  }

  // ---------- Coincidencia con el catálogo ----------
  var VACIAS = { de: 1, del: 1, la: 1, el: 1, los: 1, las: 1, para: 1, con: 1, y: 1, en: 1, x: 1, por: 1 };
  var SINONIMOS = { ninos: 'nino', nino: 'nino', infantil: 'nino', pediatrico: 'nino', tabs: 'tabletas', tab: 'tabletas', tableta: 'tabletas', caps: 'capsulas', capsula: 'capsulas', jbe: 'jarabe', sob: 'sobres', sobre: 'sobres', gr: 'g', grs: 'g', gramos: 'g', und: 'unidades', unidad: 'unidades' };

  function fichas(texto) {
    return sinTildes(texto)
      .replace(/(\d)[.,](\d)/g, '$1_$2')
      .replace(/[^a-z0-9_+%]+/g, ' ')
      .replace(/_/g, ',')
      .split(' ')
      .filter(function (t) { return t && !VACIAS[t]; })
      .map(function (t) { return SINONIMOS[t] || t; });
  }

  // Puntaje 0..1: qué tanto de lo dictado aparece en el nombre del producto,
  // dando más peso a marcas/palabras largas y exigiendo que los números coincidan.
  function puntaje(consulta, nombreProducto) {
    var q = fichas(consulta);
    var p = fichas(nombreProducto);
    if (!q.length || !p.length) return 0;
    var peso = 0;
    var logrado = 0;
    q.forEach(function (t, i) {
      var w = /\d/.test(t) ? 1.5 : t.length <= 2 ? 0.5 : 1 + Math.min(t.length, 8) / 8;
      if (i === 0) w *= 1.5; // la primera palabra suele ser la marca o el principio activo
      peso += w;
      var mejor = 0;
      p.forEach(function (u) {
        if (u === t) mejor = 1;
        else if (!/\d/.test(t) && t.length >= 3 && (u.indexOf(t) === 0 || t.indexOf(u) === 0) && Math.min(u.length, t.length) >= 3) mejor = Math.max(mejor, 0.8);
      });
      logrado += w * mejor;
    });
    var cobertura = logrado / peso;
    // penaliza levemente nombres de producto mucho más largos que lo dictado
    var extra = Math.max(0, p.length - q.length);
    return Math.max(0, cobertura - extra * 0.02);
  }

  function coincidencias(nombre, productos, limite) {
    return productos
      .map(function (prod) { return { producto: prod, puntaje: puntaje(nombre, prod.nombre) }; })
      .filter(function (r) { return r.puntaje >= 0.35; })
      .sort(function (a, b) { return b.puntaje - a.puntaje || a.producto.nombre.length - b.producto.nombre.length; })
      .slice(0, limite || 5);
  }

  global.PreciosTexto = {
    interpretar: interpretar,
    coincidencias: coincidencias,
    puntaje: puntaje,
    convertirPalabras: convertirPalabras,
    // Umbral a partir del cual se asume la coincidencia sin preguntar.
    UMBRAL_SEGURO: 0.8
  };
})(typeof window !== 'undefined' ? window : this);
