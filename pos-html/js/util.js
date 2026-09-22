/*
 * Utilidades de interfaz: formato, escape de HTML, íconos SVG, avisos
 * (toast) y diálogos modales. Todo en scripts clásicos (sin módulos ES)
 * para que funcione abriendo index.html directamente desde el disco.
 */
(function (global) {
  'use strict';

  var U = {};

  U.$ = function (sel, raiz) {
    return (raiz || document).querySelector(sel);
  };
  U.$$ = function (sel, raiz) {
    return Array.prototype.slice.call((raiz || document).querySelectorAll(sel));
  };

  U.esc = function (valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  // Mismo formato que datetime('now','localtime') de SQLite en el backend.
  U.ahora = function () {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  };

  U.marcaArchivo = function () {
    return U.ahora().replace(/[-:]/g, '').replace(' ', '-');
  };

  U.fecha = function (texto) {
    return texto ? U.esc(texto) : '—';
  };

  U.numero = function (valor) {
    var n = Number(valor);
    return isFinite(n) ? n : 0;
  };

  U.dinero = function (valor) {
    var cfg = global.DB ? global.DB.config() : {};
    var decimales = cfg.decimales !== undefined ? Number(cfg.decimales) : 2;
    var simbolo = cfg.moneda !== undefined ? cfg.moneda : '$';
    var n = U.numero(valor);
    var negativo = n < 0;
    var partes = Math.abs(n).toFixed(decimales).split('.');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, decimales === 0 ? '.' : ',');
    return (negativo ? '-' : '') + simbolo + partes.join(decimales === 0 ? '' : '.');
  };

  U.redondear = function (n) {
    return Math.round(U.numero(n) * 100) / 100;
  };

  // ---------- Íconos (SVG inline, sin fuentes externas) ----------
  var ICONOS = {
    venta: 'M4 4h16v4H4zm2 6h12l1 10H5zm3 3v2h6v-2z',
    historial: 'M13 3a9 9 0 1 0 8.95 10h-2.02A7 7 0 1 1 13 5v3l4-4-4-4zm-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8z',
    reloj: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
    caja: 'M20 7l-8-4-8 4v10l8 4 8-4zM12 5.2L17.6 8 12 10.8 6.4 8zM6 9.6l5 2.5v6.3l-5-2.5zm7 8.8v-6.3l5-2.5v6.3z',
    categoria: 'M12 2l5.5 9h-11zm5.5 11a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM3 13.5h8v8H3z',
    bodega: 'M22 8.35V20h-3v-8H5v8H2V8.35L12 4zM7 14h10v2H7zm0 4h10v2H7z',
    reporte: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm-1 7V3.5L18.5 9zM8 13h8v2H8zm0 4h8v2H8z',
    usuarios: 'M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05A4.2 4.2 0 0 1 17 16.5V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    respaldo: 'M19.35 10.04A7.49 7.49 0 0 0 12 4a7.5 7.5 0 0 0-6.65 4.04A6 6 0 0 0 6 20h13a5 5 0 0 0 .35-9.96zM14 13v4h-4v-4H7l5-5 5 5z',
    auditoria: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9z',
    ajustes: 'M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58-1.92-3.32-2.39.96a7 7 0 0 0-1.63-.94L14.87 3.6h-3.84l-.36 2.58a7 7 0 0 0-1.63.94l-2.39-.96-1.92 3.32 2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58 1.92 3.32 2.39-.96c.5.39 1.05.7 1.63.94l.36 2.58h3.84l.36-2.58a7 7 0 0 0 1.63-.94l2.39.96 1.92-3.32zM12.95 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z',
    salir: 'M10 17l1.41-1.41L8.83 13H20v-2H8.83l2.58-2.59L10 7l-5 5zM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4z',
    buscar: 'M15.5 14h-.79l-.28-.27A6.5 6.5 0 1 0 9.5 16a6.47 6.47 0 0 0 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z',
    mas: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z',
    menos: 'M19 13H5v-2h14z',
    borrar: 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z',
    editar: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z',
    ok: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    cerrar: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    alerta: 'M1 21h22L12 2zm12-3h-2v-2h2zm0-4h-2v-4h2z',
    imprimir: 'M19 8H5a3 3 0 0 0-3 3v6h4v4h12v-4h4v-6a3 3 0 0 0-3-3zm-3 11H8v-5h8zm3-7a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm-1-9H6v4h12z',
    chat: 'M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z',
    candado: 'M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3.1-9H8.9V6a3.1 3.1 0 0 1 6.2 0z',
    abierto: 'M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6-9h-1V6A5 5 0 0 0 7.1 5.1l1.9.6A3.1 3.1 0 0 1 15.1 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2z',
    descargar: 'M19 9h-4V3H9v6H5l7 7zM5 18v2h14v-2z',
    subir: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
    llave: 'M12.65 10A6 6 0 1 0 12.65 14H17v4h4v-4h2v-4zM7 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z',
    menu: 'M3 18h18v-2H3zm0-5h18v-2H3zm0-7v2h18V6z',
    etiqueta: 'M21.41 11.58l-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7c0 .55.22 1.05.59 1.42l9 9a2 2 0 0 0 2.82 0l7-7a2 2 0 0 0 0-2.84zM5.5 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z'
  };

  U.icono = function (nombre, clase) {
    var d = ICONOS[nombre] || '';
    return '<svg class="icono ' + (clase || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
  };

  // ---------- Avisos ----------
  U.aviso = function (mensaje, tipo, duracion) {
    var cont = document.getElementById('avisos');
    if (!cont) return;
    var el = document.createElement('div');
    el.className = 'aviso' + (tipo ? ' aviso-' + tipo : '');
    el.setAttribute('role', 'status');
    el.textContent = mensaje;
    cont.appendChild(el);
    // Máximo 3 avisos visibles a la vez: se descartan los más antiguos.
    while (cont.children.length > 3) cont.removeChild(cont.firstChild);
    setTimeout(function () {
      el.className += ' aviso-saliendo';
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 300);
    }, duracion || 3500);
  };

  U.error = function (err) {
    U.aviso(err && err.message ? err.message : String(err), 'error', 5000);
  };

  // ---------- Diálogos ----------
  // U.modal({ titulo, cuerpo (HTML), botones: [{texto, clase, accion(cerrar, raiz) }], alAbrir(raiz, cerrar) })
  U.modal = function (opciones) {
    var fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    var botones = opciones.botones || [{ texto: 'Cerrar', clase: 'boton-secundario' }];
    fondo.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">' +
      '<h2 id="modal-titulo">' + U.esc(opciones.titulo || '') + '</h2>' +
      '<div class="modal-cuerpo">' + (opciones.cuerpo || '') + '</div>' +
      '<div class="modal-acciones">' +
      botones.map(function (b, i) {
        return '<button type="button" class="boton ' + (b.clase || '') + '" data-boton="' + i + '">' + U.esc(b.texto) + '</button>';
      }).join('') +
      '</div></div>';

    var focoPrevio = document.activeElement;
    function cerrar() {
      document.removeEventListener('keydown', onTecla);
      if (fondo.parentNode) fondo.parentNode.removeChild(fondo);
      if (focoPrevio && focoPrevio.focus) focoPrevio.focus();
    }
    function onTecla(e) {
      if (e.key === 'Escape' || e.keyCode === 27) cerrar();
    }
    document.addEventListener('keydown', onTecla);

    U.$$('[data-boton]', fondo).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var b = botones[Number(btn.getAttribute('data-boton'))];
        if (b.accion) {
          try {
            b.accion(cerrar, fondo);
          } catch (err) {
            U.error(err);
          }
        } else {
          cerrar();
        }
      });
    });

    document.body.appendChild(fondo);
    if (opciones.alAbrir) opciones.alAbrir(fondo, cerrar);
    var primero = U.$('input, select, textarea', fondo) || U.$('.boton-primario', fondo);
    if (primero) primero.focus();
    return cerrar;
  };

  U.confirmar = function (mensaje, alAceptar, textoAceptar) {
    U.modal({
      titulo: 'Confirmar',
      cuerpo: '<p>' + U.esc(mensaje) + '</p>',
      botones: [
        { texto: 'Cancelar', clase: 'boton-secundario' },
        {
          texto: textoAceptar || 'Aceptar',
          clase: 'boton-primario',
          accion: function (cerrar) {
            alAceptar();
            cerrar();
          }
        }
      ]
    });
  };

  // Lee los campos [name] de un contenedor como objeto plano.
  U.leerForm = function (raiz) {
    var datos = {};
    U.$$('[name]', raiz).forEach(function (el) {
      if (el.type === 'checkbox') datos[el.name] = el.checked;
      else datos[el.name] = el.value;
    });
    return datos;
  };

  U.descargar = function (nombre, contenido, tipo) {
    // Publicado como artefacto de Claude: las descargas pasan por el visor.
    if (global.claude && typeof global.claude.use === 'function') {
      global.claude.use('downloads').then(function (downloads) {
        if (!downloads) {
          U.aviso('Este entorno no permite descargar archivos. Usa "Copiar" en su lugar.', 'error', 6000);
          return null;
        }
        return downloads.save({ filename: nombre, data: contenido }).then(function () {
          U.aviso('Archivo ' + nombre + ' guardado', 'ok');
        }, function (err) {
          if (err && err.code !== 'declined') U.aviso('No se pudo descargar: ' + (err.message || err.code), 'error', 6000);
        });
      });
      return;
    }
    descargarLocal(nombre, contenido, tipo);
  };

  function descargarLocal(nombre, contenido, tipo) {
    var blob = new Blob([contenido], { type: tipo || 'application/octet-stream' });
    if (global.navigator && global.navigator.msSaveOrOpenBlob) {
      global.navigator.msSaveOrOpenBlob(blob, nombre);
      return;
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  // Copia texto al portapapeles; si el entorno lo impide, lo muestra para copiarlo a mano.
  U.copiar = function (texto, etiqueta) {
    function manual() {
      U.modal({
        titulo: 'Copiar ' + (etiqueta || 'texto'),
        cuerpo: '<p class="tenue">Selecciona todo el texto y cópialo (Ctrl+C / Cmd+C).</p>' +
          '<textarea id="texto-copiar" rows="10" readonly>' + U.esc(texto) + '</textarea>',
        alAbrir: function (raiz) {
          var t = U.$('#texto-copiar', raiz);
          setTimeout(function () { t.focus(); t.select(); }, 0);
        }
      });
    }
    try {
      global.navigator.clipboard.writeText(texto).then(function () {
        U.aviso((etiqueta ? etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1) : 'Texto') + ' copiado al portapapeles', 'ok');
      }, manual);
    } catch (e) {
      manual();
    }
  };

  // Muestra un documento dentro de la página cuando no se puede abrir una ventana nueva.
  function vistaPrevia(html, ancho) {
    U.modal({
      titulo: 'Vista previa',
      cuerpo: '<p class="tenue pequeno">Este entorno no permite abrir el diálogo de impresión. ' +
        'Para imprimir, usa el sistema abriendo index.html directamente en el navegador.</p>' +
        '<iframe class="vista-previa" title="Vista previa del documento" style="max-width:' + (ancho || 420) + 'px"></iframe>',
      alAbrir: function (raiz) {
        U.$('iframe', raiz).srcdoc = html;
      }
    });
  }

  // Abre un documento HTML en una ventana nueva y lanza el diálogo de impresión.
  U.imprimirHTML = function (html, ancho) {
    var ventana = null;
    try {
      ventana = global.open('', '_blank', 'width=' + (ancho || 420) + ',height=640');
    } catch (e) {
      ventana = null;
    }
    if (!ventana) {
      vistaPrevia(html, ancho);
      return;
    }
    ventana.document.open();
    ventana.document.write(html);
    ventana.document.close();
    ventana.focus();
    setTimeout(function () {
      try { ventana.print(); } catch (e) { /* sin impresión disponible */ }
    }, 250);
  };

  global.U = U;
})(window);
