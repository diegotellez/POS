/* Gestión de usuarios (solo administrador). */
(function () {
  'use strict';

  function render(cont, actual) {
    var cfg = DB.config();
    cont.innerHTML =
      '<section class="tarjeta">' +
      '<h2>Usuarios</h2>' +
      (cfg.primerUso
        ? '<div class="aviso-inline">' + U.icono('alerta', 'alerta') + '<span>Aún se usan las contraseñas de ejemplo (admin123 / cajero123). Cámbialas antes de operar.</span></div>'
        : '') +
      '<div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Usuario</th><th>Rol</th><th>Activo</th><th></th></tr></thead>' +
      '<tbody id="filas"></tbody></table></div>' +
      '<h3>Nuevo usuario</h3>' +
      '<form id="form-usuario" class="form-linea" autocomplete="off">' +
      '<label class="campo"><span>Nombre de usuario</span><input name="nombreUsuario" required autocomplete="off"></label>' +
      '<label class="campo"><span>Contraseña</span><input name="password" type="password" required autocomplete="new-password"></label>' +
      '<label class="campo"><span>Rol</span><select name="rol"><option value="CAJERO">Cajero</option><option value="ADMINISTRADOR">Administrador</option></select></label>' +
      '<button class="boton boton-primario" type="submit">Crear usuario</button>' +
      '</form>' +
      '</section>';

    function pintar() {
      U.$('#filas', cont).innerHTML = POS.Usuarios.listar().map(function (u) {
        var yo = u.id === actual.id;
        return '<tr>' +
          '<td>' + U.esc(u.nombre_usuario) + (yo ? ' <small class="tenue">(tú)</small>' : '') + '</td>' +
          '<td><select data-rol="' + u.id + '"' + (yo ? ' disabled' : '') + '>' +
          '<option value="CAJERO"' + (u.rol === 'CAJERO' ? ' selected' : '') + '>Cajero</option>' +
          '<option value="ADMINISTRADOR"' + (u.rol === 'ADMINISTRADOR' ? ' selected' : '') + '>Administrador</option>' +
          '</select></td>' +
          '<td><label class="interruptor"><input type="checkbox" data-activo="' + u.id + '"' + (u.activo ? ' checked' : '') + (yo ? ' disabled' : '') + '><span></span></label></td>' +
          '<td class="acciones"><button class="boton boton-texto" data-password="' + u.id + '" data-nombre="' + U.esc(u.nombre_usuario) + '">' +
          U.icono('llave') + ' Cambiar contraseña</button></td>' +
          '</tr>';
      }).join('');
    }

    var tbody = U.$('#filas', cont);
    tbody.addEventListener('change', function (e) {
      var el = e.target;
      try {
        if (el.hasAttribute('data-activo')) POS.Usuarios.actualizar(el.getAttribute('data-activo'), { activo: el.checked });
        else if (el.hasAttribute('data-rol')) POS.Usuarios.actualizar(el.getAttribute('data-rol'), { rol: el.value });
        U.aviso('Usuario actualizado', 'ok');
      } catch (err) {
        U.error(err);
      }
      pintar();
    });
    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-password]') : null;
      if (!btn) return;
      var id = btn.getAttribute('data-password');
      U.modal({
        titulo: 'Cambiar contraseña de ' + btn.getAttribute('data-nombre'),
        cuerpo:
          '<label class="campo"><span>Nueva contraseña</span><input name="p1" type="password" autocomplete="new-password"></label>' +
          '<label class="campo"><span>Repetir contraseña</span><input name="p2" type="password" autocomplete="new-password"></label>',
        botones: [
          { texto: 'Cancelar', clase: 'boton-secundario' },
          {
            texto: 'Guardar',
            clase: 'boton-primario',
            accion: function (cerrar, raiz) {
              var d = U.leerForm(raiz);
              if (d.p1 !== d.p2) throw new Error('Las contraseñas no coinciden');
              POS.Usuarios.cambiarPassword(id, d.p1);
              cerrar();
              U.aviso('Contraseña actualizada', 'ok');
              render(cont, actual);
            }
          }
        ]
      });
    });

    var form = U.$('#form-usuario', cont);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      try {
        POS.Usuarios.crear(U.leerForm(form));
        form.reset();
        U.aviso('Usuario creado', 'ok');
        pintar();
      } catch (err) {
        U.error(err);
      }
    });

    pintar();
  }

  App.registrar('usuarios', { titulo: 'Usuarios', icono: 'usuarios', soloAdmin: true, render: render });
})();
