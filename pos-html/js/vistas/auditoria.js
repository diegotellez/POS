/* Registro de auditoría (solo administrador). */
(function () {
  'use strict';

  function render(cont) {
    var registros = POS.Auditoria.listar();
    cont.innerHTML =
      '<section class="tarjeta">' +
      '<h2>Auditoría</h2>' +
      '<p class="tenue">Acciones sensibles: cambios de precio, ajustes de inventario, anulaciones, turnos y usuarios.</p>' +
      '<div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>' +
      (registros.length
        ? registros.map(function (a) {
          return '<tr><td>' + U.esc(a.fecha_hora) + '</td><td>' + U.esc(a.nombre_usuario) + '</td>' +
            '<td><span class="etiqueta">' + U.esc(a.accion) + '</span></td><td>' + U.esc(a.detalle || '') + '</td></tr>';
        }).join('')
        : '<tr><td colspan="4" class="tenue vacio">Sin registros.</td></tr>') +
      '</tbody></table></div>' +
      (registros.length >= 500 ? '<p class="tenue pequeno">Se muestran los 500 registros más recientes.</p>' : '') +
      '</section>';
  }

  App.registrar('auditoria', { titulo: 'Auditoría', icono: 'auditoria', soloAdmin: true, render: render });
})();
