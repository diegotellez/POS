const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5, colorScheme: 'light' });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const popups = []; ctx.on('page', p => popups.push(p));
  await ctx.route('https://wa.me/**', r => r.fulfill({ body: '<html><body style="font:16px sans-serif;padding:40px">WhatsApp</body></html>', contentType: 'text/html' }));
  const url = 'file://' + require('path').resolve(__dirname, '../../pos-html/index.html');
  const limpiar = () => page.evaluate(() => { document.getElementById('avisos').innerHTML = ''; });
  const foto = async (n, opts) => { await limpiar(); await page.waitForTimeout(150); await page.screenshot(Object.assign({ path: OUT + '/' + n + '.jpg', type: 'jpeg', quality: 82 }, opts || {})); };
  const ir = async (t) => { await page.click('.lateral-item >> text=' + t); await page.waitForTimeout(150); };
  await page.goto(url);
  await foto('u01-login');
  await page.fill('[name=usuario]', 'admin'); await page.fill('[name=password]', 'admin123'); await page.click('button[type=submit]');
  await page.waitForSelector('#busqueda');
  await page.evaluate(() => POS.Config.guardar(Object.assign(POS.Config.obtener(), { whatsapp: '573001234567', nit: '900.123.456-7', direccion: 'Calle 10 # 5-20' })));
  await page.evaluate(() => { const u = POS.Usuarios.listar().find(x => x.nombre_usuario === 'cajero'); });
  // turno
  await ir('Turno de caja'); await page.fill('[name=base]', '100000'); await foto('u06-abrir-turno');
  await page.click('#form-abrir button'); await page.waitForSelector('#busqueda');
  // ventas: varias
  const vender = async (codigos, pagos) => {
    for (const c of codigos) { await page.fill('#busqueda', c); await page.press('#busqueda', 'Enter'); }
    await page.click('#btn-cobrar');
    if (pagos) await pagos();
    await page.click('.modal .boton-primario'); await page.click('.modal .boton-secundario');
  };
  await vender(['7705260181591', '7705260181591', '7709378657979']);
  await vender(['7705632122337', '7702527601892'], async () => { await page.fill('[data-campo=monto][data-i="0"]', '0'); await page.selectOption('[data-campo=metodo][data-i="0"]', 'TARJETA'); await page.fill('[data-campo=monto][data-i="0"]', '45400'); });
  await vender(['7704710497466', '7703423667128', '7705432319487']);
  // pantalla de venta con ticket
  await page.fill('#busqueda', '7705260181591'); await page.press('#busqueda', 'Enter');
  await page.fill('#busqueda', '7706281948217'); await page.press('#busqueda', 'Enter');
  await page.fill('#busqueda', '7706281948217'); await page.press('#busqueda', 'Enter');
  await page.fill('#busqueda', 'ibupro');
  await foto('u02-ventas');
  // pago mixto
  await page.click('#btn-cobrar');
  await page.fill('[data-campo=monto][data-i="0"]', '20000'); await page.click('#btn-otro-pago');
  await page.fill('#recibido', '50000');
  await page.click('details.cliente summary'); await page.fill('#cliente-nombre', 'María Gómez'); await page.fill('#cliente-doc', '52.345.678');
  await foto('u03-pago');
  await page.click('.modal .boton-primario');
  await page.waitForSelector('text=¿Deseas imprimir');
  await foto('u03b-imprimir');
  await page.click('.modal .boton-primario'); await page.waitForTimeout(600);
  const tk = popups[popups.length - 1]; await tk.setViewportSize({ width: 380, height: 560 }); await tk.screenshot({ path: OUT + '/u04-ticket.jpg', type: 'jpeg', quality: 85 }); await tk.close();
  // producto no encontrado
  await page.fill('#busqueda', '7709999000011'); await page.press('#busqueda', 'Enter');
  await foto('u19-no-encontrado');
  await page.fill('#busqueda', '');
  // historial
  await ir('Historial de ventas'); await foto('u05-historial');
  await page.click('[data-anular]'); await page.fill('[name=motivo]', 'El cliente devolvió el producto'); await foto('u05b-anular');
  await page.click('.modal .boton-secundario');
  // productos
  await ir('Productos'); await page.fill('#filtro', 'dolex'); await foto('u09-productos');
  await page.click('#btn-nuevo'); await page.fill('.modal [name=nombre]', 'Dolex Niños 10+ x 24 tabletas'); await page.fill('.modal [name=codigoBarras]', '7709999000011'); await page.fill('.modal [name=precioVenta]', '14000'); await page.fill('.modal [name=stockMinimo]', '3');
  await foto('u10-producto-form'); await page.click('.modal .boton-secundario'); await page.fill('#filtro', '');
  // precios
  await ir('Precios'); await page.keyboard.type('3800'); await page.keyboard.press('Enter'); await page.keyboard.type('12900'); await page.keyboard.press('Enter');
  await foto('u11-precios');
  await page.click('#btn-texto'); await page.click('#btn-ejemplo'); await foto('u12a-whatsapp-texto');
  await page.click('#btn-interpretar'); await page.waitForSelector('#btn-aplicar'); await foto('u12b-whatsapp-revision');
  await page.click('.modal-acciones .boton-secundario');
  // categorias
  await ir('Categorías'); await foto('u20-categorias');
  // inventario
  await ir('Inventario'); await page.selectOption('[name=productoId]', { label: 'Acetaminofén 500 mg x 10 tabletas (stock: 57)' }).catch(() => page.selectOption('[name=productoId]', { index: 3 }));
  await page.fill('[name=cantidad]', '24'); await page.fill('[name=referencia]', 'Factura 4581 - Distribuidora Andina');
  await foto('u13-compras');
  await page.click('[data-p=ajuste]'); await foto('u13b-ajuste');
  await page.click('[data-p=movimientos]'); await foto('u13c-movimientos');
  // usuarios
  await ir('Usuarios'); await foto('u15-usuarios');
  // respaldo
  await ir('Respaldo y configuración'); await foto('u16-respaldo');
  // turno abierto y cierre
  await ir('Turno de caja'); await page.fill('[name=efectivo]', '139500'); await foto('u07a-cerrar');
  await page.click('#form-cerrar button'); await foto('u07b-confirmar');
  await page.click('.modal .boton-primario'); await page.waitForTimeout(600);
  const waUrl = popups[popups.length - 1].url(); await popups[popups.length - 1].close();
  await foto('u07c-resumen', { fullPage: true });
  require('fs').writeFileSync(OUT + '/mensaje.txt', decodeURIComponent(waUrl.split('text=')[1]));
  // reportes
  await ir('Reportes'); await foto('u14-reportes', { fullPage: true });
  // auditoria
  await ir('Auditoría'); await foto('u18-auditoria');
  // cierre publico movil
  const hash = /#(cierre-[A-Za-z0-9_-]+)/.exec(decodeURIComponent(waUrl.split('text=')[1]))[1];
  const movil = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const m = await movil.newPage(); await m.goto(url + '#' + hash); await m.waitForSelector('.cierre-publico');
  await m.screenshot({ path: OUT + '/u17-cierre-movil.jpg', type: 'jpeg', quality: 82, fullPage: true });
  // cajero
  await page.click('#btn-salir'); await page.fill('[name=usuario]', 'cajero'); await page.fill('[name=password]', 'cajero123'); await page.click('button[type=submit]'); await page.waitForSelector('#busqueda');
  await ir('Turno de caja'); await foto('u08-cajero-turno');
  console.log('errores', errs);
  await b.close();
})();
