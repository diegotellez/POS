/* Soporte: reportar errores, pedir mejoras o reportes nuevos al proveedor, y ver su estado. */
(function () {
  'use strict';

  function canal(c) {
    if (c.url && c.whatsapp) return 'Se envía automáticamente al buzón del proveedor y se abre WhatsApp (+' + U.esc(c.whatsapp) + ') para agregar pantallazos.';
    if (c.url) return 'Se envía automáticamente al buzón del proveedor.';
    if (c.whatsapp) return 'Se abre WhatsApp con el mensaje listo para ' + U.esc(c.nombre) + ' (+' + U.esc(c.whatsapp) + '): solo falta tocar Enviar. Puede adjuntar pantallazos en el chat.';
    if (c.correo) return 'Se abre el correo con el mensaje listo para ' + U.esc(c.correo) + '.';
    return '<span class="alerta">Aún no hay un contacto del proveedor configurado: el mensaje se copiará para pegarlo donde lo necesite.</span>';
  }

  function etiquetaEstado(x) {
    var e = Soporte.estado(x);
    return '<span class="etiqueta' + (e.clase === 'alerta' ? ' etiqueta-alerta' : e.clase === 'ok' ? '' : ' etiqueta-cambio') + '">' + U.esc(e.texto) + '</span>';
  }

  function render(cont, usuario) {
    var c = Soporte.contacto();
    var esAdmin = usuario.rol === 'ADMINISTRADOR';
    var solicitudes = Soporte.solicitudes();
    var errores = Soporte.errores();
    var html =
      '<section class="tarjeta">' +
      '<h2>' + U.icono('chat') + ' Reportar o solicitar</h2>' +
      '<p class="tenue pequeno">Reporte un error, pida una mejora o un reporte nuevo. El proveedor lo revisa, lo implementa y lo publica; ' +
      'cuando llegue la actualización, aquí verá la solicitud como <b>Publicada</b>.</p>' +
      '<form id="form-soporte">' +
      '<div class="fila-doble">' +
      '<label class="campo"><span>Tipo</span><select name="tipo">' +
      Object.keys(Soporte.TIPOS).map(function (k) { return '<option value="' + k + '">' + U.esc(Soporte.TIPOS[k]) + '</option>'; }).join('') +
      '</select></label>' +
      '<label class="campo"><span>Título</span><input name="titulo" maxlength="120" required placeholder="Ej. El cajón no abre al pagar con Nequi"></label>' +
      '</div>' +
      '<label class="campo"><span>Descripción</span><textarea name="descripcion" rows="4" required placeholder="Qué estaba haciendo, qué pasó y qué esperaba. Para un reporte: qué datos necesita ver."></textarea></label>' +
      '<label class="check"><input type="checkbox" name="urgente"> Urgente (no puedo seguir vendiendo)</label> ' +
      '<label class="check"><input type="checkbox" name="tecnica" checked> Incluir información técnica (versión, navegador, configuración y últimos errores; no incluye ventas ni contraseñas)</label>' +
      '<p class="tenue pequeno">' + canal(c) + '</p>' +
      '<div class="acciones-reporte"><button class="boton boton-primario" type="submit">' + U.icono('chat') + ' Enviar al proveedor</button></div>' +
      '</form></section>';

    html += '<section class="tarjeta"><h2>Mis solicitudes</h2>' +
      '<div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Código</th><th>Fecha</th><th>Tipo</th><th>Título</th><th>Estado</th><th></th></tr></thead><tbody>' +
      (solicitudes.length ? solicitudes.map(function (s) {
        return '<tr><td><code>' + U.esc(s.codigo) + '</code></td><td>' + U.esc(s.fecha) + '</td><td>' + U.esc(Soporte.TIPOS[s.tipo] || s.tipo) + (s.urgente ? ' <span class="etiqueta etiqueta-alerta">Urgente</span>' : '') + '</td>' +
          '<td>' + U.esc(s.titulo) + '</td><td>' + etiquetaEstado(s) + '</td>' +
          '<td>' + (s.estado === 'publicada' ? '' : '<button type="button" class="boton boton-texto" data-reenviar="' + U.esc(s.codigo) + '">Reenviar</button>') + '</td></tr>';
      }).join('') : '<tr><td colspan="6" class="tenue vacio">Aún no ha enviado solicitudes.</td></tr>') +
      '</tbody></table></div></section>';

    if (esAdmin) {
      html += '<section class="tarjeta"><h2>' + U.icono('alerta') + ' Errores detectados automáticamente</h2>' +
        '<p class="tenue pequeno">Cuando algo falla, el POS lo registra y avisa al proveedor' + (c.url ? ' automáticamente' : ' (botón Avisar)') + '.' +
        (Soporte.pendientes() ? ' Hay ' + Soporte.pendientes() + ' aviso(s) esperando conexión a internet.' : '') + '</p>' +
        '<div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Código</th><th>Última vez</th><th>Error</th><th class="num">Veces</th><th>Estado</th><th></th></tr></thead><tbody>' +
        (errores.length ? errores.map(function (e) {
          return '<tr><td><code>' + U.esc(e.codigo) + '</code></td><td>' + U.esc(e.ultima) + '</td>' +
            '<td>' + U.esc(e.mensaje) + '<br><small class="tenue">' + U.esc([e.contexto, e.lugar, 'v' + e.version].filter(Boolean).join(' · ')) + '</small></td>' +
            '<td class="num">' + e.veces + '</td><td>' + etiquetaEstado(e) + '</td>' +
            '<td><button type="button" class="boton boton-texto" data-avisar="' + U.esc(e.codigo) + '">Avisar</button></td></tr>';
        }).join('') : '<tr><td colspan="6" class="tenue vacio">Sin errores registrados.</td></tr>') +
        '</tbody></table></div>' +
        (errores.length ? '<div class="acciones-reporte"><button type="button" class="boton boton-secundario" id="btn-borrar-errores">' + U.icono('borrar') + ' Borrar la lista</button></div>' : '') +
        '</section>';
    }
    cont.innerHTML = html;

    var f = U.$('#form-soporte', cont);
    f.tipo.addEventListener('change', function () { f.tecnica.checked = f.tipo.value === 'error' || f.tecnica.checked; });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      try {
        var s = Soporte.crearSolicitud(U.leerForm(f));
        var via = Soporte.contacto().url && !Soporte.contacto().whatsapp ? 'buzón' : Soporte.enviarSolicitud(s.codigo);
        U.aviso('Solicitud ' + s.codigo + ' registrada' + (via === 'copiado' ? '. Pegue el mensaje copiado para enviarlo.' : ' y enviada.'), 'ok', 7000);
        render(cont, usuario);
      } catch (err) { U.error(err); }
    });
    U.$$('[data-reenviar]', cont).forEach(function (b) {
      b.addEventListener('click', function () { Soporte.enviarSolicitud(b.getAttribute('data-reenviar')); render(cont, usuario); });
    });
    U.$$('[data-avisar]', cont).forEach(function (b) {
      b.addEventListener('click', function () { Soporte.enviarError(b.getAttribute('data-avisar')); render(cont, usuario); });
    });
    var bb = U.$('#btn-borrar-errores', cont);
    if (bb) bb.addEventListener('click', function () {
      U.confirmar('¿Borrar la lista de errores de este equipo? Al proveedor ya le llegaron los avisos enviados.', function () {
        Soporte.borrarErrores();
        render(cont, usuario);
      }, 'Borrar');
    });
    // Revisa si el proveedor publicó algo de lo solicitado.
    Soporte.actualizarDesdeServidor().then(function (v) {
      if (v && document.body.contains(f) && JSON.stringify(Soporte.contacto()) !== JSON.stringify(c)) render(cont, usuario);
    }, function () {});
  }

  App.registrar('soporte', { titulo: 'Soporte', icono: 'chat', render: render });
})();
