/* Categorías y subcategorías (solo administrador). */
(function () {
  'use strict';

  function render(cont) {
    cont.innerHTML =
      '<section class="tarjeta">' +
      '<h2>Categorías</h2>' +
      '<form id="form-nueva" class="form-linea">' +
      '<label class="campo"><span>Nueva categoría</span><input name="nombre" required></label>' +
      '<label class="campo"><span>Categoría padre (opcional)</span><select name="categoriaPadreId" id="padre-nueva"></select></label>' +
      '<button class="boton boton-primario" type="submit">' + U.icono('mas') + ' Agregar</button>' +
      '</form>' +
      '<div id="arbol" class="arbol"></div>' +
      '</section>';

    var form = U.$('#form-nueva', cont);

    function opciones(excluirId, seleccion) {
      return '<option value="">Ninguna (categoría raíz)</option>' + POS.Categorias.listar()
        .filter(function (c) { return c.id !== excluirId; })
        .map(function (c) {
          return '<option value="' + c.id + '"' + (c.id === seleccion ? ' selected' : '') + '>' + U.esc(c.nombre) + '</option>';
        }).join('');
    }

    function pintar() {
      var todas = POS.Categorias.listar();
      var conteo = {};
      POS.Productos.listar().forEach(function (p) {
        if (p.categoria_id) conteo[p.categoria_id] = (conteo[p.categoria_id] || 0) + 1;
      });
      U.$('#padre-nueva', cont).innerHTML = opciones(null, null);

      function fila(c, nivel) {
        return '<div class="fila-categoria" style="padding-left:' + (12 + nivel * 24) + 'px" data-id="' + c.id + '">' +
          '<span>' + (nivel ? '↳ ' : '') + U.esc(c.nombre) + ' <small class="tenue">(' + (conteo[c.id] || 0) + ' productos)</small></span>' +
          '<span class="acciones">' +
          '<button class="boton-icono" data-editar="' + c.id + '" aria-label="Editar" title="Editar">' + U.icono('editar') + '</button>' +
          '<button class="boton-icono" data-eliminar="' + c.id + '" aria-label="Eliminar" title="Eliminar">' + U.icono('borrar') + '</button>' +
          '</span></div>' +
          todas.filter(function (h) { return h.categoria_padre_id === c.id; }).map(function (h) { return fila(h, nivel + 1); }).join('');
      }

      var ids = {};
      todas.forEach(function (c) { ids[c.id] = true; });
      var raiz = todas.filter(function (c) { return !c.categoria_padre_id || !ids[c.categoria_padre_id]; });
      U.$('#arbol', cont).innerHTML = raiz.length
        ? raiz.map(function (c) { return fila(c, 0); }).join('')
        : '<p class="tenue vacio">Aún no hay categorías.</p>';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      try {
        POS.Categorias.crear(U.leerForm(form));
        form.reset();
        U.aviso('Categoría creada', 'ok');
        pintar();
        form.nombre.focus();
      } catch (err) {
        U.error(err);
      }
    });

    U.$('#arbol', cont).addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button') : null;
      if (!btn) return;
      var id = Number(btn.getAttribute('data-editar') || btn.getAttribute('data-eliminar'));
      var c = POS.Categorias.listar().filter(function (x) { return x.id === id; })[0];
      if (!c) return;
      if (btn.hasAttribute('data-editar')) {
        U.modal({
          titulo: 'Editar categoría',
          cuerpo:
            '<label class="campo"><span>Nombre</span><input name="nombre" value="' + U.esc(c.nombre) + '"></label>' +
            '<label class="campo"><span>Categoría padre</span><select name="categoriaPadreId">' + opciones(c.id, c.categoria_padre_id) + '</select></label>',
          botones: [
            { texto: 'Cancelar', clase: 'boton-secundario' },
            {
              texto: 'Guardar',
              clase: 'boton-primario',
              accion: function (cerrar, raiz) {
                POS.Categorias.actualizar(c.id, U.leerForm(raiz));
                cerrar();
                pintar();
              }
            }
          ]
        });
      } else {
        U.confirmar('¿Eliminar la categoría "' + c.nombre + '"? Sus productos quedarán sin categoría.', function () {
          POS.Categorias.eliminar(c.id);
          pintar();
        }, 'Eliminar');
      }
    });

    pintar();
  }

  App.registrar('categorias', { titulo: 'Categorías', icono: 'categoria', soloAdmin: true, render: render });
})();
