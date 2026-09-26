/* Punto de venta: búsqueda/escaneo, carrito y cobro. */
(function () {
  'use strict';

  var EPSILON = 0.01;
  // El ticket en curso se guarda en el navegador: sobrevive a cambios de
  // pantalla, a recargar la página y a cerrar sesión, hasta que se cobre o vacíe.
  var CLAVE_CARRITO = 'pos_html_carrito';
  var carrito = leerCarrito();
  var categoriaVenta = 0; // categoría principal elegida en la lista de productos (0 = todas)

  function leerCarrito() {
    try {
      var guardado = JSON.parse(window.localStorage.getItem(CLAVE_CARRITO) || '[]');
      return Array.isArray(guardado) ? guardado : [];
    } catch (e) {
      return [];
    }
  }

  function guardarCarrito() {
    try {
      if (carrito.length) window.localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
      else window.localStorage.removeItem(CLAVE_CARRITO);
    } catch (e) {
      /* sin almacenamiento: el ticket vive solo mientras la pestaña esté abierta */
    }
  }

  function totalCarrito() {
    return U.redondear(carrito.reduce(function (a, i) { return a + i.precioUnitario * i.cantidad; }, 0));
  }

  function render(cont, usuario) {
    var esAdmin = usuario && usuario.rol === 'ADMINISTRADOR';
    var turno = POS.Turnos.actual();
    cont.innerHTML =
      '<div class="venta-layout">' +
      '<section class="tarjeta columna-productos">' +
      '<label class="campo campo-busqueda">' +
      '<span>Buscar o escanear producto</span>' +
      '<div class="con-icono">' + U.icono('buscar') +
      '<input id="busqueda" placeholder="Nombre, código de barras o código interno" autocomplete="off"></div>' +
      '</label>' +
      (!turno
        ? '<div class="aviso-inline">' + U.icono('alerta', 'alerta') +
          '<span>No hay un turno de caja abierto.</span>' +
          '<a class="boton boton-texto" href="#/turno">Abrir turno</a></div>'
        : '<p class="tenue pequeno">Turno #' + turno.id + ' abierto desde ' + U.esc(turno.fecha_hora_apertura) + '</p>') +
      (esAdmin ? '<button type="button" class="boton boton-texto enlace-nuevo" id="btn-nuevo-producto">' + U.icono('mas') + ' Agregar producto nuevo</button>' : '') +
      '<div id="chips-categorias" class="chips" role="toolbar" aria-label="Filtrar por categoría"></div>' +
      '<div id="resultados" class="lista-resultados"></div>' +
      '</section>' +
      '<section class="tarjeta columna-carrito">' +
      '<h2>Ticket</h2>' +
      '<div id="carrito" class="lista-carrito"></div>' +
      '<div class="total-carrito"><span>Total</span><span class="monto-total" id="total">' + U.dinero(0) + '</span></div>' +
      '<div class="acciones-carrito">' +
      '<button class="boton boton-secundario" id="btn-vaciar">Vaciar</button>' +
      '<button class="boton boton-primario boton-pill" id="btn-cobrar">' + U.icono('ok') + ' Cobrar <kbd>F2</kbd></button>' +
      '</div>' +
      '</section>' +
      '</div>';

    var input = U.$('#busqueda', cont);
    var resultados = U.$('#resultados', cont);
    var listaActual = [];
    var chips = U.$('#chips-categorias', cont);

    // Categorías principales (raíz) con productos activos; cada una incluye sus subcategorías.
    var categorias = POS.Categorias.listar();
    function raizDe(id) {
      var c = categorias.filter(function (x) { return x.id === id; })[0];
      while (c && c.categoria_padre_id) {
        var padre = categorias.filter(function (x) { return x.id === c.categoria_padre_id; })[0];
        if (!padre) break;
        c = padre;
      }
      return c || null;
    }
    var conteo = {};
    POS.Productos.listar({ soloActivos: true }).forEach(function (p) {
      var r = p.categoria_id ? raizDe(p.categoria_id) : null;
      if (r) conteo[r.id] = (conteo[r.id] || 0) + 1;
    });
    var raices = categorias.filter(function (c) { return !c.categoria_padre_id && conteo[c.id]; });
    if (categoriaVenta && !conteo[categoriaVenta]) categoriaVenta = 0;

    function pintarChips() {
      chips.innerHTML = '<button type="button" class="chip' + (!categoriaVenta ? ' activa' : '') + '" data-cat="0">Todas</button>' +
        raices.map(function (c) {
          return '<button type="button" class="chip' + (categoriaVenta === c.id ? ' activa' : '') + '" data-cat="' + c.id + '">' + U.esc(c.nombre) + '</button>';
        }).join('');
    }
    chips.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-cat]') : null;
      if (!b) return;
      categoriaVenta = Number(b.getAttribute('data-cat'));
      pintarChips();
      pintarResultados();
      input.focus();
    });

    function enCategoria(p) {
      if (!categoriaVenta) return true;
      var r = p.categoria_id ? raizDe(p.categoria_id) : null;
      return !!r && r.id === categoriaVenta;
    }

    function pintarResultados() {
      var termino = input.value.trim();
      listaActual = termino ? POS.Productos.buscar(termino).filter(enCategoria) : [];
      if (!termino) {
        // Sin búsqueda: con una categoría elegida se ve toda la categoría (primero lo que
        // tiene precio); sin categoría, los productos con precio para vender con clics.
        listaActual = POS.Productos.listar({ soloActivos: true })
          .filter(function (p) { return enCategoria(p) && (categoriaVenta || p.precio_venta > 0); })
          .sort(function (a, b) { return (b.precio_venta > 0) - (a.precio_venta > 0); })
          .slice(0, categoriaVenta ? 150 : 60);
      }
      if (!listaActual.length) {
        resultados.innerHTML = '<div class="vacio"><p class="tenue">No se encontraron productos' + (termino ? ' para "' + U.esc(termino) + '"' : '') + '.</p>' +
          (termino && esAdmin
            ? '<button type="button" class="boton boton-secundario" id="btn-crear-buscado">' + U.icono('mas') + ' Agregar "' + U.esc(termino) + '" como producto nuevo</button>'
            : termino ? '<p class="tenue pequeno">Pide a un administrador que lo cree.</p>' : '') +
          '</div>';
        var btnCrear = U.$('#btn-crear-buscado', resultados);
        if (btnCrear) btnCrear.addEventListener('click', function () { nuevoProducto(termino); });
        return;
      }
      resultados.innerHTML = listaActual.map(function (p, i) {
        var bajo = POS.Productos.stockBajo(p);
        return '<button type="button" class="item-producto" data-i="' + i + '">' +
          '<span class="item-info">' + (p.categoria_nombre ? '<span class="cat-item">' + U.esc(p.categoria_nombre) + '</span>' : '') +
          '<strong>' + U.esc(p.nombre) + '</strong>' +
          '<small class="tenue">' + U.esc(p.codigo_barras || p.codigo_interno) + ' · ' +
          '<span class="' + (bajo ? 'alerta' : '') + '">Stock: ' + p.stock + '</span></small></span>' +
          (p.precio_venta > 0
            ? '<span class="precio">' + U.dinero(p.precio_venta) + '</span>'
            : '<span class="sin-precio">Sin precio</span>') + '</button>';
      }).join('');
    }

    function pintarCarrito() {
      var lista = U.$('#carrito', cont);
      if (!carrito.length) {
        lista.innerHTML = '<p class="tenue vacio">Agrega productos para iniciar la venta.</p>';
      } else {
        lista.innerHTML = carrito.map(function (item, i) {
          var excede = item.cantidad > item.stockDisponible;
          return '<div class="item-carrito">' +
            '<div class="item-info"><div>' + U.esc(item.nombre) + '</div>' +
            '<small class="tenue">' + U.dinero(item.precioUnitario) + ' c/u' +
            (excede ? ' · <span class="alerta">stock disponible: ' + item.stockDisponible + '</span>' : '') + '</small></div>' +
            '<div class="controles-cantidad">' +
            '<button class="boton-icono" data-accion="menos" data-i="' + i + '" aria-label="Restar">' + U.icono('menos') + '</button>' +
            '<input class="cantidad" type="number" min="1" step="1" value="' + item.cantidad + '" data-i="' + i + '" aria-label="Cantidad">' +
            '<button class="boton-icono" data-accion="mas" data-i="' + i + '" aria-label="Sumar">' + U.icono('mas') + '</button>' +
            '</div>' +
            '<div class="subtotal">' + U.dinero(item.precioUnitario * item.cantidad) + '</div>' +
            '<button class="boton-icono" data-accion="quitar" data-i="' + i + '" aria-label="Quitar">' + U.icono('borrar') + '</button>' +
            '</div>';
        }).join('');
      }
      guardarCarrito();
      U.$('#total', cont).textContent = U.dinero(totalCarrito());
      U.$('#btn-cobrar', cont).disabled = !carrito.length;
    }

    function agregar(p) {
      if (!(p.precio_venta > 0)) {
        U.aviso('"' + p.nombre + '" no tiene precio. Un administrador debe asignarlo en Precios.', 'error', 5000);
        input.focus();
        return;
      }
      var existente = carrito.filter(function (i) { return i.productoId === p.id; })[0];
      if (existente) existente.cantidad += 1;
      else carrito.push({ productoId: p.id, nombre: p.nombre, precioUnitario: p.precio_venta, cantidad: 1, stockDisponible: p.stock });
      pintarCarrito();
      input.focus();
    }

    // Crea un producto sin salir de la venta (el ticket en curso no se toca) y lo agrega.
    function nuevoProducto(texto) {
      texto = String(texto || '').trim();
      var esCodigo = /^\d{6,}$/.test(texto);
      FormularioProducto(null, function (p) {
        input.value = '';
        pintarResultados();
        if (p.precio_venta > 0) agregar(p);
        else U.aviso('"' + p.nombre + '" se creó sin precio; asígnalo para poder venderlo.', 'alerta', 5000);
      }, { nombre: esCodigo ? '' : texto, codigoBarras: esCodigo ? texto : '' });
    }
    var btnNuevo = U.$('#btn-nuevo-producto', cont);
    if (btnNuevo) btnNuevo.addEventListener('click', function () { nuevoProducto(input.value); });

    input.addEventListener('input', pintarResultados);

    // El lector de código de barras USB emula teclado: escribe el código y
    // termina con "Enter". Si coincide con un código exacto se agrega directo.
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.keyCode !== 13) return;
      e.preventDefault();
      var codigo = input.value.trim();
      if (!codigo) return;
      var p = POS.Productos.obtenerPorCodigo(codigo);
      if (!p && listaActual.length === 1) p = listaActual[0];
      if (p) {
        agregar(p);
        input.value = '';
        pintarResultados();
      } else {
        U.aviso('No hay un producto con el código "' + codigo + '"', 'error');
        pintarResultados();
        input.select();
      }
    });

    resultados.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-i]') : null;
      if (btn) agregar(listaActual[Number(btn.getAttribute('data-i'))]);
    });

    U.$('#carrito', cont).addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-accion]') : null;
      if (!btn) return;
      var i = Number(btn.getAttribute('data-i'));
      var accion = btn.getAttribute('data-accion');
      if (accion === 'mas') carrito[i].cantidad += 1;
      else if (accion === 'menos') carrito[i].cantidad = Math.max(1, carrito[i].cantidad - 1);
      else if (accion === 'quitar') carrito.splice(i, 1);
      pintarCarrito();
    });

    U.$('#carrito', cont).addEventListener('change', function (e) {
      if (!e.target.classList.contains('cantidad')) return;
      var i = Number(e.target.getAttribute('data-i'));
      var n = Math.floor(Number(e.target.value));
      carrito[i].cantidad = n > 0 ? n : 1;
      pintarCarrito();
    });

    U.$('#btn-vaciar', cont).addEventListener('click', function () {
      if (!carrito.length) return;
      U.confirmar('¿Vaciar el ticket actual?', function () {
        carrito = [];
        pintarCarrito();
      }, 'Vaciar');
    });

    function cobrar() {
      if (!carrito.length) return;
      var t = POS.Turnos.actual();
      if (!t) {
        U.aviso('No hay un turno de caja abierto. Ábrelo antes de vender.', 'error', 4000);
        return;
      }
      abrirDialogoPago(t, totalCarrito(), function () {
        pintarCarrito();
        pintarResultados();
        input.focus();
      });
    }
    U.$('#btn-cobrar', cont).addEventListener('click', cobrar);

    function onTecla(e) {
      if ((e.key === 'F2' || e.keyCode === 113) && !document.querySelector('.modal-fondo')) {
        e.preventDefault();
        cobrar();
      }
    }
    document.addEventListener('keydown', onTecla);
    App.alSalir(function () { document.removeEventListener('keydown', onTecla); });

    pintarChips();
    pintarResultados();
    pintarCarrito();
    input.focus();
  }

  function abrirDialogoPago(turno, total, alTerminar) {
    var pagos = [{ metodoPago: 'EFECTIVO', monto: total }];
    var recibido = '';

    function totalPagado() {
      return U.redondear(pagos.reduce(function (a, p) { return a + U.numero(p.monto); }, 0));
    }

    var cuerpo =
      '<p class="total-venta">Total a pagar: <strong>' + U.dinero(total) + '</strong></p>' +
      '<div id="pagos"></div>' +
      '<button type="button" class="boton boton-texto" id="btn-otro-pago">' + U.icono('mas') + ' Agregar otro método de pago</button>' +
      '<p id="estado-pago"></p>' +
      '<div class="cambio" id="bloque-cambio">' +
      '<label class="campo"><span>Efectivo recibido (para calcular cambio)</span><input type="number" min="0" step="any" id="recibido"></label>' +
      '<p id="cambio" class="tenue"></p></div>' +
      '<details class="cliente"><summary>Datos del cliente (opcional)</summary>' +
      '<div class="fila-doble">' +
      '<label class="campo"><span>Nombre</span><input id="cliente-nombre"></label>' +
      '<label class="campo"><span>Documento</span><input id="cliente-doc"></label>' +
      '</div></details>';

    U.modal({
      titulo: 'Registrar pago',
      cuerpo: cuerpo,
      botones: [
        { texto: 'Cancelar', clase: 'boton-secundario' },
        {
          texto: 'Confirmar venta',
          clase: 'boton-primario',
          accion: function (cerrar, raiz) {
            if (Math.abs(total - totalPagado()) > EPSILON) {
              U.aviso('Los pagos no cuadran con el total.', 'error');
              return;
            }
            var resultado = POS.Ventas.crear({
              turnoCajaId: turno.id,
              items: carrito.map(function (i) { return { productoId: i.productoId, cantidad: i.cantidad }; }),
              pagos: pagos.filter(function (p) { return U.numero(p.monto) > 0; }).map(function (p) {
                return { metodoPago: p.metodoPago, monto: U.numero(p.monto) };
              }),
              cliente: { nombre: U.$('#cliente-nombre', raiz).value, documento: U.$('#cliente-doc', raiz).value }
            });
            cerrar();
            carrito = [];
            U.aviso('Venta #' + resultado.venta.id + ' registrada', 'ok');
            if (resultado.alertasStock.length) {
              U.aviso('Stock bajo: ' + resultado.alertasStock.map(function (a) {
                return a.nombre + (a.agotado ? ' (agotado)' : ' (' + a.stock + ')');
              }).join(', '), 'alerta', 7000);
            }
            ofrecerTicket(resultado.venta);
            alTerminar();
          }
        }
      ],
      alAbrir: function (raiz) {
        var cont = U.$('#pagos', raiz);
        var btnConfirmar = U.$('.boton-primario', raiz);

        function actualizarEstado() {
          var diferencia = U.redondear(total - totalPagado());
          var cuadra = Math.abs(diferencia) <= EPSILON;
          var estado = U.$('#estado-pago', raiz);
          estado.className = cuadra ? 'ok' : 'alerta';
          estado.textContent = cuadra ? 'Los pagos cuadran con el total.' : 'Diferencia: ' + U.dinero(diferencia);
          btnConfirmar.disabled = !cuadra;

          var efectivo = pagos.filter(function (p) { return p.metodoPago === 'EFECTIVO'; })
            .reduce(function (a, p) { return a + U.numero(p.monto); }, 0);
          U.$('#bloque-cambio', raiz).style.display = efectivo > 0 ? '' : 'none';
          var rec = U.numero(recibido);
          U.$('#cambio', raiz).innerHTML = recibido === ''
            ? ''
            : rec >= efectivo
              ? 'Cambio a devolver: <strong>' + U.dinero(rec - efectivo) + '</strong>'
              : '<span class="alerta">Faltan ' + U.dinero(efectivo - rec) + ' en efectivo</span>';
        }

        function pintar() {
          cont.innerHTML = pagos.map(function (p, i) {
            return '<div class="fila-pago">' +
              '<label class="campo"><span>Método</span><select data-i="' + i + '" data-campo="metodo">' +
              POS.Ventas.METODOS_PAGO.map(function (m) {
                return '<option value="' + m + '"' + (m === p.metodoPago ? ' selected' : '') + '>' + m + '</option>';
              }).join('') + '</select></label>' +
              '<label class="campo"><span>Monto</span><input type="number" min="0" step="any" data-i="' + i + '" data-campo="monto" value="' + p.monto + '"></label>' +
              (pagos.length > 1 ? '<button type="button" class="boton-icono" data-quitar="' + i + '" aria-label="Quitar pago">' + U.icono('cerrar') + '</button>' : '') +
              '</div>';
          }).join('');
          actualizarEstado();
        }

        cont.addEventListener('input', function (e) {
          var i = e.target.getAttribute('data-i');
          if (i === null) return;
          if (e.target.getAttribute('data-campo') === 'monto') pagos[i].monto = e.target.value;
          else pagos[i].metodoPago = e.target.value;
          actualizarEstado();
        });
        cont.addEventListener('change', function (e) {
          var i = e.target.getAttribute('data-i');
          if (i !== null && e.target.getAttribute('data-campo') === 'metodo') {
            pagos[i].metodoPago = e.target.value;
            actualizarEstado();
          }
        });
        cont.addEventListener('click', function (e) {
          var btn = e.target.closest ? e.target.closest('[data-quitar]') : null;
          if (!btn) return;
          pagos.splice(Number(btn.getAttribute('data-quitar')), 1);
          pintar();
        });
        U.$('#btn-otro-pago', raiz).addEventListener('click', function () {
          pagos.push({ metodoPago: 'TARJETA', monto: Math.max(U.redondear(total - totalPagado()), 0) });
          pintar();
        });
        U.$('#recibido', raiz).addEventListener('input', function (e) {
          recibido = e.target.value;
          actualizarEstado();
        });
        raiz.addEventListener('keydown', function (e) {
          if ((e.key === 'Enter' || e.keyCode === 13) && e.target.tagName === 'INPUT' && !btnConfirmar.disabled) {
            e.preventDefault();
            btnConfirmar.click();
          }
        });
        pintar();
      }
    });
  }

  function ofrecerTicket(venta) {
    U.modal({
      titulo: 'Venta #' + venta.id + ' registrada',
      cuerpo: '<p>Total: <strong>' + U.dinero(venta.total) + '</strong></p><p class="tenue">¿Deseas imprimir el comprobante?</p>',
      botones: [
        { texto: 'No imprimir', clase: 'boton-secundario' },
        {
          texto: 'Imprimir ticket',
          clase: 'boton-primario',
          accion: function (cerrar) {
            cerrar();
            U.imprimirHTML(POS.Documentos.ticketHTML(venta), 380);
          }
        }
      ]
    });
  }

  App.registrar('ventas', { titulo: 'Ventas', icono: 'venta', render: render });
})();
