/*
 * Compras: carga de facturas de proveedor completas.
 *
 * Una factura se arma línea por línea (buscando o escaneando) o se importa
 * (XML de factura electrónica DIAN, o JSON/CSV con las líneas). Cada línea
 * lleva cantidad, bonificación, costo, precio de venta y, si se quiere, lote
 * y vencimiento. El sistema recuerda el código de cada producto en cada
 * proveedor, así que las facturas siguientes se emparejan solas.
 * El borrador se guarda en el navegador mientras se trabaja.
 */
(function () {
  'use strict';

  var CLAVE_BORRADOR = 'pos_html_borrador_compra';

  function borradorVacio() {
    return { proveedorId: '', numero: '', fecha: U.ahora().slice(0, 10), condicion: 'CONTADO', vencimiento: '', lineas: [] };
  }
  function leerBorrador() {
    try {
      var b = JSON.parse(window.localStorage.getItem(CLAVE_BORRADOR) || 'null');
      return b && Array.isArray(b.lineas) ? b : borradorVacio();
    } catch (e) { return borradorVacio(); }
  }
  var borrador = leerBorrador();
  function guardarBorrador() {
    try {
      if (borrador.lineas.length || borrador.numero) window.localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(borrador));
      else window.localStorage.removeItem(CLAVE_BORRADOR);
    } catch (e) { /* sin almacenamiento: el borrador vive mientras la pestaña esté abierta */ }
  }

  // ---------- Búsqueda por palabras (sin tildes): "acicl ungu" encuentra "Aciclovir ... ungüento"
  function normal(t) {
    return String(t || '').toLowerCase().normalize ? String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') : String(t || '').toLowerCase();
  }
  function buscarProductos(termino, limite) {
    var t = normal(termino).trim();
    if (!t) return [];
    var exacto = POS.Productos.obtenerPorCodigo(termino.trim());
    if (exacto) return [exacto];
    if (borrador.proveedorId) {
      var porCodigo = POS.Compras.emparejar(borrador.proveedorId, termino.trim(), '');
      if (porCodigo) return [porCodigo.producto];
    }
    var palabras = t.split(/\s+/);
    return POS.Productos.listar({ soloActivos: true }).filter(function (p) {
      var n = normal(p.nombre) + ' ' + (p.codigo_barras || '') + ' ' + p.codigo_interno;
      return palabras.every(function (w) { return n.indexOf(w) !== -1; });
    }).slice(0, limite || 12);
  }

  // ---------- Emparejar por nombre ----------
  // Compara las palabras del nombre del producto con la descripción de la factura.
  // Las cifras (500 mg, x 10, 15 ml) deben coincidir: así no se confunde la presentación.
  var SINONIMOS = { tabs: 'tab', tabletas: 'tab', tableta: 'tab', tab: 'tab', comprimidos: 'tab', gr: 'g', grs: 'g', jbe: 'jarabe', sol: 'solucion',
    amp: 'ampolla', ampollas: 'ampolla', caps: 'capsula', capsulas: 'capsula', uds: 'und', unidades: 'und', unid: 'und', und: 'und', sobres: 'sobre' };
  var VACIAS = { x: 1, de: 1, la: 1, el: 1, con: 1, y: 1, en: 1, por: 1, rx: 1, caja: 1, cj: 1, cja: 1 };
  function palabras(t) {
    return normal(t).replace(/(\d),(\d)/g, '$1.$2').replace(/[^a-z0-9%.+]+/g, ' ').split(' ').map(function (w) {
      w = w.replace(/^\.+|\.+$/g, '');
      return SINONIMOS[w] || w;
    }).filter(function (w) { return w && !VACIAS[w]; });
  }
  function puntajeFactura(desc, nombre) {
    var d = palabras(desc), n = palabras(nombre);
    if (!n.length || !d.length) return 0;
    var enD = {};
    d.forEach(function (w) { enD[w] = true; });
    if (!enD[n[0]] && !d.some(function (w) { return w.length >= 4 && n[0].length >= 4 && (w.indexOf(n[0]) === 0 || n[0].indexOf(w) === 0); })) return 0;
    var ok = 0, cifrasMal = 0;
    n.forEach(function (w) {
      if (enD[w]) ok++;
      else if (/\d/.test(w)) cifrasMal++;
      else if (w.length >= 4 && d.some(function (x) { return x.length >= 4 && (x.indexOf(w) === 0 || w.indexOf(x) === 0); })) ok += 0.8;
    });
    return cifrasMal ? Math.min(0.5, ok / n.length) : ok / n.length;
  }
  function sugerencias(desc, limite) {
    return POS.Productos.listar({ soloActivos: true })
      .map(function (p) { return { producto: p, puntaje: puntajeFactura(desc, p.nombre) }; })
      .filter(function (r) { return r.puntaje >= 0.4; })
      .sort(function (a, b) { return b.puntaje - a.puntaje; })
      .slice(0, limite || 6);
  }

  // ---------- Importación ----------
  function hijos(nodo, nombre) {
    var r = [];
    if (!nodo) return r;
    for (var i = 0; i < nodo.childNodes.length; i++) {
      var c = nodo.childNodes[i];
      if (c.nodeType === 1 && c.localName === nombre) r.push(c);
    }
    return r;
  }
  function hijo(nodo) {
    for (var i = 1; i < arguments.length && nodo; i++) nodo = hijos(nodo, arguments[i])[0];
    return nodo || null;
  }
  function texto(nodo) { return nodo ? String(nodo.textContent || '').trim() : ''; }

  // Factura electrónica DIAN (UBL 2.1). Acepta el Invoice o el AttachedDocument que lo envuelve.
  function leerXML(contenido) {
    var doc = new DOMParser().parseFromString(contenido, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('El archivo no es un XML válido');
    var raiz = doc.documentElement;
    if (raiz.localName === 'AttachedDocument') {
      var desc = Array.prototype.slice.call(doc.getElementsByTagNameNS('*', 'Description')).map(texto)
        .filter(function (t) { return t.indexOf('<') !== -1 && /Invoice/.test(t); })[0];
      if (!desc) throw new Error('El XML no trae la factura adentro');
      doc = new DOMParser().parseFromString(desc, 'application/xml');
      raiz = doc.documentElement;
    }
    if (raiz.localName !== 'Invoice') throw new Error('El XML no es una factura electrónica');
    var proveedor = hijo(raiz, 'AccountingSupplierParty', 'Party');
    var nombreProv = texto(hijo(proveedor, 'PartyTaxScheme', 'RegistrationName')) || texto(hijo(proveedor, 'PartyName', 'Name'));
    var nit = texto(hijo(proveedor, 'PartyTaxScheme', 'CompanyID'));
    var medio = hijo(raiz, 'PaymentMeans');
    var lineas = hijos(raiz, 'InvoiceLine').map(function (l) {
      var cant = Number(texto(hijo(l, 'InvoicedQuantity'))) || 0;
      var valor = Number(texto(hijo(l, 'LineExtensionAmount'))) || 0;
      var precio = Number(texto(hijo(l, 'Price', 'PriceAmount'))) || 0;
      var item = hijo(l, 'Item');
      var regalo = valor === 0 && precio === 0; // línea de obsequio (bonificación)
      return {
        codigo: texto(hijo(item, 'SellersItemIdentification', 'ID')) || texto(hijo(item, 'StandardItemIdentification', 'ID')),
        ean: texto(hijo(item, 'StandardItemIdentification', 'ID')),
        descripcion: texto(hijo(item, 'Description')),
        cantidad: regalo ? 0 : cant,
        bonificacion: regalo ? cant : 0,
        costo: cant ? Math.round((valor / cant) * 100) / 100 : precio
      };
    });
    return {
      proveedor: nombreProv, nit: nit, numero: texto(hijo(raiz, 'ID')), fecha: texto(hijo(raiz, 'IssueDate')),
      condicion: texto(hijo(medio, 'ID')) === '2' ? 'CREDITO' : 'CONTADO',
      vencimiento: texto(hijo(medio, 'PaymentDueDate')) || texto(hijo(raiz, 'DueDate')),
      lineas: lineas
    };
  }

  // JSON ({lineas:[...]} o [...]) o CSV/TSV con encabezado.
  function leerTexto(contenido) {
    var t = String(contenido || '').trim();
    if (!t) throw new Error('No hay nada para importar');
    if (t.charAt(0) === '<') return leerXML(t);
    if (t.charAt(0) === '{' || t.charAt(0) === '[') {
      var j = JSON.parse(t);
      return Array.isArray(j) ? { lineas: j } : j;
    }
    var filas = t.split(/\r?\n/).filter(Boolean);
    var sep = filas[0].indexOf('\t') !== -1 ? '\t' : filas[0].indexOf(';') !== -1 ? ';' : ',';
    var enc = filas[0].split(sep).map(function (h) { return normal(h).trim(); });
    var campo = function (nombres) { for (var i = 0; i < enc.length; i++) if (nombres.indexOf(enc[i]) !== -1) return i; return -1; };
    var ix = {
      codigo: campo(['codigo', 'cod', 'referencia', 'ref']), ean: campo(['ean', 'codigo de barras', 'barras']),
      descripcion: campo(['descripcion', 'producto', 'nombre']), cantidad: campo(['cantidad', 'cant', 'can']),
      bonificacion: campo(['bonificacion', 'bonif', 'obsequio']), costo: campo(['costo', 'p.neto', 'neto', 'precio', 'p.unit']),
      lote: campo(['lote']), vencimiento: campo(['vencimiento', 'vcto', 'vence']), precioVenta: campo(['precio venta', 'pvp', 'venta'])
    };
    if (ix.descripcion === -1 && ix.codigo === -1) throw new Error('El texto necesita una fila de encabezado con al menos "descripcion" o "codigo"');
    var num = function (v) { return U.numero(String(v || '').replace(/\./g, '').replace(',', '.')) || 0; };
    return {
      lineas: filas.slice(1).map(function (f) {
        var c = f.split(sep);
        var v = function (k) { return ix[k] === -1 ? '' : String(c[ix[k]] || '').trim(); };
        return { codigo: v('codigo'), ean: v('ean'), descripcion: v('descripcion'), cantidad: num(v('cantidad')), bonificacion: num(v('bonificacion')),
          costo: num(v('costo')), lote: v('lote'), vencimiento: v('vencimiento'), precioVenta: num(v('precioVenta')) };
      })
    };
  }

  // Convierte las líneas importadas en líneas del borrador, emparejando productos
  // y juntando la bonificación con la compra del mismo producto.
  function incorporar(datos) {
    if (datos.numero && !borrador.numero) borrador.numero = datos.numero;
    if (datos.fecha) borrador.fecha = POS.Compras.fecha(datos.fecha) || borrador.fecha;
    if (datos.condicion) borrador.condicion = datos.condicion;
    if (datos.vencimiento) borrador.vencimiento = POS.Compras.fecha(datos.vencimiento) || '';
    if (datos.proveedor && !borrador.proveedorId) {
      var pr = POS.Proveedores.listar().filter(function (x) {
        return (datos.nit && x.nit && x.nit.replace(/\D/g, '').indexOf(datos.nit.replace(/\D/g, '').slice(0, 9)) === 0) || normal(x.nombre) === normal(datos.proveedor);
      })[0];
      if (pr) borrador.proveedorId = String(pr.id);
    }
    var nuevas = 0, emparejadas = 0;
    (datos.lineas || []).forEach(function (l) {
      var codigo = String(l.codigo || l.codigoProveedor || '').trim();
      var cant = Number(l.cantidad) || 0, regalo = Number(l.bonificacion) || 0;
      if (!cant && !regalo) return;
      var norm = borrador.proveedorId ? POS.Compras.codigoNormalizado(borrador.proveedorId, codigo) : codigo;
      var existente = norm && borrador.lineas.filter(function (x) {
        return x.codigoProveedor && (borrador.proveedorId ? POS.Compras.codigoNormalizado(borrador.proveedorId, x.codigoProveedor) : x.codigoProveedor) === norm;
      })[0];
      if (existente) {
        existente.cantidad = (Number(existente.cantidad) || 0) + cant;
        existente.bonificacion = (Number(existente.bonificacion) || 0) + regalo;
        if (!existente.costo && l.costo) existente.costo = Number(l.costo);
        if (!existente.lote && l.lote) existente.lote = l.lote;
        if (!existente.vencimiento && l.vencimiento) existente.vencimiento = POS.Compras.fecha(l.vencimiento) || '';
        return;
      }
      var linea = { productoId: null, nombre: '', descripcion: l.descripcion || '', codigoProveedor: codigo, ean: l.ean || '',
        cantidad: cant, bonificacion: regalo, costo: Number(l.costo) || 0, precioVenta: Number(l.precioVenta) || '', lote: l.lote || '',
        vencimiento: POS.Compras.fecha(l.vencimiento) || '', verificado: false, via: '' };
      var e = borrador.proveedorId ? POS.Compras.emparejar(borrador.proveedorId, codigo, l.ean) : null;
      if (!e && l.ean) { var pe = POS.Productos.obtenerPorCodigo(String(l.ean).trim()); if (pe) e = { producto: pe, via: 'ean' }; }
      if (!e && l.descripcion) {
        var c = sugerencias(l.descripcion, 2);
        if (c[0] && c[0].puntaje >= 0.85 && (!c[1] || c[0].puntaje - c[1].puntaje >= 0.15)) e = { producto: c[0].producto, via: 'nombre' };
      }
      if (e) { asignar(linea, e.producto); linea.via = e.via; emparejadas++; }
      borrador.lineas.push(linea);
      nuevas++;
    });
    guardarBorrador();
    return { nuevas: nuevas, emparejadas: emparejadas };
  }

  // "ACICLOVIR 5% UNGUENTO TUBO X 15 G - VITALIS (180)" -> "Aciclovir 5% unguento tubo x 15 g - Vitalis"
  function limpiarNombre(d) {
    var t = String(d || '').replace(/\s*\(\d+\)\s*$/, '').replace(/\s+/g, ' ').trim().toLowerCase();
    t = t.charAt(0).toUpperCase() + t.slice(1);
    return t.replace(/ - ([a-záéíóúñ])/g, function (m, c) { return ' - ' + c.toUpperCase(); });
  }

  function asignar(linea, p) {
    linea.productoId = p.id;
    linea.nombre = p.nombre;
    linea.precioActual = p.precio_venta;
    linea.costoAnterior = p.costo || 0;
    if (!linea.precioVenta) linea.precioVenta = p.precio_venta || '';
  }

  // ---------- Pantalla ----------
  function render(cont) {
    var proveedores = POS.Proveedores.listar();
    var facturas = POS.Compras.listar();
    var pendientes = facturas.filter(function (f) { return f.estado === 'PENDIENTE'; });
    var porVencer = POS.Compras.proximosAVencer(180);

    cont.innerHTML =
      '<section class="tarjeta">' +
      '<h2>' + U.icono('bodega') + ' Cargar factura de compra</h2>' +
      '<p class="tenue pequeno">Agregue cada producto buscándolo o escaneándolo, o importe la factura. El borrador se guarda solo: puede salir y volver sin perderlo.</p>' +
      '<div class="cf-encabezado">' +
      '<label class="campo"><span>Proveedor</span><div class="cf-prov"><select id="cf-proveedor"><option value="">Elija…</option>' +
      proveedores.map(function (p) { return '<option value="' + p.id + '"' + (String(p.id) === String(borrador.proveedorId) ? ' selected' : '') + '>' + U.esc(p.nombre) + '</option>'; }).join('') +
      '</select><button type="button" class="boton boton-texto" id="cf-nuevo-prov">' + U.icono('mas') + ' Nuevo</button></div></label>' +
      '<label class="campo"><span>N.º de factura</span><input id="cf-numero" value="' + U.esc(borrador.numero) + '" placeholder="Ej. FI-1100828977"></label>' +
      '<label class="campo"><span>Fecha</span><input id="cf-fecha" type="date" value="' + U.esc(borrador.fecha) + '"></label>' +
      '<label class="campo"><span>Condición</span><select id="cf-condicion"><option value="CONTADO">Contado</option><option value="CREDITO"' + (borrador.condicion === 'CREDITO' ? ' selected' : '') + '>Crédito</option></select></label>' +
      '<label class="campo cf-vence"><span>Vence el pago</span><input id="cf-vencimiento" type="date" value="' + U.esc(borrador.vencimiento) + '"></label>' +
      '</div>' +
      '<div class="cf-barra">' +
      '<label class="campo campo-busqueda"><span>Buscar o escanear producto (nombre, código de barras o código del proveedor)</span><div class="con-icono">' + U.icono('buscar') +
      '<input id="cf-buscar" autocomplete="off" placeholder="Ej. aciclovir ungu · 7702418000100 · 1000016141"></div></label>' +
      '<div class="cf-importar">' +
      '<label class="boton boton-secundario">' + U.icono('subir') + ' Importar XML / archivo<input type="file" id="cf-archivo" accept=".xml,.json,.csv,.txt,.tsv" hidden></label>' +
      '<button type="button" class="boton boton-secundario" id="cf-pegar">Pegar líneas</button>' +
      '</div></div>' +
      '<div id="cf-resultados" class="lista-resultados cf-resultados"></div>' +
      '<div id="cf-avisos"></div>' +
      '<div id="cf-lineas"></div>' +
      '<div id="cf-pie"></div>' +
      '</section>' +

      (pendientes.length
        ? '<section class="tarjeta"><h2>Facturas a crédito por pagar</h2><div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Proveedor</th><th>Factura</th><th>Vence</th><th class="num">Valor</th><th></th></tr></thead><tbody>' +
          pendientes.map(function (f) {
            var vencida = f.vencimiento && f.vencimiento < U.ahora().slice(0, 10);
            return '<tr><td>' + U.esc(f.proveedor) + '</td><td>' + U.esc(f.numero) + '</td><td class="' + (vencida ? 'alerta' : '') + '">' + U.esc(f.vencimiento || '—') + (vencida ? ' (vencida)' : '') + '</td>' +
              '<td class="num">' + U.dinero(f.total) + '</td><td class="acciones"><button type="button" class="boton boton-texto" data-pagar="' + f.id + '">Registrar pago</button></td></tr>';
          }).join('') + '</tbody></table></div></section>'
        : '') +

      (porVencer.length
        ? '<section class="tarjeta"><h2>' + U.icono('alerta', 'alerta') + ' Próximos a vencer (6 meses)</h2><p class="tenue pequeno">Solo es un aviso: se puede seguir vendiendo. Según los lotes registrados en las facturas.</p>' +
          '<div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Producto</th><th>Lote</th><th>Vence</th><th class="num">Recibidas</th><th class="num">Stock</th></tr></thead><tbody>' +
          porVencer.map(function (l) {
            return '<tr><td>' + U.esc(l.producto) + '</td><td>' + U.esc(l.lote || '—') + '</td><td class="' + (l.vencido ? 'alerta' : '') + '">' + U.esc(l.vencimiento) + (l.vencido ? ' (vencido)' : '') + '</td>' +
              '<td class="num">' + l.cantidad + '</td><td class="num">' + l.stock + '</td></tr>';
          }).join('') + '</tbody></table></div></section>'
        : '') +

      '<section class="tarjeta"><h2>Facturas registradas</h2>' +
      (facturas.length
        ? '<div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Fecha</th><th>Proveedor</th><th>Factura</th><th class="num">Líneas</th><th class="num">Unidades</th><th class="num">Total</th><th>Estado</th></tr></thead><tbody>' +
          facturas.slice(0, 50).map(function (f) {
            return '<tr><td>' + U.esc(f.fecha) + '</td><td>' + U.esc(f.proveedor) + '</td><td>' + U.esc(f.numero) + '</td><td class="num">' + f.lineas.length + '</td>' +
              '<td class="num">' + (f.unidades + f.bonificadas) + (f.bonificadas ? ' <small class="tenue">(' + f.bonificadas + ' bonif.)</small>' : '') + '</td>' +
              '<td class="num">' + U.dinero(f.total) + '</td><td>' + (f.estado === 'PENDIENTE' ? '<span class="etiqueta etiqueta-alerta">POR PAGAR</span>' : '<span class="etiqueta">' + (f.condicion === 'CREDITO' ? 'PAGADA' : 'CONTADO') + '</span>') + '</td></tr>';
          }).join('') + '</tbody></table></div>'
        : '<p class="tenue">Aún no hay facturas registradas.</p>') +
      '</section>';

    var $ = function (s) { return U.$(s, cont); };
    var buscar = $('#cf-buscar');
    var encontrados = [];

    function pintarEncabezado() {
      $('.cf-vence').style.display = $('#cf-condicion').value === 'CREDITO' ? '' : 'none';
    }
    ['#cf-proveedor', '#cf-numero', '#cf-fecha', '#cf-condicion', '#cf-vencimiento'].forEach(function (s) {
      $(s).addEventListener('change', function () {
        borrador.proveedorId = $('#cf-proveedor').value;
        borrador.numero = $('#cf-numero').value.trim();
        borrador.fecha = $('#cf-fecha').value;
        borrador.condicion = $('#cf-condicion').value;
        borrador.vencimiento = $('#cf-vencimiento').value;
        guardarBorrador();
        pintarEncabezado();
      });
    });
    pintarEncabezado();

    $('#cf-nuevo-prov').addEventListener('click', function () {
      U.modal({
        titulo: 'Nuevo proveedor',
        cuerpo: '<label class="campo"><span>Nombre</span><input name="nombre" placeholder="Ej. Distribuidora Farmacéutica Roma"></label>' +
          '<label class="campo"><span>NIT (opcional)</span><input name="nit"></label>' +
          '<label class="check"><input type="checkbox" name="sinPrefijo"> El primer dígito del código indica compra o bonificación (ej. 1000016141 y 2000016141 son el mismo producto)</label>',
        botones: [{ texto: 'Cancelar', clase: 'boton-secundario' }, { texto: 'Guardar', clase: 'boton-primario', accion: function (cerrar, raiz) {
          var pr = POS.Proveedores.guardar({ nombre: U.$('[name=nombre]', raiz).value, nit: U.$('[name=nit]', raiz).value, codigoSinPrefijo: U.$('[name=sinPrefijo]', raiz).checked });
          borrador.proveedorId = String(pr.id);
          guardarBorrador();
          cerrar();
          render(cont);
        } }]
      });
    });

    function pintarResultados() {
      var t = buscar.value.trim();
      encontrados = t ? buscarProductos(t) : [];
      $('#cf-resultados').innerHTML = encontrados.map(function (p, i) {
        return '<button type="button" class="item-producto" data-i="' + i + '"><span class="item-info">' + (p.categoria_nombre ? '<span class="cat-item">' + U.esc(p.categoria_nombre) + '</span>' : '') +
          '<strong>' + U.esc(p.nombre) + '</strong><small class="tenue">' + U.esc(p.codigo_barras || p.codigo_interno) + ' · Stock: ' + p.stock + '</small></span>' +
          '<span class="' + (p.precio_venta > 0 ? 'precio' : 'sin-precio') + '">' + (p.precio_venta > 0 ? U.dinero(p.precio_venta) : 'Sin precio') + '</span></button>';
      }).join('') + (t ? '<button type="button" class="boton boton-texto" id="cf-crear">' + U.icono('mas') + ' Crear producto nuevo "' + U.esc(t) + '"</button>' : '');
      var crear = $('#cf-crear');
      if (crear) crear.addEventListener('click', function () { crearProducto(t, null); });
    }
    buscar.addEventListener('input', pintarResultados);
    buscar.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.keyCode !== 13) return;
      e.preventDefault();
      if (encontrados.length === 1) agregarProducto(encontrados[0], buscar.value.trim());
      else if (!encontrados.length && buscar.value.trim()) U.aviso('No se encontró "' + buscar.value.trim() + '". Puede crearlo como producto nuevo.', 'alerta');
    });
    $('#cf-resultados').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-i]') : null;
      if (b) agregarProducto(encontrados[Number(b.getAttribute('data-i'))], buscar.value.trim());
    });

    // Si se buscó por un código que no es de barras ni interno, se toma como código del proveedor.
    function agregarProducto(p, buscado) {
      var codProv = /^\d{5,}$|^[A-Z0-9-]{4,}$/i.test(buscado) && buscado !== p.codigo_barras && buscado !== p.codigo_interno && !/\s/.test(buscado) ? buscado : '';
      var ya = borrador.lineas.filter(function (l) { return l.productoId === p.id; })[0];
      if (ya) {
        ya.cantidad = (Number(ya.cantidad) || 0) + 1;
      } else {
        ya = { productoId: null, descripcion: '', codigoProveedor: codProv, cantidad: 1, bonificacion: 0, costo: p.costo || 0, precioVenta: '', lote: '', vencimiento: '', verificado: false, via: 'manual' };
        asignar(ya, p);
        borrador.lineas.unshift(ya);
      }
      buscar.value = '';
      $('#cf-resultados').innerHTML = '';
      guardarBorrador();
      pintarLineas();
      var fila = U.$('[data-fila="' + borrador.lineas.indexOf(ya) + '"] [data-c=cantidad]', cont);
      if (fila) { fila.focus(); fila.select(); }
    }

    function crearProducto(texto, linea) {
      var t = String(texto || '').trim();
      var esCodigo = /^\d{8,14}$/.test(t);
      FormularioProducto(null, function (p) {
        if (linea) {
          asignar(linea, p);
          linea.via = 'nuevo';
          guardarBorrador();
          pintarLineas();
        } else {
          agregarProducto(p, '');
        }
      }, { nombre: esCodigo ? '' : limpiarNombre(t), codigoBarras: esCodigo ? t : (linea && linea.ean) || '', sinStock: true });
    }

    function margen(l) {
      var pv = Number(l.precioVenta) || 0, c = Number(l.costo) || 0;
      return pv > 0 && c > 0 ? Math.round(((pv - c) / pv) * 100) : null;
    }

    function pintarLineas() {
      var L = borrador.lineas;
      if (!L.length) {
        $('#cf-lineas').innerHTML = '<p class="tenue vacio">Aún no hay productos en esta factura.</p>';
        $('#cf-pie').innerHTML = '';
        $('#cf-avisos').innerHTML = '';
        return;
      }
      $('#cf-lineas').innerHTML = '<div class="tabla-contenedor"><table class="tabla cf-tabla"><thead><tr>' +
        '<th title="Verificado contra la mercancía">✓</th><th>Producto</th><th class="num">Cant.</th><th class="num">Bonif.</th><th class="num">Costo unit.</th><th class="num">Subtotal</th>' +
        '<th class="num">Precio venta</th><th>Lote</th><th>Vence</th><th></th></tr></thead><tbody>' +
        L.map(function (l, i) {
          var m = margen(l);
          var subiendo = l.costoAnterior && Number(l.costo) > l.costoAnterior + 0.5;
          return '<tr data-fila="' + i + '" class="' + (l.verificado ? 'cf-ok' : '') + (!l.productoId ? ' cf-sin' : '') + '">' +
            '<td><input type="checkbox" data-c="verificado"' + (l.verificado ? ' checked' : '') + ' aria-label="Verificado"></td>' +
            '<td class="cf-prod">' + (l.productoId
              ? '<strong>' + U.esc(l.nombre) + '</strong>' + (l.via === 'nombre' ? ' <span class="etiqueta etiqueta-alerta" title="Emparejado por nombre">revisar</span>' : '') +
                (l.descripcion ? '<br><small class="tenue">' + U.esc(l.descripcion) + '</small>' : '')
              : '<span class="alerta">Sin emparejar:</span> ' + U.esc(l.descripcion || '—') +
                '<br><button type="button" class="boton boton-texto" data-elegir="' + i + '">Elegir producto</button><button type="button" class="boton boton-texto" data-crear="' + i + '">' + U.icono('mas') + ' Crear</button>') +
            '<br><input class="cf-cod" data-c="codigoProveedor" value="' + U.esc(l.codigoProveedor || '') + '" placeholder="Código del proveedor"></td>' +
            '<td class="num"><input type="number" min="0" step="1" data-c="cantidad" value="' + U.esc(l.cantidad) + '"></td>' +
            '<td class="num"><input type="number" min="0" step="1" data-c="bonificacion" value="' + U.esc(l.bonificacion || '') + '" placeholder="0"></td>' +
            '<td class="num"><input type="number" min="0" step="any" data-c="costo" value="' + U.esc(l.costo || '') + '">' +
              (subiendo ? '<br><small class="alerta">antes ' + U.dinero(l.costoAnterior) + '</small>' : '') + '</td>' +
            '<td class="num" data-sub>' + U.dinero((Number(l.cantidad) || 0) * (Number(l.costo) || 0)) + '</td>' +
            '<td class="num"><input type="number" min="0" step="any" data-c="precioVenta" value="' + U.esc(l.precioVenta || '') + '">' +
              '<br><small data-margen class="' + (m !== null && m < 15 ? 'alerta' : 'tenue') + '">' + (m !== null ? 'margen ' + m + '%' : '') + '</small></td>' +
            '<td><input class="cf-lote" data-c="lote" value="' + U.esc(l.lote || '') + '"></td>' +
            '<td><input type="date" data-c="vencimiento" value="' + U.esc(l.vencimiento || '') + '"></td>' +
            '<td><button type="button" class="boton-icono" data-quitar="' + i + '" aria-label="Quitar">' + U.icono('borrar') + '</button></td></tr>';
        }).join('') + '</tbody></table></div>';
      pintarPie();
    }

    function pintarPie() {
      var L = borrador.lineas;
      var total = L.reduce(function (a, l) { return a + (Number(l.cantidad) || 0) * (Number(l.costo) || 0); }, 0);
      var und = L.reduce(function (a, l) { return a + (Number(l.cantidad) || 0); }, 0);
      var bon = L.reduce(function (a, l) { return a + (Number(l.bonificacion) || 0); }, 0);
      var ver = L.filter(function (l) { return l.verificado; }).length;
      var sin = L.filter(function (l) { return !l.productoId; }).length;
      $('#cf-pie').innerHTML = '<div class="cf-resumen">' +
        '<div><span>Líneas</span><strong>' + L.length + '</strong></div>' +
        '<div><span>Unidades</span><strong>' + und + (bon ? ' + ' + bon + ' bonif.' : '') + '</strong></div>' +
        '<div><span>Verificadas</span><strong class="' + (ver === L.length ? 'ok' : '') + '">' + ver + ' de ' + L.length + '</strong></div>' +
        '<div><span>Total (sin IVA)</span><strong>' + U.dinero(total) + '</strong></div></div>' +
        (sin ? '<p class="alerta">Faltan ' + sin + ' línea(s) por emparejar (ver arriba).</p>' : '') +
        '<div class="acciones-reporte"><button type="button" class="boton boton-primario" id="cf-guardar"' + (sin ? ' disabled' : '') + '>' + U.icono('ok') + ' Guardar factura y sumar al inventario</button>' +
        '<button type="button" class="boton boton-secundario" id="cf-todas">Marcar todas verificadas</button>' +
        '<button type="button" class="boton boton-texto boton-peligro" id="cf-descartar">Descartar borrador</button></div>';
      $('#cf-avisos').innerHTML = sin ? '<div class="aviso-inline">' + U.icono('alerta', 'alerta') + '<span>' + sin + ' línea(s) sin emparejar: elija el producto o créelo. ' +
          'Si son productos que aún no tiene en el catálogo, use <b>Crear todos los que faltan</b> (nombre y código de barras de la factura; luego puede ajustar la categoría en Productos).</span>' +
          '<button type="button" class="boton boton-secundario" id="cf-crear-todos">' + U.icono('mas') + ' Crear todos los que faltan</button></div>' : '';
      $('#cf-guardar').addEventListener('click', guardar);
      var bt = $('#cf-crear-todos');
      if (bt) bt.addEventListener('click', function () {
        var faltan = L.filter(function (l) { return !l.productoId; });
        U.confirmar('¿Crear ' + faltan.length + ' producto(s) nuevos con los nombres de la factura?', function () {
          var creados = 0;
          faltan.forEach(function (l) {
            var guia = sugerencias(l.descripcion, 1)[0]; // toma la categoría del producto más parecido
            var ean = String(l.ean || '').replace(/\D/g, '');
            try {
              var p = POS.Productos.crear({ nombre: limpiarNombre(l.descripcion) || 'Producto ' + (l.codigoProveedor || ''), codigoBarras: ean.length >= 8 && !POS.Productos.obtenerPorCodigo(ean) ? ean : '',
                categoriaId: guia ? guia.producto.categoria_id : null, precioVenta: Number(l.precioVenta) || 0, stock: 0, stockMinimo: 0 });
              asignar(l, p);
              l.via = 'nuevo';
              creados++;
            } catch (err) { U.error(err); }
          });
          guardarBorrador();
          pintarLineas();
          U.aviso(creados + ' producto(s) creados. Revise el precio de venta de cada línea.', 'ok', 6000);
        }, 'Crear');
      });
      $('#cf-todas').addEventListener('click', function () { L.forEach(function (l) { l.verificado = true; }); guardarBorrador(); pintarLineas(); });
      $('#cf-descartar').addEventListener('click', function () {
        U.confirmar('¿Descartar la factura en curso? Se pierden las ' + L.length + ' líneas.', function () { borrador = borradorVacio(); guardarBorrador(); render(cont); }, 'Descartar');
      });
    }

    var tabla = $('#cf-lineas');
    tabla.addEventListener('change', function (e) {
      var c = e.target.getAttribute('data-c');
      var fila = e.target.closest('[data-fila]');
      if (!c || !fila) return;
      var l = borrador.lineas[Number(fila.getAttribute('data-fila'))];
      l[c] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      if (c === 'cantidad' || c === 'bonificacion' || c === 'costo' || c === 'precioVenta') l[c] = e.target.value === '' ? '' : Number(e.target.value);
      guardarBorrador();
      if (c === 'verificado') fila.classList.toggle('cf-ok', l.verificado);
      // Solo se actualizan las celdas calculadas: redibujar la tabla le quitaría el foco al usuario.
      U.$('[data-sub]', fila).textContent = U.dinero((Number(l.cantidad) || 0) * (Number(l.costo) || 0));
      var m = margen(l), cm = U.$('[data-margen]', fila);
      cm.textContent = m !== null ? 'margen ' + m + '%' : '';
      cm.className = m !== null && m < 15 ? 'alerta' : 'tenue';
      pintarPie();
    });
    // Enter avanza: cantidad -> costo -> precio venta -> buscador.
    tabla.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.keyCode !== 13) return;
      var c = e.target.getAttribute('data-c');
      var fila = e.target.closest('[data-fila]');
      if (!c || !fila) return;
      e.preventDefault();
      var orden = { cantidad: 'costo', bonificacion: 'costo', costo: 'precioVenta' };
      e.target.dispatchEvent(new Event('change', { bubbles: true }));
      var sig = orden[c] && U.$('[data-fila="' + fila.getAttribute('data-fila') + '"] [data-c="' + orden[c] + '"]', cont);
      if (sig) { sig.focus(); sig.select && sig.select(); } else buscar.focus();
    });
    tabla.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      if (b.hasAttribute('data-quitar')) { borrador.lineas.splice(Number(b.getAttribute('data-quitar')), 1); guardarBorrador(); pintarLineas(); }
      if (b.hasAttribute('data-crear')) { var lc = borrador.lineas[Number(b.getAttribute('data-crear'))]; crearProducto(lc.descripcion, lc); }
      if (b.hasAttribute('data-elegir')) elegir(borrador.lineas[Number(b.getAttribute('data-elegir'))]);
    });

    function elegir(linea) {
      var sugeridos = sugerencias(linea.descripcion || '', 6).map(function (c) { return c.producto; });
      var lista = sugeridos;
      U.modal({
        titulo: 'Elegir producto',
        cuerpo: '<p class="tenue pequeno">Factura: <strong>' + U.esc(linea.descripcion || '') + '</strong>' + (linea.codigoProveedor ? ' · código ' + U.esc(linea.codigoProveedor) : '') + '</p>' +
          '<label class="campo"><span>Buscar</span><input id="el-buscar" autocomplete="off"></label><div id="el-lista" class="lista-resultados cf-resultados"></div>',
        alAbrir: function (raiz, cerrar) {
          function pintar() {
            U.$('#el-lista', raiz).innerHTML = lista.length ? lista.map(function (p, i) {
              return '<button type="button" class="item-producto" data-k="' + i + '"><span class="item-info"><strong>' + U.esc(p.nombre) + '</strong><small class="tenue">Stock: ' + p.stock + '</small></span></button>';
            }).join('') : '<p class="tenue">Sin sugerencias. Escriba para buscar.</p>';
          }
          U.$('#el-buscar', raiz).addEventListener('input', function (e) { lista = e.target.value.trim() ? buscarProductos(e.target.value) : sugeridos; pintar(); });
          U.$('#el-lista', raiz).addEventListener('click', function (e) {
            var b = e.target.closest ? e.target.closest('[data-k]') : null;
            if (!b) return;
            asignar(linea, lista[Number(b.getAttribute('data-k'))]);
            linea.via = 'manual';
            guardarBorrador();
            cerrar();
            pintarLineas();
          });
          pintar();
        }
      });
    }

    function importar(contenido) {
      try {
        var datos = leerTexto(contenido);
        if (!datos.proveedor && !borrador.proveedorId) throw new Error('elija primero el proveedor (así se reconocen sus códigos y bonificaciones)');
        if (datos.proveedor && !borrador.proveedorId) {
          var hay = POS.Proveedores.listar().some(function (x) { return normal(x.nombre) === normal(datos.proveedor); });
          if (!hay) {
            var pr = POS.Proveedores.guardar({ nombre: datos.proveedor, nit: datos.nit, codigoSinPrefijo: /roma/i.test(datos.proveedor) });
            borrador.proveedorId = String(pr.id);
          }
        }
        var r = incorporar(datos);
        U.aviso(r.nuevas + ' línea(s) importadas, ' + r.emparejadas + ' emparejadas automáticamente.', 'ok', 6000);
        render(cont);
      } catch (err) {
        U.aviso('No se pudo importar: ' + err.message, 'error', 7000);
      }
    }
    $('#cf-archivo').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      var lector = new FileReader();
      lector.onload = function () { importar(String(lector.result)); };
      lector.readAsText(f);
    });
    $('#cf-pegar').addEventListener('click', function () {
      U.modal({
        titulo: 'Pegar líneas de la factura',
        cuerpo: '<p class="tenue pequeno">Pegue el XML de la factura electrónica, el JSON que le prepare Claude a partir de una foto, o una tabla copiada de Excel con encabezado ' +
          '(codigo, descripcion, cantidad, bonificacion, costo, lote, vencimiento, ean).</p><textarea id="cf-texto" rows="10" class="cf-texto"></textarea>',
        botones: [{ texto: 'Cancelar', clase: 'boton-secundario' }, { texto: 'Importar', clase: 'boton-primario', accion: function (cerrar, raiz) {
          var t = U.$('#cf-texto', raiz).value;
          cerrar();
          importar(t);
        } }]
      });
    });

    function guardar() {
      var L = borrador.lineas;
      var sinVerificar = L.filter(function (l) { return !l.verificado; }).length;
      var hacer = function () {
        try {
          var c = POS.Compras.registrar({
            proveedorId: borrador.proveedorId, numero: borrador.numero, fecha: borrador.fecha, condicion: borrador.condicion, vencimiento: borrador.vencimiento,
            lineas: L.map(function (l) {
              return { productoId: l.productoId, descripcion: l.descripcion, codigoProveedor: l.codigoProveedor, cantidad: l.cantidad, bonificacion: l.bonificacion,
                costo: l.costo, precioVenta: l.precioVenta, lote: l.lote, vencimiento: l.vencimiento, verificado: l.verificado };
            })
          });
          U.aviso('Factura ' + c.numero + ' registrada: ' + (c.unidades + c.bonificadas) + ' unidades sumadas al inventario.', 'ok', 6000);
          borrador = borradorVacio();
          guardarBorrador();
          render(cont);
        } catch (err) { U.error(err); }
      };
      if (sinVerificar) U.confirmar(sinVerificar + ' línea(s) no están marcadas como verificadas. ¿Guardar de todas formas?', hacer, 'Guardar');
      else hacer();
    }

    U.$$('[data-pagar]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = Number(b.getAttribute('data-pagar'));
        U.modal({
          titulo: 'Registrar pago de factura',
          cuerpo: '<p class="tenue pequeno">Queda como gasto tipo "Pedidos" en el turno abierto. Si se paga en efectivo, sale de la caja.</p>' +
            '<label class="campo"><span>Pagado con</span><select id="cf-metodo">' + POS.Ventas.METODOS_PAGO.map(function (m) {
              return '<option value="' + m + '"' + (m === 'TRANSFERENCIA' ? ' selected' : '') + '>' + POS.Ventas.nombreMetodo(m) + '</option>';
            }).join('') + '</select></label>',
          botones: [{ texto: 'Cancelar', clase: 'boton-secundario' }, { texto: 'Registrar pago', clase: 'boton-primario', accion: function (cerrar, raiz) {
            var g = POS.Compras.pagar(id, U.$('#cf-metodo', raiz).value);
            cerrar();
            U.aviso('Pago registrado: ' + U.dinero(g.monto), 'ok');
            render(cont);
          } }]
        });
      });
    });

    pintarLineas();
    buscar.focus();
  }

  App.registrar('compras', { titulo: 'Compras', icono: 'bodega', soloAdmin: true, render: render });

  // Para pruebas y para importar desde otras pantallas.
  window.ComprasImportar = { leerTexto: leerTexto };
})();
