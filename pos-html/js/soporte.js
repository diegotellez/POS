/*
 * Soporte: errores automáticos y solicitudes al proveedor.
 *
 * - Todo error inesperado (de programación, no las validaciones como "stock
 *   insuficiente") queda registrado y se avisa al proveedor: si hay buzón en
 *   línea (soporte.url en version.json) se envía solo; si no, aparece un aviso
 *   con el botón para mandarlo por WhatsApp.
 * - Desde la pantalla Soporte se reportan errores, se piden mejoras o reportes
 *   nuevos. Cada solicitud lleva un código (S-K7Q-0003). Cuando el proveedor
 *   publica una versión que la atiende (version.json, "atendidas"), aquí queda
 *   como "Publicada en 2.x".
 *
 * Los datos de soporte van en su propia clave de localStorage, no en la base.
 */
(function (global) {
  'use strict';

  var CLAVE = 'pos_soporte_v1';
  // Contacto del proveedor si no se ha podido leer version.json (por ejemplo, sin internet la primera vez).
  var CONTACTO_POR_DEFECTO = { nombre: 'Soporte POS', whatsapp: '', correo: '', url: '' };
  var MAX_ERRORES = 50;
  var MAX_AVISOS_DIA = 20;
  var IGNORAR = [/^Script error\.?$/i, /ResizeObserver loop/i];
  var TIPOS = { error: 'Error', mejora: 'Mejora', reporte: 'Reporte nuevo', otro: 'Otro' };

  var memoria = null;
  var avisadosSesion = {};

  function leer() {
    var d = null;
    try { d = JSON.parse(global.localStorage.getItem(CLAVE) || 'null'); } catch (e) { d = memoria; }
    d = d || memoria || {};
    d.errores = d.errores || [];
    d.solicitudes = d.solicitudes || [];
    d.pendientes = d.pendientes || [];
    d.atendidas = d.atendidas || {};
    d.seq = d.seq || 0;
    if (!d.equipo) {
      var letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', c = '';
      for (var i = 0; i < 3; i++) c += letras.charAt(Math.floor(Math.random() * letras.length));
      d.equipo = c;
    }
    return d;
  }

  function guardar(d) {
    memoria = d;
    try { global.localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { /* sin almacenamiento: queda en memoria */ }
  }

  function cambiar(fn) {
    var d = leer();
    var r = fn(d);
    guardar(d);
    return r;
  }

  function codigo(d, letra) {
    d.seq++;
    return letra + '-' + d.equipo + '-' + ('000' + d.seq).slice(-4);
  }

  function ahora() {
    try { return U.ahora(); } catch (e) { return new Date().toISOString().slice(0, 19).replace('T', ' '); }
  }

  function compararVersion(a, b) {
    var x = String(a || '0').split('.'), y = String(b || '0').split('.');
    for (var i = 0; i < Math.max(x.length, y.length); i++) {
      var d = (Number(x[i]) || 0) - (Number(y[i]) || 0);
      if (d) return d;
    }
    return 0;
  }

  function contacto() {
    var c = leer().contacto || {};
    var r = {};
    for (var k in CONTACTO_POR_DEFECTO) r[k] = String(c[k] || CONTACTO_POR_DEFECTO[k] || '').trim();
    r.whatsapp = r.whatsapp.replace(/[^\d]/g, '');
    return r;
  }

  function usuarioActual() {
    try { return global.POS && POS.Auth.usuario(); } catch (e) { return null; }
  }

  function pantalla() {
    try { return (global.location.hash || '').replace(/^#\/?/, '').split('?')[0] || 'inicio'; } catch (e) { return ''; }
  }

  // Información técnica para el proveedor (no incluye ventas, clientes ni contraseñas).
  function diagnostico() {
    var r = { version: global.App ? App.version : '', fecha: ahora(), pantalla: pantalla() };
    try {
      var cfg = DB.config();
      var datos = DB.datos();
      var u = usuarioActual();
      r.negocio = cfg.nombreNegocio;
      r.usuario = u ? u.nombreUsuario + ' (' + u.rol + ')' : 'sin sesión';
      r.cajon = cfg.cajonModo;
      r.ticket = cfg.anchoTicket + ' mm, útil ' + (cfg.ticketAnchoUtil || 'auto') + ', margen ' + (cfg.ticketMargenIzq || 0);
      r.ventaSinStock = !!cfg.permitirVentaSinStock;
      r.datos = datos.productos.length + ' productos, ' + datos.ventas.length + ' ventas, ' + datos.compras.length + ' compras';
      r.almacenamiento = Math.round((global.localStorage.getItem(DB.CLAVE) || '').length / 1024) + ' KB';
    } catch (e) { /* sin base todavía */ }
    try {
      r.modo = global.Actualizaciones ? Actualizaciones.estado() + (Actualizaciones.instalada() ? ', instalada' : '') : '';
      r.navegador = global.navigator.userAgent;
      r.pantallaTamano = global.innerWidth + 'x' + global.innerHeight;
      r.enLinea = global.navigator.onLine;
    } catch (e) { /* entorno limitado */ }
    return r;
  }

  function textoDiagnostico(t) {
    return [
      'Versión ' + t.version + ' · ' + (t.modo || ''),
      'Usuario: ' + (t.usuario || '') + ' · Pantalla: ' + (t.pantalla || ''),
      'Cajón: ' + (t.cajon || '') + ' · Ticket: ' + (t.ticket || ''),
      'Datos: ' + (t.datos || '') + ' (' + (t.almacenamiento || '') + ')',
      'Navegador: ' + (t.navegador || '') + ' · ' + (t.pantallaTamano || '')
    ].join('\n');
  }

  // ---------- Envío al proveedor ----------
  // Buzón en línea (Google Apps Script u otro): POST de texto sin esperar respuesta legible.
  function enviarPendientes() {
    var c = contacto();
    if (!c.url || typeof global.fetch !== 'function') return Promise.resolve(0);
    var d = leer();
    if (!d.pendientes.length) return Promise.resolve(0);
    var lote = d.pendientes.slice(0, 10);
    return Promise.all(lote.map(function (p) {
      return global.fetch(c.url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(p) })
        .then(function () { return p.codigo; }, function () { return null; });
    })).then(function (enviados) {
      var ok = enviados.filter(Boolean);
      cambiar(function (dd) {
        dd.pendientes = dd.pendientes.filter(function (p) { return ok.indexOf(p.codigo) < 0; });
        ok.forEach(function (cod) {
          dd.errores.concat(dd.solicitudes).forEach(function (x) { if (x.codigo === cod && !x.enviado) x.enviado = 'automático'; });
        });
      });
      return ok.length;
    });
  }

  function encolar(d, paquete) {
    d.pendientes.push(paquete);
    if (d.pendientes.length > 100) d.pendientes = d.pendientes.slice(-100);
  }

  // Abre WhatsApp (o el correo) con el texto; si no hay contacto, lo deja para copiar.
  function abrirCanal(texto, asunto) {
    var c = contacto();
    var url = c.whatsapp ? 'https://wa.me/' + c.whatsapp + '?text=' + encodeURIComponent(texto)
      : c.correo ? 'mailto:' + c.correo + '?subject=' + encodeURIComponent(asunto || 'POS') + '&body=' + encodeURIComponent(texto) : '';
    if (!url) {
      U.copiar(texto, 'mensaje para el proveedor');
      return 'copiado';
    }
    var v = null;
    try { v = global.open(url, '_blank'); } catch (e) { v = null; }
    if (!v && !c.whatsapp) { try { global.location.href = url; v = true; } catch (e) { v = null; } }
    if (!v) { U.copiar(texto, 'mensaje para el proveedor'); return 'copiado'; }
    return c.whatsapp ? 'WhatsApp' : 'correo';
  }

  // ---------- Errores ----------
  function textoError(e) {
    return '*Error en el POS* · ' + (e.diagnostico.negocio || '') + '\n' +
      'Código: ' + e.codigo + (e.veces > 1 ? ' (' + e.veces + ' veces)' : '') + '\n' +
      e.primera + (e.contexto ? ' · ' + e.contexto : '') + '\n' +
      'Error: ' + e.mensaje + '\n' +
      (e.lugar ? 'En: ' + e.lugar + '\n' : '') +
      textoDiagnostico(e.diagnostico);
  }

  function lugarDe(pila) {
    var lineas = String(pila || '').split('\n');
    for (var i = 0; i < lineas.length; i++) {
      var m = /(js\/[\w\/.-]+\.js):(\d+)(?::(\d+))?/.exec(lineas[i]);
      if (m) return m[1] + ':' + m[2];
    }
    return '';
  }

  function hoy() { return ahora().slice(0, 10); }

  function registrarError(err, contexto) {
    try {
      if (!err) return null;
      var mensaje = String(err.message || err.reason || err).slice(0, 500);
      if (IGNORAR.some(function (re) { return re.test(mensaje); })) return null;
      var pila = String(err.stack || '').slice(0, 2000);
      var lugar = lugarDe(pila) || err.lugar || '';
      var version = global.App ? App.version : '';
      var huella = mensaje + '|' + lugar + '|' + version;
      var nuevo = false;
      var e = cambiar(function (d) {
        var x = d.errores.filter(function (r) { return r.huella === huella; })[0];
        if (x) {
          x.veces++;
          x.ultima = ahora();
        } else {
          nuevo = true;
          x = { codigo: codigo(d, 'E'), huella: huella, mensaje: mensaje, lugar: lugar, pila: pila, contexto: contexto || '',
            version: version, primera: ahora(), ultima: ahora(), veces: 1, enviado: '', diagnostico: diagnostico() };
          d.errores.unshift(x);
          if (d.errores.length > MAX_ERRORES) d.errores = d.errores.slice(0, MAX_ERRORES);
          // Límite diario para no inundar al proveedor si algo falla en bucle.
          if (d.avisosDia !== hoy()) { d.avisosDia = hoy(); d.avisosHoy = 0; }
          if (d.avisosHoy < MAX_AVISOS_DIA && contacto().url) {
            d.avisosHoy++;
            encolar(d, { tipo: 'error', codigo: x.codigo, negocio: x.diagnostico.negocio || '', version: version, fecha: x.primera,
              titulo: mensaje, detalle: (contexto ? contexto + '\n' : '') + (lugar ? 'En: ' + lugar + '\n' : '') + pila, diagnostico: x.diagnostico });
          }
        }
        return x;
      });
      if (nuevo) avisar(e);
      return e;
    } catch (fallo) {
      if (global.console) global.console.error('Soporte: no se pudo registrar el error', fallo);
      return null;
    }
  }

  // Aviso en pantalla: con buzón en línea basta informar; si no, botón para enviarlo.
  function avisar(e) {
    if (avisadosSesion[e.huella] || !document.body) return;
    avisadosSesion[e.huella] = true;
    var c = contacto();
    if (c.url) {
      enviarPendientes();
      if (global.U) U.aviso('Ocurrió un error inesperado (' + e.codigo + '). Ya se avisó al proveedor.', 'alerta', 7000);
      return;
    }
    var previo = document.getElementById('aviso-error');
    if (previo) previo.parentNode.removeChild(previo);
    var div = document.createElement('div');
    div.id = 'aviso-error';
    div.className = 'aviso-version aviso-error';
    div.setAttribute('role', 'alert');
    div.innerHTML = '<div><strong>Ocurrió un error inesperado (' + U.esc(e.codigo) + ').</strong> <span>' + U.esc(e.mensaje) + '</span>' +
      ' <small>Avise al proveedor para que lo corrija.</small></div>' +
      '<div class="aviso-version-botones"><button type="button" class="boton boton-primario" id="btn-error-avisar">' +
      (c.whatsapp ? 'Avisar por WhatsApp' : c.correo ? 'Avisar por correo' : 'Copiar el reporte') + '</button>' +
      '<button type="button" class="boton boton-texto" id="btn-error-cerrar">Cerrar</button></div>';
    document.body.appendChild(div);
    function quitar() { if (div.parentNode) div.parentNode.removeChild(div); }
    U.$('#btn-error-avisar', div).addEventListener('click', function () { Soporte.enviarError(e.codigo); quitar(); });
    U.$('#btn-error-cerrar', div).addEventListener('click', quitar);
  }

  // ---------- Solicitudes ----------
  function textoSolicitud(s) {
    return '*Solicitud ' + s.codigo + '* · ' + (TIPOS[s.tipo] || s.tipo) + (s.urgente ? ' · URGENTE' : '') + '\n' +
      (s.diagnostico.negocio || '') + ' · versión ' + s.version + '\n' +
      'De: ' + (s.diagnostico.usuario || '') + ' · ' + s.fecha + '\n\n' +
      '*' + s.titulo + '*\n' + s.descripcion +
      (s.tecnica ? '\n\n_Información técnica_\n' + textoDiagnostico(s.diagnostico) +
        (s.errores && s.errores.length ? '\nÚltimos errores: ' + s.errores.join(' | ') : '') : '');
  }

  // Lee del version.json publicado el contacto del proveedor y las solicitudes ya atendidas.
  function actualizarDesdeServidor() {
    if (typeof global.fetch !== 'function') return Promise.resolve(null);
    var urls = [];
    if (/^https?:$/.test(global.location.protocol)) urls.push('version.json');
    try {
      var base = String(DB.config().urlActualizaciones || '').trim();
      if (base) urls.push(base.replace(/[?#].*$/, '').replace(/\/?(index\.html)?$/, '/') + 'version.json');
    } catch (e) { /* sin configuración */ }
    function intentar(i) {
      if (i >= urls.length) return Promise.resolve(null);
      return global.fetch(urls[i], { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).catch(function () { return intentar(i + 1); });
    }
    return intentar(0).then(function (v) {
      if (!v) return null;
      var publicadas = [];
      cambiar(function (d) {
        if (v.soporte && typeof v.soporte === 'object') d.contacto = v.soporte;
        var at = v.atendidas && typeof v.atendidas === 'object' ? v.atendidas : {};
        for (var k in at) d.atendidas[k] = at[k];
        var actual = global.App ? App.version : '0';
        d.solicitudes.concat(d.errores).forEach(function (s) {
          var ver = d.atendidas[s.codigo];
          if (ver && compararVersion(actual, ver) >= 0 && s.estado !== 'publicada') {
            s.estado = 'publicada';
            s.publicadaEn = ver;
            if (s.titulo) publicadas.push(s.codigo + ' (' + s.titulo + ')');
          }
        });
      });
      if (publicadas.length && global.U) U.aviso('Ya está publicado lo que pidió: ' + publicadas.join(', ') + '.', 'ok', 9000);
      return v;
    });
  }

  var Soporte = {
    TIPOS: TIPOS,
    contacto: contacto,
    diagnostico: diagnostico,
    registrarError: registrarError,
    enviarPendientes: enviarPendientes,
    actualizarDesdeServidor: actualizarDesdeServidor,
    textoError: function (cod) {
      var e = leer().errores.filter(function (x) { return x.codigo === cod; })[0];
      return e ? textoError(e) : '';
    },
    textoSolicitud: function (cod) {
      var s = leer().solicitudes.filter(function (x) { return x.codigo === cod; })[0];
      return s ? textoSolicitud(s) : '';
    },

    errores: function () { return leer().errores; },
    solicitudes: function () { return leer().solicitudes; },
    pendientes: function () { return leer().pendientes.length; },

    // Estado para mostrar: Publicada en X, lista al actualizar, enviada o registrada.
    estado: function (x) {
      var d = leer();
      if (x.estado === 'publicada') return { clase: 'ok', texto: 'Publicada en ' + x.publicadaEn };
      var ver = d.atendidas[x.codigo];
      if (ver) return { clase: 'ok', texto: 'Lista en ' + ver + ' (actualice)' };
      if (x.enviado) return { clase: '', texto: 'Enviada (' + x.enviado + ')' };
      if (d.pendientes.some(function (p) { return p.codigo === x.codigo; })) return { clase: 'alerta', texto: 'Por enviar (sin internet)' };
      return { clase: 'alerta', texto: 'Sin enviar' };
    },

    crearSolicitud: function (datos) {
      var titulo = String(datos.titulo || '').trim();
      var descripcion = String(datos.descripcion || '').trim();
      if (!titulo) throw new Error('Escriba un título corto para la solicitud.');
      if (!descripcion) throw new Error('Describa qué pasó o qué necesita.');
      var tipo = TIPOS[datos.tipo] ? datos.tipo : 'otro';
      var s = cambiar(function (d) {
        var x = { codigo: codigo(d, 'S'), tipo: tipo, titulo: titulo.slice(0, 120), descripcion: descripcion.slice(0, 3000),
          urgente: !!datos.urgente, tecnica: !!datos.tecnica, fecha: ahora(), version: global.App ? App.version : '',
          diagnostico: diagnostico(), enviado: '',
          errores: datos.tecnica ? d.errores.slice(0, 3).map(function (e) { return e.codigo + ' ' + e.mensaje + (e.lugar ? ' @ ' + e.lugar : ''); }) : [] };
        d.solicitudes.unshift(x);
        if (contacto().url) {
          encolar(d, { tipo: 'solicitud', clase: tipo, codigo: x.codigo, negocio: x.diagnostico.negocio || '', version: x.version, fecha: x.fecha,
            urgente: x.urgente, titulo: x.titulo, detalle: x.descripcion, diagnostico: x.tecnica ? x.diagnostico : null, errores: x.errores });
        }
        return x;
      });
      enviarPendientes();
      return s;
    },

    // Envía (o reenvía) por WhatsApp/correo; devuelve el canal usado.
    enviarSolicitud: function (cod) {
      var texto = Soporte.textoSolicitud(cod);
      if (!texto) return '';
      var canal = abrirCanal(texto, 'Solicitud ' + cod);
      if (canal !== 'copiado') cambiar(function (d) { d.solicitudes.forEach(function (s) { if (s.codigo === cod) s.enviado = canal; }); });
      return canal;
    },

    enviarError: function (cod) {
      var texto = Soporte.textoError(cod);
      if (!texto) return '';
      var canal = abrirCanal(texto, 'Error ' + cod);
      if (canal !== 'copiado') cambiar(function (d) { d.errores.forEach(function (e) { if (e.codigo === cod) e.enviado = canal; }); });
      return canal;
    },

    borrarErrores: function () { cambiar(function (d) { d.errores = []; }); },

    // Los errores de programación (no las validaciones del negocio) se reportan.
    esInesperado: function (err) {
      return !!err && (err instanceof TypeError || err instanceof ReferenceError || err instanceof SyntaxError || err instanceof RangeError);
    }
  };

  // ---------- Captura global ----------
  global.addEventListener('error', function (ev) {
    var err = ev.error || { message: ev.message, lugar: ev.filename ? String(ev.filename).replace(/^.*\/(js\/)/, '$1') + ':' + ev.lineno : '' };
    registrarError(err, 'Error en la página');
  });
  global.addEventListener('unhandledrejection', function (ev) {
    var r = ev.reason;
    if (r && r.name === 'AbortError') return;
    registrarError(r instanceof Error ? r : { message: String(r && r.message || r) }, 'Promesa sin manejar');
  });
  global.addEventListener('online', function () { enviarPendientes(); });
  global.addEventListener('load', function () {
    setTimeout(function () { actualizarDesdeServidor().then(enviarPendientes, enviarPendientes); }, 1500);
  });

  global.Soporte = Soporte;
})(window);
