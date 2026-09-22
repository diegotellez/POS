/*
 * Carga rápida de precios (solo administrador): tabla para escribir precio y
 * escanear código de barras producto por producto, y carga desde texto
 * (mensajes o audios transcritos de WhatsApp).
 */
(function () {
  'use strict';

  var filtros = { texto: '', categoria: '', soloSinPrecio: true };

  function render(cont) {

    cont.innerHTML =
      '<section class="tarjeta">' +
      '<div class="encabezado"><h2>' + U.icono('etiqueta') + ' Precios</h2>' +
      '<button class="boton boton-primario" id="btn-texto">' + U.icono('chat') + ' Cargar desde WhatsApp o texto</button></div>' +
      '<div class="uso" id="p-progreso"></div>' +
      '<p class="tenue pequeno">Escribe el precio y presiona <kbd>Enter</kbd> para pasar al siguiente. ' +
      'Para asignar el código de barras, haz clic en su casilla y escanea el producto.</p>' +
      '<div class="filtros">' +
      '<label class="campo crece"><span>Buscar</span><input id="p-texto" autocomplete="off" placeholder="Nombre del producto"></label>' +
      '<label class="campo"><span>Categoría</span><select id="p-categoria"><option value="">Todas</option>' +
      POS.Categorias.listar().map(function (c) { return '<option value="' + c.id + '">' + U.esc(c.nombre) + '</option>'; }).join('') +
      '</select></label>' +
      '<label class="check"><input type="checkbox" id="p-sin-precio"> Solo sin precio</label>' +
      '</div>' +
      '<div class="tabla-contenedor"><table class="tabla tabla-precios"><thead><tr>' +
      '<th>Producto</th><th>Código de barras</th><th class="num">Precio</th><th></th>' +
      '</tr></thead><tbody id="filas"></tbody></table></div>' +
      '<p class="tenue pequeno" id="p-pie"></p>' +
      '</section>';

    U.$('#p-texto', cont).value = filtros.texto;
    U.$('#p-categoria', cont).value = filtros.categoria;
    U.$('#p-sin-precio', cont).checked = filtros.soloSinPrecio;

    var tbody = U.$('#filas', cont);

    function actualizarProgreso() {
      var todos = POS.Productos.listar({ soloActivos: true });
      var conPrecio = todos.filter(function (p) { return p.precio_venta > 0; }).length;
      var pct = todos.length ? Math.round((conPrecio / todos.length) * 100) : 0;
      U.$('#p-progreso', cont).innerHTML =
        '<div class="uso-barra"><span style="width:' + pct + '%"></span></div>' +
        '<small class="tenue"><strong>' + conPrecio + '</strong> de ' + todos.length + ' productos con precio (' + pct + '%)</small>';
    }

    function subcategorias(id) {
      var ids = [Number(id)];
      var cats = POS.Categorias.listar();
      for (var i = 0; i < ids.length; i++) {
        cats.forEach(function (c) { if (c.categoria_padre_id === ids[i]) ids.push(c.id); });
      }
      return ids;
    }

    function pintar() {
      var t = filtros.texto.trim().toLowerCase();
      var cats = filtros.categoria ? subcategorias(filtros.categoria) : null;
      var lista = POS.Productos.listar({ soloActivos: true }).filter(function (p) {
        if (filtros.soloSinPrecio && p.precio_venta > 0) return false;
        if (cats && cats.indexOf(p.categoria_id) === -1) return false;
        return !t || p.nombre.toLowerCase().indexOf(t) !== -1 || (p.codigo_barras || '').indexOf(t) !== -1;
      });
      var visibles = lista.slice(0, 300);
      tbody.innerHTML = visibles.length
        ? visibles.map(function (p) {
          return '<tr data-id="' + p.id + '">' +
            '<td><div>' + U.esc(p.nombre) + '</div><small class="tenue">' + U.esc(p.categoria_nombre || 'Sin categoría') + ' · ' + U.esc(p.codigo_interno) + '</small></td>' +
            '<td><input class="in-codigo" id="cod-' + p.id + '" value="' + U.esc(p.codigo_barras || '') + '" placeholder="Escanear" autocomplete="off" aria-label="Código de barras de ' + U.esc(p.nombre) + '"></td>' +
            '<td class="num"><input class="in-precio" id="pre-' + p.id + '" type="number" min="0" step="50" inputmode="numeric" value="' + (p.precio_venta || '') + '" placeholder="0" aria-label="Precio de ' + U.esc(p.nombre) + '"></td>' +
            '<td class="estado-fila" aria-live="polite"></td></tr>';
        }).join('')
        : '<tr><td colspan="4" class="tenue vacio">' + (filtros.soloSinPrecio ? '¡Todos los productos de este filtro ya tienen precio!' : 'No hay productos.') + '</td></tr>';
      U.$('#p-pie', cont).textContent = lista.length > 300 ? 'Se muestran 300 de ' + lista.length + '. Usa el buscador o la categoría para ver el resto.' : lista.length + ' producto(s).';
    }

    function marcar(fila, ok, texto) {
      var celda = U.$('.estado-fila', fila);
      celda.innerHTML = ok ? U.icono('ok', 'ok') : '';
      celda.title = texto || '';
      fila.classList.toggle('fila-guardada', !!ok);
      actualizarProgreso();
    }

    function guardar(input) {
      var fila = input.closest('tr');
      var id = Number(fila.getAttribute('data-id'));
      var actual = POS.Productos.obtener(id);
      try {
        if (input.classList.contains('in-precio')) {
          var valor = input.value === '' ? 0 : Number(input.value);
          if (!isFinite(valor) || valor < 0) throw new Error('Precio inválido');
          if (valor === actual.precio_venta) return true;
          POS.Productos.actualizar(id, { precioVenta: valor });
          marcar(fila, valor > 0, 'Guardado');
        } else {
          var codigo = input.value.trim();
          if (codigo === (actual.codigo_barras || '')) return true;
          POS.Productos.actualizar(id, { codigoBarras: codigo });
          marcar(fila, true, 'Código guardado');
        }
        return true;
      } catch (err) {
        U.error(err);
        input.value = input.classList.contains('in-precio') ? (actual.precio_venta || '') : (actual.codigo_barras || '');
        return false;
      }
    }

    tbody.addEventListener('change', function (e) {
      if (e.target.matches('.in-precio, .in-codigo')) guardar(e.target);
    });

    tbody.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.keyCode !== 13) return;
      var input = e.target;
      if (!input.matches('.in-precio, .in-codigo')) return;
      e.preventDefault();
      if (!guardar(input)) return;
      var fila = input.closest('tr');
      if (input.classList.contains('in-codigo')) {
        // Escaneó el código: sigue el precio del mismo producto.
        U.$('.in-precio', fila).focus();
        U.$('.in-precio', fila).select();
        return;
      }
      var siguiente = fila.nextElementSibling;
      while (siguiente && !U.$('.in-precio', siguiente)) siguiente = siguiente.nextElementSibling;
      if (siguiente) {
        var campo = U.$('.in-precio', siguiente);
        campo.focus();
        campo.select();
      }
    });

    U.$('#p-texto', cont).addEventListener('input', function (e) { filtros.texto = e.target.value; pintar(); });
    U.$('#p-categoria', cont).addEventListener('change', function (e) { filtros.categoria = e.target.value; pintar(); });
    U.$('#p-sin-precio', cont).addEventListener('change', function (e) { filtros.soloSinPrecio = e.target.checked; pintar(); });
    U.$('#btn-texto', cont).addEventListener('click', function () {
      cargarDesdeTexto(function () { render(cont); });
    });

    actualizarProgreso();
    pintar();
    var primero = U.$('.in-precio', tbody);
    if (primero) primero.focus();
  }

  // ---------- Carga desde texto / WhatsApp ----------
  var EJEMPLO = 'Dolex niños 10+, 14 mil\nAdvil max a 8.500. Noxpirin 3500\nBuscapina catorce mil quinientos';

  function cargarDesdeTexto(alTerminar) {
    var borrador = '';
    U.modal({
      titulo: 'Cargar precios desde WhatsApp o texto',
      cuerpo: '<div id="paso"></div>',
      botones: [{ texto: 'Cerrar', clase: 'boton-secundario' }],
      alAbrir: function (raiz, cerrar) {
        U.$('.modal', raiz).classList.add('modal-ancho');
        var paso = U.$('#paso', raiz);

        function pasoTexto() {
          paso.innerHTML =
            '<p class="tenue pequeno">Pega los mensajes con productos y precios, uno o varios por renglón. ' +
            'Para un audio de WhatsApp: mantenlo presionado → <strong>Transcribir</strong>, copia el texto y pégalo aquí. ' +
            'Entiende "14 mil", "14.000", "14k", "14 lucas" y precios en palabras ("catorce mil quinientos").</p>' +
            '<label class="campo"><span>Mensajes</span><textarea id="txt-precios" rows="8" placeholder="' + U.esc(EJEMPLO) + '"></textarea></label>' +
            '<div class="acciones-reporte"><button type="button" class="boton boton-primario" id="btn-interpretar">Interpretar</button>' +
            '<button type="button" class="boton boton-texto" id="btn-ejemplo">Probar con un ejemplo</button></div>';
          var txt = U.$('#txt-precios', paso);
          txt.value = borrador;
          txt.focus();
          U.$('#btn-ejemplo', paso).addEventListener('click', function () { txt.value = EJEMPLO; });
          U.$('#btn-interpretar', paso).addEventListener('click', function () {
            borrador = txt.value;
            var items = PreciosTexto.interpretar(borrador);
            if (!items.length) {
              U.aviso('No encontré productos con precio en el texto.', 'error');
              return;
            }
            pasoRevision(items);
          });
        }

        function pasoRevision(items) {
          var productos = POS.Productos.listar({ soloActivos: true });
          var filas = items.map(function (it, i) {
            var cand = PreciosTexto.coincidencias(it.nombre, productos, 4);
            var mejor = cand[0];
            var dudoso = cand.length > 1 && cand[0].puntaje - cand[1].puntaje < 0.05;
            var seguro = mejor && mejor.puntaje >= PreciosTexto.UMBRAL_SEGURO;
            var elegido = it.precio === null ? 'ignorar' : seguro ? String(mejor.producto.id) : 'nuevo';
            var opciones = cand.map(function (c) {
              return '<option value="' + c.producto.id + '"' + (elegido === String(c.producto.id) ? ' selected' : '') + '>' +
                U.esc(c.producto.nombre) + (c.producto.precio_venta ? ' (hoy ' + U.dinero(c.producto.precio_venta) + ')' : '') + '</option>';
            }).join('') +
              '<option value="nuevo"' + (elegido === 'nuevo' ? ' selected' : '') + '>+ Crear producto nuevo: ' + U.esc(it.nombre) + '</option>' +
              '<option value="ignorar"' + (elegido === 'ignorar' ? ' selected' : '') + '>No cargar este renglón</option>';
            var estado = elegido === 'ignorar' ? 'Sin precio' : seguro && !dudoso ? 'Coincide' : 'Revisar';
            return '<tr class="' + (estado === 'Revisar' ? 'fila-revisar' : '') + '">' +
              '<td><div>' + U.esc(it.original) + '</div><span class="etiqueta ' + (estado === 'Coincide' ? '' : 'etiqueta-alerta') + '">' + estado + '</span></td>' +
              '<td><select id="sel-' + i + '" data-i="' + i + '" aria-label="Producto para ' + U.esc(it.nombre) + '">' + opciones + '</select></td>' +
              '<td class="num"><input id="pr-' + i + '" type="number" min="0" step="50" value="' + (it.precio || '') + '" aria-label="Precio"></td></tr>';
          }).join('');
          paso.innerHTML =
            '<p class="tenue pequeno">Revisa cada renglón. Los marcados <strong>Revisar</strong> no tienen una coincidencia clara: elige el producto correcto o créalo como nuevo.</p>' +
            '<div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Texto detectado</th><th>Producto</th><th class="num">Precio</th></tr></thead>' +
            '<tbody>' + filas + '</tbody></table></div>' +
            '<div class="acciones-reporte">' +
            '<button type="button" class="boton boton-secundario" id="btn-volver">Volver al texto</button>' +
            '<button type="button" class="boton boton-primario" id="btn-aplicar">Guardar precios</button></div>';

          U.$('#btn-volver', paso).addEventListener('click', pasoTexto);
          U.$('#btn-aplicar', paso).addEventListener('click', function () {
            var actualizados = 0;
            var nuevos = 0;
            var errores = [];
            items.forEach(function (it, i) {
              var destino = U.$('#sel-' + i, paso).value;
              var precio = Number(U.$('#pr-' + i, paso).value);
              if (destino === 'ignorar' || !(precio > 0)) return;
              try {
                if (destino === 'nuevo') {
                  var nombre = it.nombre.charAt(0).toUpperCase() + it.nombre.slice(1);
                  POS.Productos.crear({ nombre: nombre, precioVenta: precio });
                  nuevos++;
                } else {
                  POS.Productos.actualizar(Number(destino), { precioVenta: precio });
                  actualizados++;
                }
              } catch (err) {
                errores.push(it.nombre + ': ' + err.message);
              }
            });
            cerrar();
            U.aviso(actualizados + ' precio(s) actualizados' + (nuevos ? ', ' + nuevos + ' producto(s) nuevos' : '') + '.', 'ok', 5000);
            if (errores.length) U.aviso('No se guardaron: ' + errores.join('; '), 'error', 8000);
            alTerminar();
          });
        }

        pasoTexto();
      }
    });
  }

  App.registrar('precios', { titulo: 'Precios', icono: 'etiqueta', soloAdmin: true, render: render });
})();
