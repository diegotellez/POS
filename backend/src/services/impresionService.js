function construirTicketHTML(venta) {
  const fecha = new Date(venta.fecha_hora).toLocaleString();
  const filas = venta.detalle
    .map(
      (d) => `
      <tr>
        <td>${d.cantidad} x ${d.producto_nombre}</td>
        <td style="text-align:right">$${d.subtotal.toFixed(2)}</td>
      </tr>`
    )
    .join('');
  const pagos = venta.pagos
    .map((p) => `<div>${p.metodo_pago}: $${p.monto.toFixed(2)}</div>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Comprobante de venta #${venta.id}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  body { width: 80mm; font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 8px; color: #111; }
  h2 { text-align: center; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  hr { border: none; border-top: 1px dashed #111; }
  .total { font-weight: bold; font-size: 14px; text-align: right; }
  @media print { body { width: 80mm; } }
</style>
</head>
<body>
  <h2>Comprobante de venta</h2>
  <div>Venta #${venta.id}</div>
  <div>${fecha}</div>
  <hr />
  <table>${filas}</table>
  <hr />
  <div class="total">TOTAL: $${venta.total.toFixed(2)}</div>
  <hr />
  ${pagos}
  <hr />
  <div style="text-align:center">¡Gracias por su compra!</div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;
}

async function imprimirEnTermica(venta) {
  const tipo = process.env.PRINTER_TYPE;
  const interfaz = process.env.PRINTER_INTERFACE;
  if (!tipo || !interfaz) {
    return { impreso: false, motivo: 'Impresora térmica no configurada' };
  }

  try {
    const { printer: ThermalPrinter, types: PrinterTypes } = require('node-thermal-printer');
    const printer = new ThermalPrinter({ type: PrinterTypes[tipo] || PrinterTypes.EPSON, interface: interfaz });

    const conectada = await printer.isPrinterConnected().catch(() => false);
    if (!conectada) {
      return { impreso: false, motivo: 'Impresora térmica no responde' };
    }

    printer.alignCenter();
    printer.println('Comprobante de venta');
    printer.println(`Venta #${venta.id}`);
    printer.drawLine();
    printer.alignLeft();
    venta.detalle.forEach((d) => {
      printer.println(`${d.cantidad} x ${d.producto_nombre}`);
      printer.alignRight();
      printer.println(`$${d.subtotal.toFixed(2)}`);
      printer.alignLeft();
    });
    printer.drawLine();
    printer.alignRight();
    printer.bold(true);
    printer.println(`TOTAL: $${venta.total.toFixed(2)}`);
    printer.bold(false);
    printer.alignLeft();
    venta.pagos.forEach((p) => printer.println(`${p.metodo_pago}: $${p.monto.toFixed(2)}`));
    printer.cut();
    await printer.execute();
    return { impreso: true };
  } catch (error) {
    return { impreso: false, motivo: error.message };
  }
}

module.exports = { construirTicketHTML, imprimirEnTermica };
