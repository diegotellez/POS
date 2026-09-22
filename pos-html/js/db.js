/*
 * Almacenamiento local del POS. Toda la base vive en un único documento JSON
 * guardado en localStorage. Cada operación de escritura es una "transacción":
 * se lee el estado más reciente (por si otra pestaña lo cambió), se aplica la
 * función y sólo si no lanza error se guarda de una sola vez. Si la función
 * lanza, no se persiste nada (equivalente a un rollback).
 */
(function (global) {
  'use strict';

  var CLAVE = 'pos_html_db_v1';
  var VERSION = 1;
  var TABLAS = ['categorias', 'productos', 'usuarios', 'turnos', 'clientes', 'ventas', 'movimientos', 'auditoria'];

  var CONFIG_POR_DEFECTO = {
    nombreNegocio: 'Mi Negocio',
    direccion: '',
    nit: '',
    moneda: '$',
    decimales: 2,
    anchoTicket: 80,
    whatsapp: '',
    mensajeTicket: '¡Gracias por su compra!'
  };

  var memoria = null; // copia en memoria si localStorage no está disponible
  var almacenamientoDisponible = (function () {
    try {
      var k = '__pos_prueba__';
      global.localStorage.setItem(k, '1');
      global.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  })();

  function vacia() {
    var db = { version: VERSION, seq: {}, config: {} };
    TABLAS.forEach(function (t) {
      db[t] = [];
      db.seq[t] = 0;
    });
    for (var k in CONFIG_POR_DEFECTO) db.config[k] = CONFIG_POR_DEFECTO[k];
    return db;
  }

  function normalizar(db) {
    if (!db || typeof db !== 'object') throw new Error('Datos inválidos');
    db.seq = db.seq || {};
    TABLAS.forEach(function (t) {
      if (!Array.isArray(db[t])) db[t] = [];
      if (typeof db.seq[t] !== 'number') {
        db.seq[t] = db[t].reduce(function (m, r) { return Math.max(m, r.id || 0); }, 0);
      }
    });
    db.config = db.config || {};
    for (var k in CONFIG_POR_DEFECTO) {
      if (db.config[k] === undefined) db.config[k] = CONFIG_POR_DEFECTO[k];
    }
    db.version = VERSION;
    return db;
  }

  function leer() {
    var texto = null;
    if (almacenamientoDisponible) {
      texto = global.localStorage.getItem(CLAVE);
    } else if (memoria) {
      texto = memoria;
    }
    if (!texto) return null;
    return normalizar(JSON.parse(texto));
  }

  function escribir(db) {
    var texto = JSON.stringify(db);
    if (almacenamientoDisponible) {
      try {
        global.localStorage.setItem(CLAVE, texto);
      } catch (e) {
        throw new Error('No hay espacio para guardar los datos en el navegador. Exporta un respaldo y depura datos antiguos.');
      }
    } else {
      memoria = texto;
    }
    cache = db;
  }

  var cache = null;

  var DB = {
    TABLAS: TABLAS,
    persistente: almacenamientoDisponible,

    // Estado actual (solo lectura: no mutar el resultado fuera de DB.tx).
    datos: function () {
      if (!cache) cache = leer() || vacia();
      return cache;
    },

    config: function () {
      return DB.datos().config;
    },

    // Ejecuta fn(db) sobre la copia más reciente y guarda si no hubo errores.
    tx: function (fn) {
      var db = leer() || vacia();
      var resultado = fn(db);
      escribir(db);
      return resultado;
    },

    siguienteId: function (db, tabla) {
      db.seq[tabla] = (db.seq[tabla] || 0) + 1;
      return db.seq[tabla];
    },

    insertar: function (db, tabla, registro) {
      registro.id = DB.siguienteId(db, tabla);
      db[tabla].push(registro);
      return registro;
    },

    buscarPorId: function (db, tabla, id) {
      id = Number(id);
      for (var i = 0; i < db[tabla].length; i++) {
        if (db[tabla][i].id === id) return db[tabla][i];
      }
      return null;
    },

    existe: function () {
      return leer() !== null;
    },

    exportar: function () {
      return JSON.stringify(leer() || vacia(), null, 2);
    },

    importar: function (texto) {
      var db = normalizar(JSON.parse(texto));
      if (!db.usuarios.length) throw new Error('El respaldo no contiene usuarios.');
      escribir(db);
    },

    reiniciar: function () {
      if (almacenamientoDisponible) global.localStorage.removeItem(CLAVE);
      memoria = null;
      cache = null;
    },

    // Tamaño aproximado ocupado (en bytes, UTF-16 como lo cuenta el navegador).
    tamano: function () {
      var texto = almacenamientoDisponible ? global.localStorage.getItem(CLAVE) : memoria;
      return texto ? texto.length * 2 : 0;
    },

    // Descarta la caché cuando otra pestaña modificó los datos.
    invalidar: function () {
      cache = null;
    },

    CLAVE: CLAVE
  };

  global.DB = DB;
})(window);
