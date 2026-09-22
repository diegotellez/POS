/*
 * Arranque, enrutador (#/ventas, #/turno, ...) y marco de la
 * aplicación (menú lateral + barra superior). Cada vista se registra en
 * App.vistas desde su propio archivo en js/vistas/.
 */
(function (global) {
  'use strict';

  var App = {
    vistas: {},
    // Orden del menú lateral
    menu: ['ventas', 'historial', 'turno', 'productos', 'precios', 'categorias', 'inventario', 'reportes', 'usuarios', 'auditoria', 'respaldo'],
    limpiezas: []
  };

  App.registrar = function (nombre, vista) {
    App.vistas[nombre] = vista;
  };

  // La ruta vive en memoria y se refleja en el hash cuando el entorno lo
  // permite. Así también funciona embebida (p. ej. en un iframe aislado),
  // donde cambiar location.hash no es confiable.
  var rutaEstado = null;

  function fijarRuta(ruta) {
    rutaEstado = ruta;
    try {
      if (global.history && global.history.replaceState) global.history.replaceState(null, '', '#/' + ruta);
    } catch (e) {
      /* entorno sin historial: basta con la ruta en memoria */
    }
  }

  App.ir = function (ruta) {
    fijarRuta(ruta);
    App.renderizar();
  };

  // Parámetro de la ruta actual, p. ej. App.param('turno') en #/reportes?turno=3
  App.param = function (nombre) {
    var m = new RegExp('[?&]' + nombre + '=([^&]*)').exec(rutaCompleta());
    return m ? decodeURIComponent(m[1]) : null;
  };

  // Permite a una vista registrar algo que se debe liberar al salir de ella.
  App.alSalir = function (fn) {
    App.limpiezas.push(fn);
  };

  function rutaCompleta() {
    if (rutaEstado !== null) return rutaEstado;
    var h = '';
    try { h = global.location.hash || ''; } catch (e) { /* sin acceso al hash */ }
    return h.replace(/^#\/?/, '');
  }

  function rutaActual() {
    return rutaCompleta().split('?')[0] || 'ventas';
  }

  function renderLogin() {
    var raiz = document.getElementById('app');
    var cfg = DB.config();
    raiz.className = 'app-login';
    raiz.innerHTML =
      '<form class="tarjeta login" id="form-login" autocomplete="off">' +
      '<div class="login-logo">POS</div>' +
      '<h1>' + U.esc(cfg.nombreNegocio) + '</h1>' +
      '<p class="tenue">Inicia sesión para continuar</p>' +
      '<label class="campo"><span>Usuario</span><input name="usuario" required autocapitalize="off" autocomplete="username"></label>' +
      '<label class="campo"><span>Contraseña</span><input name="password" type="password" required autocomplete="current-password"></label>' +
      '<button class="boton boton-primario boton-bloque" type="submit">Ingresar</button>' +
      (cfg.primerUso
        ? '<p class="nota">Primer uso: usuarios <strong>admin / admin123</strong> y <strong>cajero / cajero123</strong>. Cámbialas en "Usuarios".</p>'
        : '') +
      (!DB.persistente
        ? '<p class="nota nota-alerta">Este navegador no permite guardar datos locales (¿modo privado?). Lo que registres se perderá al cerrar la pestaña.</p>'
        : '') +
      '</form>';
    var form = document.getElementById('form-login');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var datos = U.leerForm(form);
      try {
        POS.Auth.login(datos.usuario, datos.password);
        if (rutaActual() === 'login') fijarRuta('ventas');
        App.renderizar();
      } catch (err) {
        U.error(err);
        form.password.value = '';
        form.password.focus();
      }
    });
    U.$('input', form).focus();
  }

  function renderShell(usuario, ruta) {
    var raiz = document.getElementById('app');
    var esAdmin = usuario.rol === 'ADMINISTRADOR';
    var cfg = DB.config();
    raiz.className = 'app-shell';
    raiz.innerHTML =
      '<aside class="lateral" id="lateral">' +
      '<div class="lateral-logo">POS</div>' +
      '<nav>' +
      App.menu.filter(function (n) {
        var v = App.vistas[n];
        return v && (!v.soloAdmin || esAdmin);
      }).map(function (n) {
        var v = App.vistas[n];
        return '<a href="#/' + n + '" class="lateral-item' + (n === ruta ? ' activo' : '') + '">' +
          U.icono(v.icono) + '<span>' + U.esc(v.titulo) + '</span></a>';
      }).join('') +
      '</nav></aside>' +
      '<div class="lateral-fondo" id="lateral-fondo"></div>' +
      '<div class="principal">' +
      '<header class="barra">' +
      '<button class="boton-icono barra-menu" id="btn-menu" aria-label="Menú">' + U.icono('menu') + '</button>' +
      '<span class="barra-titulo">' + U.esc(cfg.nombreNegocio) + '</span>' +
      '<span class="espaciador"></span>' +
      '<span class="barra-usuario">' + U.esc(usuario.nombreUsuario) + ' · ' + U.esc(usuario.rol) + '</span>' +
      '<button class="boton-icono" id="btn-salir" aria-label="Cerrar sesión" title="Cerrar sesión">' + U.icono('salir') + '</button>' +
      '</header>' +
      '<main class="contenido" id="contenido"></main>' +
      '</div>';

    document.getElementById('btn-salir').addEventListener('click', function () {
      POS.Auth.logout();
      App.ir('ventas');
    });
    var lateral = document.getElementById('lateral');
    document.getElementById('btn-menu').addEventListener('click', function () {
      lateral.classList.toggle('abierto');
    });
    document.getElementById('lateral-fondo').addEventListener('click', function () {
      lateral.classList.remove('abierto');
    });
  }

  App.renderizar = function () {
    while (App.limpiezas.length) {
      try { App.limpiezas.pop()(); } catch (e) { /* ignorar */ }
    }
    var usuario = POS.Auth.usuario();
    if (!usuario) {
      renderLogin();
      return;
    }
    var ruta = rutaActual();
    var vista = App.vistas[ruta];
    if (!vista || (vista.soloAdmin && usuario.rol !== 'ADMINISTRADOR')) {
      ruta = 'ventas';
      vista = App.vistas.ventas;
      if (rutaCompleta() !== 'ventas') fijarRuta('ventas');
    }
    renderShell(usuario, ruta);
    document.title = vista.titulo + ' · POS';
    var contenedor = document.getElementById('contenido');
    try {
      vista.render(contenedor, usuario);
    } catch (err) {
      contenedor.innerHTML = '<div class="tarjeta"><h2>Error</h2><p>' + U.esc(err.message) + '</p></div>';
      if (global.console) global.console.error(err);
    }
  };

  function iniciar() {
    try {
      POS.sembrar();
    } catch (err) {
      U.error(err);
    }
    global.addEventListener('hashchange', function () {
      rutaEstado = null;
      App.renderizar();
    });
    // Los enlaces internos (href="#/ruta") navegan sin depender del hash.
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#/"]') : null;
      if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      var lateral = document.getElementById('lateral');
      if (lateral) lateral.classList.remove('abierto');
      App.ir(a.getAttribute('href').replace(/^#\//, ''));
    });
    // Otra pestaña modificó los datos: descartar la caché.
    global.addEventListener('storage', function (e) {
      if (e.key === DB.CLAVE || e.key === null) DB.invalidar();
    });
    App.renderizar();
  }

  global.App = App;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else setTimeout(iniciar, 0);
})(window);
