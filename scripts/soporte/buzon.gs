/*
 * Buzón de soporte del POS (Google Apps Script, gratis con una cuenta de Google).
 *
 * Recibe los errores y solicitudes que envían los POS de los clientes, los anota
 * en esta hoja de cálculo (pestañas "Errores" y "Solicitudes") y le manda un
 * correo al proveedor. La columna "Estado" es para su propio seguimiento.
 * Instalación: ver LEEME.md en esta misma carpeta.
 */
var CORREO = 'escriba-aqui-su-correo@gmail.com';
var COLUMNAS = ['Recibido', 'Código', 'Negocio', 'Versión', 'Tipo', 'Urgente', 'Título', 'Detalle', 'Información técnica', 'Estado', 'Notas'];
var TIPOS = { error: 'Error', mejora: 'Mejora', reporte: 'Reporte nuevo', otro: 'Otro' };

function doPost(e) {
  var p = JSON.parse(e.postData.contents);
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var nombre = p.tipo === 'error' ? 'Errores' : 'Solicitudes';
  var hoja = libro.getSheetByName(nombre);
  if (!hoja) {
    hoja = libro.insertSheet(nombre);
    hoja.appendRow(COLUMNAS);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, COLUMNAS.length).setFontWeight('bold');
  }
  // El POS reintenta si no hubo internet: no se repite un código ya recibido.
  if (hoja.getLastRow() > 1) {
    var codigos = hoja.getRange(2, 2, hoja.getLastRow() - 1, 1).getValues().map(function (f) { return f[0]; });
    if (codigos.indexOf(p.codigo) >= 0) return ContentService.createTextOutput('repetido');
  }
  var tipo = p.tipo === 'error' ? 'Error automático' : (TIPOS[p.clase] || p.clase || '');
  var tecnica = p.diagnostico ? Object.keys(p.diagnostico).map(function (k) { return k + ': ' + p.diagnostico[k]; }).join('\n') : '';
  if (p.errores && p.errores.length) tecnica += '\nÚltimos errores: ' + p.errores.join(' | ');
  hoja.appendRow([new Date(), p.codigo, p.negocio, p.version, tipo, p.urgente ? 'Sí' : '', p.titulo, p.detalle, tecnica, 'Nueva', ''].map(texto));
  MailApp.sendEmail(CORREO, (p.urgente ? '[URGENTE] ' : '') + 'POS ' + (p.negocio || '') + ' · ' + tipo + ' ' + p.codigo + ': ' + p.titulo,
    tipo + ' ' + p.codigo + '\nNegocio: ' + (p.negocio || '') + ' · versión ' + (p.version || '') + ' · ' + (p.fecha || '') +
    '\n\n' + p.titulo + '\n' + (p.detalle || '') + '\n\n' + tecnica + '\n\nHoja: ' + libro.getUrl());
  return ContentService.createTextOutput('ok');
}

// Evita que un texto que empieza por = + - @ se tome como fórmula.
function texto(v) {
  if (v instanceof Date) return v;
  v = v === undefined || v === null ? '' : String(v);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}
