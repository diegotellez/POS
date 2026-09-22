import sys
from base import *

C = sys.argv[1]
SALIDA = sys.argv[2]

h = []

# ------------------------------------------------------------------ 1
h += [h1('1. Bienvenida')]
h += [p('Este manual explica cómo usar el <b>Sistema POS</b> en el día a día de la droguería: abrir la caja, vender, cobrar, '
        'imprimir tickets, cerrar la caja y, para el administrador, manejar productos, precios, inventario y reportes.'),
      p('Las secciones 2 a 6 son para todo el personal de caja. Las secciones 7 a 12 son solo para administradores. La '
        'sección 13 explica lo que recibe el dueño del negocio.')]
h += [h2('1.1 Roles')]
h += [tabla(['Función', 'Cajero', 'Administrador'], [
    ['Vender, cobrar e imprimir tickets', 'Sí', 'Sí'],
    ['Abrir y cerrar el turno de caja', 'Sí', 'Sí'],
    ['Ver el historial y anular ventas', 'Sí', 'Sí'],
    ['Crear productos desde la venta', 'No', 'Sí'],
    ['Reabrir un turno cerrado por error', 'No', 'Sí'],
    ['Productos, precios, categorías e inventario', 'No', 'Sí'],
    ['Reportes, usuarios, auditoría, configuración y respaldos', 'No', 'Sí'],
], [9, 3, 3])]
h += [h2('1.2 Un día normal en la caja')]
h += [pasos([
    '<b>Ingresar</b> con su usuario (sección 2).',
    '<b>Abrir el turno</b> registrando la base de efectivo (sección 3).',
    '<b>Vender</b> durante el día (sección 4).',
    '<b>Cerrar el turno</b>: contar el efectivo y registrar el arqueo. Se envía el cierre al dueño por WhatsApp (sección 6).',
    'El administrador <b>descarga el respaldo</b> del día (sección 12).',
])]

# ------------------------------------------------------------------ 2
h += [PageBreak(), h1('2. Ingresar al sistema')]
h += [pasos([
    'Abra el acceso directo <b>Caja POS</b> del escritorio (o el archivo <font face="Mono">index.html</font>).',
    'Escriba su <b>usuario</b> y <b>contraseña</b> y pulse <b>Ingresar</b>.',
])]
h += [figura(C + '/u01-login.jpg', 'Figura 1. Inicio de sesión.', ancho=UTIL * 0.42, recorte=(0.33, 0.22, 0.67, 0.78))]
h += [h2('2.1 La pantalla principal')]
h += [viñetas([
    '<b>Menú lateral</b> (izquierda): las pantallas del sistema. El cajero ve Ventas, Historial de ventas y Turno de caja; el administrador ve todas.',
    '<b>Barra superior</b>: nombre del negocio, usuario conectado y su rol, y el botón para <b>cerrar sesión</b> (icono de salida, a la derecha).',
    'Los <b>avisos</b> aparecen abajo al centro durante unos segundos: verde para operaciones exitosas, rojo para errores y naranja para alertas.',
    'En celular o pantallas pequeñas, el menú se abre con el botón de tres líneas de la barra superior.',
])]
h += [caja('Consejo', 'Cierre la sesión cuando entregue la caja a otra persona, para que cada venta quede registrada a nombre de quien la hizo.')]

# ------------------------------------------------------------------ 3
h += [h1('3. Abrir el turno de caja')]
h += [p('El turno de caja define el "día de trabajo": todas las ventas quedan asociadas al turno abierto. <b>No se puede vender '
        'sin un turno abierto.</b> Solo puede haber un turno abierto a la vez.')]
h += [pasos([
    'En el menú, entre a <b>Turno de caja</b>.',
    'Escriba la <b>base inicial de efectivo</b>: el dinero con el que empieza la caja para dar cambio (si no hay, deje 0).',
    'Pulse <b>Abrir turno</b>. El sistema lo lleva a Ventas.',
])]
h += [figura(C + '/u06-abrir-turno.jpg', 'Figura 2. Apertura del turno con la base de efectivo.', alto_max=8 * cm, recorte=(0.18, 0.07, 0.72, 0.42))]

# ------------------------------------------------------------------ 4
h += [h1('4. Vender')]
h += [figura(C + '/u02-ventas.jpg', 'Figura 3. Pantalla de ventas: buscador y productos a la izquierda, ticket a la derecha.')]
h += [h2('4.1 Agregar productos al ticket')]
h += [p('Hay tres formas de agregar un producto; puede combinarlas en la misma venta:')]
h += [tabla(['Forma', 'Cómo'], [
    ['Escanear', 'Con el cursor en el buscador, pase el producto por el lector de código de barras. Se agrega solo.'],
    ['Buscar por nombre', 'Escriba parte del nombre (por ejemplo "ibupro") y haga clic en el producto de la lista.'],
    ['Código interno', 'Escriba el código interno (por ejemplo 200002) y presione Enter.'],
], [3.5, 12.5])]
h += [p('Si agrega el mismo producto otra vez, se suma una unidad a la línea existente. Cuando el buscador está vacío, la '
        'lista muestra los productos que ya tienen precio para vender con clics.')]
h += [h2('4.2 Modificar el ticket')]
h += [viñetas([
    '<b>Cantidad</b>: use los botones <b>–</b> y <b>+</b>, o escriba la cantidad en la casilla del producto.',
    '<b>Quitar un producto</b>: pulse el icono de la papelera de esa línea.',
    '<b>Vaciar</b>: borra todo el ticket (pide confirmación).',
    'Si la cantidad supera las existencias, la línea muestra "stock disponible" en naranja. La venta se puede hacer igual, pero avise al administrador.',
])]
h += [caja('El ticket no se pierde', 'El ticket en curso queda guardado aunque cambie de pantalla, recargue la página o cierre la '
           'sesión. Se borra solo al cobrar o al pulsar Vaciar.', 'nota')]
h += [h2('4.3 Productos sin precio o que no existen')]
h += [viñetas([
    'Un producto que dice <b>"Sin precio"</b> no se puede vender. Pida al administrador que le asigne precio en la pantalla Precios.',
    'Si escanea o busca algo que <b>no existe</b>, el sistema lo indica. El administrador verá el botón <b>Agregar como producto nuevo</b> '
    '(el código escaneado queda escrito): al guardarlo con precio, pasa directo al ticket sin perder lo que ya estaba.',
])]
h += [figura(C + '/u19-no-encontrado.jpg', 'Figura 4. Código no registrado: el administrador puede crearlo sin salir de la venta.', alto_max=7 * cm, recorte=(0.18, 0.07, 0.68, 0.5))]

h += [PageBreak(), h2('4.4 Cobrar')]
h += [pasos([
    'Pulse <b>Cobrar</b> o la tecla <b>F2</b>.',
    'Por defecto se registra todo en <b>EFECTIVO</b>. Para otro medio, cámbielo en la lista <i>Método</i>.',
    '<b>Pago mixto</b>: escriba el monto del primer medio y pulse <b>Agregar otro método de pago</b>; el sistema propone el valor que falta.',
    'Para calcular el cambio, escriba el <b>efectivo recibido</b>: el sistema muestra el <b>cambio a devolver</b>.',
    'Opcional: despliegue <b>Datos del cliente</b> y escriba nombre y documento (aparecen en el ticket).',
    'Cuando diga "Los pagos cuadran con el total", pulse <b>Confirmar venta</b> (o Enter).',
])]
h += [figura(C + '/u03-pago.jpg', 'Figura 5. Registro de pago mixto (efectivo y tarjeta) con cálculo del cambio.', alto_max=8.8 * cm, recorte=(0.3, 0.09, 0.7, 0.9))]
h += [h2('4.5 Imprimir el ticket')]
texto45 = [p('Al confirmar, el sistema pregunta si desea imprimir el comprobante. Pulse <b>Imprimir ticket</b> para abrir el diálogo '
             'de impresión (elija la impresora térmica) o <b>No imprimir</b>.'),
           p('Si algún producto queda con stock bajo o agotado, aparece un aviso naranja. El ticket se puede reimprimir '
             'después desde el Historial de ventas.')]
_img = PILImage.open(C + '/u04-ticket.jpg')
_w = 4.0 * cm
tk = [Image(C + '/u04-ticket.jpg', width=_w, height=_w * _img.size[1] / _img.size[0]), Paragraph('Figura 6. Comprobante (80 mm).', E['pie'])]
lado = Table([[texto45, tk]], colWidths=[UTIL - 4.6 * cm, 4.6 * cm])
lado.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0),
                          ('RIGHTPADDING', (0, 0), (0, 0), 14), ('BOX', (1, 0), (1, 0), 0, colors.white)]))
h += [lado]

# ------------------------------------------------------------------ 5
h += [PageBreak(), h1('5. Historial de ventas y anulaciones')]
h += [p('En <b>Historial de ventas</b> se consultan las ventas del turno actual o de cualquier turno anterior.')]
h += [viñetas([
    '<b>Filtros</b>: turno, estado (completada / anulada) y rango de fechas.',
    '<b>Ver detalle</b> (icono de documento): productos, precios y pagos de la venta.',
    '<b>Reimprimir</b> (icono de impresora): vuelve a imprimir el ticket.',
    '<b>Anular</b>: cancela la venta. Pide el <b>motivo</b>, devuelve los productos al inventario y queda registrado en Auditoría. '
    'Las ventas anuladas no suman en el cierre.',
])]
h += [figura(C + '/u05-historial.jpg', 'Figura 7. Historial de ventas del turno.', alto_max=8 * cm)]
h += [caja('Atención', 'Anular una venta no se puede deshacer. Si se equivocó de producto antes de cobrar, corrija el ticket en '
           'lugar de cobrar y anular.', 'aviso')]

# ------------------------------------------------------------------ 6
h += [PageBreak(), h1('6. Cerrar el turno de caja')]
h += [pasos([
    'Cuente el efectivo que hay en la caja (incluida la base inicial).',
    'Entre a <b>Turno de caja</b>, escriba el <b>efectivo contado</b> y pulse <b>Cerrar turno</b>.',
    'Confirme. Después de cerrar ya no se pueden registrar ventas en ese turno.',
])]
h += [figura(C + '/u07a-cerrar.jpg', 'Figura 8. Turno abierto: resumen del día y formulario de arqueo.', alto_max=8 * cm, recorte=(0.18, 0.07, 0.72, 0.6))]
h += [h2('6.1 El arqueo')]
h += [p('El sistema calcula el <b>efectivo esperado</b> = base inicial + ventas en efectivo del turno, y lo compara con lo contado:')]
h += [tabla(['Resultado', 'Significado'], [
    ['Cuadre exacto', 'Lo contado es igual a lo esperado.'],
    ['FALTANTE (en rojo)', 'Hay menos dinero del esperado. Revise vueltos, ventas en efectivo registradas como tarjeta o retiros sin registrar.'],
    ['SOBRANTE', 'Hay más dinero del esperado. Revise ventas no registradas o pagos con tarjeta registrados como efectivo.'],
], [4, 12])]
h += [h2('6.2 Envío del cierre al dueño')]
h += [p('Si el administrador configuró el número de WhatsApp, al cerrar se abre WhatsApp con un mensaje ya escrito. <b>Solo '
        'tiene que tocar Enviar.</b> Si WhatsApp no se abre, use el botón <b>Enviar resumen por WhatsApp</b> del resumen del cierre.')]
h += [figura(C + '/u07c-resumen.jpg', 'Figura 9. Resumen del cierre: arqueo, todos los productos vendidos y envío por WhatsApp.', alto_max=13 * cm, recorte=(0.18, 0.0, 0.72, 1.0))]
h += [h2('6.3 Si cerró la caja por error')]
h += [p('Avise al administrador: en <b>Turno de caja</b> verá <b>¿Cerraste la caja por error? &gt; Reabrir turno</b>. El turno '
        'vuelve a quedar abierto con sus ventas y se borra el arqueo. Solo se puede reabrir el último turno y solo si no se ha '
        'abierto otro después.')]

# ------------------------------------------------------------------ 7
h += [PageBreak(), h1('7. Productos (administrador)')]
h += [p('En <b>Productos</b> se ve todo el catálogo con código, categoría, precio, stock y stock mínimo. El stock en naranja '
        'indica que está en el mínimo o por debajo.')]
h += [figura(C + '/u09-productos.jpg', 'Figura 10. Catálogo de productos filtrado.', alto_max=8 * cm)]
h += [viñetas([
    '<b>Nuevo producto</b>: nombre (obligatorio), código de barras, descripción, categoría, precio, stock mínimo y stock inicial. '
    'El <b>código interno</b> se genera solo (2000xx).',
    '<b>Editar</b> (lápiz): cambia los datos. El stock no se edita aquí: se modifica con compras o ajustes en Inventario.',
    '<b>Desactivar</b> (papelera): el producto deja de aparecer en ventas, pero se conserva en el historial. Con <i>Mostrar inactivos</i> se puede reactivar.',
    '<b>Stock mínimo</b>: cuando el stock llega a ese número, el sistema avisa. Con 0 no se generan alertas.',
])]
h += [figura(C + '/u10-producto-form.jpg', 'Figura 11. Formulario de producto.', alto_max=10 * cm, recorte=(0.3, 0.03, 0.7, 0.97))]

# ------------------------------------------------------------------ 8
h += [PageBreak(), h1('8. Precios (administrador)')]
h += [p('La pantalla <b>Precios</b> sirve para asignar precios rápido, en especial a los 288 productos del catálogo base que '
        'vienen sin precio. La barra superior muestra cuántos productos tienen precio.')]
h += [h2('8.1 Carga rápida producto por producto')]
h += [pasos([
    'Deje marcado <b>Solo sin precio</b> para ver lo que falta. Filtre por nombre o categoría si lo necesita.',
    'Escriba el precio y presione <b>Enter</b>: se guarda (la fila se pone verde) y el cursor pasa al siguiente producto.',
    'Para asociar el código de barras real, haga clic en la casilla <i>Escanear</i> del producto y páselo por el lector: el cursor salta a su precio.',
])]
h += [figura(C + '/u11-precios.jpg', 'Figura 12. Carga rápida de precios.', alto_max=9 * cm)]
h += [h2('8.2 Cargar precios desde WhatsApp o texto')]
h += [p('Si el proveedor o el dueño envía los precios por WhatsApp (texto o audio), el sistema los interpreta:')]
h += [pasos([
    'Para un audio: en WhatsApp mantenga presionada la nota de voz &gt; <b>Transcribir</b>, y copie el texto.',
    'En Precios pulse <b>Cargar desde WhatsApp o texto</b>, pegue el texto y pulse <b>Interpretar</b>.',
    'Revise la tabla. <b>Coincide</b>: el producto se reconoció con seguridad. <b>Revisar</b>: elija el producto correcto de la lista, '
    'o deje <b>Crear producto nuevo</b>. Puede corregir cualquier precio.',
    'Pulse <b>Guardar precios</b>.',
])]
h += [tabla(['Se puede escribir o dictar así', 'Precio que entiende'], [
    ['Dolex niños 10+, 14 mil', '$14.000'],
    ['Advil max a 8.500', '$8.500'],
    ['Pañales etapa 4 x 30 a 45 lucas', '$45.000'],
    ['Buscapina catorce mil quinientos', '$14.500'],
    ['Alka seltzer 12 tabletas 15k', '$15.000'],
], [10, 6])]
h += [p('La presentación del producto (500 mg, x 10, 2+) no se confunde con el precio. Se pueden poner varios productos en '
        'un mismo mensaje, cada uno seguido de su precio.')]
h += [figura(C + '/u12b-whatsapp-revision.jpg', 'Figura 13. Revisión de precios interpretados desde un mensaje.', alto_max=9.5 * cm, recorte=(0.15, 0.1, 0.85, 0.9))]

# ------------------------------------------------------------------ 9
h += [PageBreak(), h1('9. Categorías (administrador)')]
h += [p('Las categorías ordenan el catálogo y permiten filtrar en Precios. Pueden tener subcategorías (por ejemplo '
        'Medicamentos &gt; Analgésicos). Escriba el nombre, elija la categoría padre si es subcategoría y pulse <b>Agregar</b>. '
        'Con el lápiz se renombra o se cambia de padre; con la papelera se elimina (sus productos quedan sin categoría).')]
h += [figura(C + '/u20-categorias.jpg', 'Figura 14. Árbol de categorías con cantidad de productos.', alto_max=9 * cm)]

# ------------------------------------------------------------------ 10
h += [PageBreak(), h1('10. Inventario (administrador)')]
h += [h2('10.1 Compras (entrada de mercancía)')]
h += [pasos([
    'Entre a <b>Inventario &gt; Compras (entrada de mercancía)</b>.',
    'Elija el producto. Si llegó un producto que no existe, pulse <b>+ Nuevo producto</b>: se crea ahí mismo y queda seleccionado.',
    'Escriba la <b>cantidad</b> recibida y una <b>referencia</b> (número de factura y proveedor).',
    'Pulse <b>Registrar entrada</b>. El stock se suma y queda en el historial de movimientos.',
])]
h += [figura(C + '/u13-compras.jpg', 'Figura 15. Registro de una compra.', alto_max=6.5 * cm, recorte=(0.18, 0.07, 1.0, 0.5))]
h += [h2('10.2 Ajuste manual')]
h += [p('Para corregir el stock después de un conteo físico, una merma o un vencimiento: elija el producto (se muestra su stock '
        'actual), escriba el <b>nuevo stock</b> real y el <b>motivo</b>. El ajuste queda en Auditoría.')]
h += [h2('10.3 Historial de movimientos')]
h += [p('Lista los últimos 500 movimientos: compras (Entrada), ventas, anulaciones y ajustes manuales, con fecha, cantidad y referencia.')]
h += [figura(C + '/u13c-movimientos.jpg', 'Figura 16. Historial de movimientos de inventario.', alto_max=8 * cm)]

# ------------------------------------------------------------------ 11
h += [PageBreak(), h1('11. Reportes (administrador)')]
h += [p('En <b>Reportes</b> elija un turno para ver su reporte consolidado: total vendido, cantidad de ventas y anuladas, '
        'diferencia de arqueo, desglose por método de pago y por usuario, arqueo de caja y <b>todos los productos vendidos</b>.')]
h += [figura(C + '/u14-reportes.jpg', 'Figura 17. Reporte consolidado del turno.', alto_max=13.5 * cm)]
h += [tabla(['Botón', 'Qué hace'], [
    ['Imprimir / Guardar PDF', 'Abre el reporte para imprimir o guardarlo como PDF (en el diálogo de impresión elija "Guardar como PDF").'],
    ['Exportar ventas (CSV)', 'Descarga todas las líneas de venta del turno para abrir en Excel.'],
    ['Enviar por WhatsApp', 'Envía el resumen del turno (con el enlace al detalle) al número configurado.'],
], [4.5, 11.5])]

# ------------------------------------------------------------------ 12
h += [PageBreak(), h1('12. Usuarios, auditoría y respaldo (administrador)')]
h += [h2('12.1 Usuarios')]
h += [viñetas([
    'Crear: nombre de usuario, contraseña y rol (Cajero o Administrador).',
    'Cambiar el rol o desactivar a alguien con el interruptor <b>Activo</b>. No puede desactivarse a sí mismo, y siempre debe quedar un administrador activo.',
    '<b>Cambiar contraseña</b> de cualquier usuario.',
])]
h += [h2('12.2 Auditoría')]
h += [p('Registro de acciones sensibles con fecha y usuario: cambios de precio, ajustes de inventario, anulaciones, aperturas, '
        'cierres y reaperturas de turno, cambios de usuarios y de configuración.')]
h += [h2('12.3 Respaldo y configuración')]
h += [viñetas([
    '<b>Descargar respaldo</b> al terminar cada día y guardarlo fuera del equipo (USB o Google Drive). Es la única forma de recuperar la información si se borra el navegador.',
    '<b>Restaurar respaldo</b> reemplaza todos los datos por los del archivo elegido.',
    'En <b>Configuración</b> se cambian el nombre del negocio, NIT, dirección, moneda, ancho del ticket, número de WhatsApp y mensaje del ticket.',
])]
h += [caja('Respaldo diario', 'Los datos viven en el navegador de la caja. Si alguien borra el historial del navegador, solo el '
           'respaldo permite recuperarlos. Detalles en el Manual de instalación, configuración y mantenimiento.', 'aviso')]

# ------------------------------------------------------------------ 13
h += [PageBreak(), h1('13. Para el dueño: el cierre en WhatsApp')]
h += [p('Cada vez que se cierra la caja, el dueño recibe por WhatsApp un mensaje corto como este:')]
mensaje = open(C + '/mensaje.txt', encoding='utf-8').read()
import re as _re
mensaje = _re.sub(r'#cierre-\S+', '#cierre-…', mensaje)
lineas = [l.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;') for l in mensaje.split('\n')]
lineas = [_re.sub(r'\*(.+?)\*', r'<b>\1</b>', l) for l in lineas]
h += [Paragraph('<br/>'.join(lineas), E['mono'])]
h += [p('Con solo leerlo sabe <b>cuánto se vendió</b>, cómo se pagó y si la caja cuadró. Al tocar <b>Ver detalle</b> se abre una '
        'página con el cierre completo: formas de pago, arqueo, ventas por cajero y todos los productos vendidos. No hace falta '
        'iniciar sesión, y funciona aunque la caja no tenga internet, porque los datos viajan dentro del enlace.')]
h += [figura(C + '/u17-cierre-movil.jpg', 'Figura 18. Detalle del cierre visto en el celular del dueño.', alto_max=11.5 * cm)]
h += [caja('Nota', 'El detalle es una foto del momento del cierre. Si después se reabre el turno o se anula una venta, se '
           'recibirá un cierre nuevo al volver a cerrar.', 'nota')]

# ------------------------------------------------------------------ 14
h += [PageBreak(), h1('14. Atajos y preguntas frecuentes')]
h += [h2('14.1 Atajos de teclado')]
h += [tabla(['Tecla', 'Acción'], [
    ['F2', 'Cobrar el ticket actual (en Ventas).'],
    ['Enter en el buscador', 'Agregar el producto del código escrito o escaneado.'],
    ['Enter en el cobro', 'Confirmar la venta cuando los pagos cuadran.'],
    ['Enter en Precios', 'Guardar el precio y pasar al siguiente producto.'],
    ['Esc', 'Cerrar la ventana de diálogo abierta.'],
], [5, 11])]
h += [h2('14.2 Preguntas frecuentes')]
faq = [
    ('No puedo vender: dice que no hay turno abierto.', 'Abra el turno en Turno de caja (sección 3).'),
    ('Escaneo un producto y no pasa nada.', 'Verifique que el cursor esté en el buscador. Si aparece "No se encontraron productos", el código no está registrado: el administrador lo puede asignar en Precios o crear el producto.'),
    ('El producto dice "Sin precio".', 'El administrador debe asignarle precio en Precios.'),
    ('Me equivoqué en una venta ya cobrada.', 'Anúlela en Historial de ventas indicando el motivo y vuelva a hacer la venta correcta.'),
    ('Cerré la caja antes de tiempo.', 'El administrador puede reabrir el último turno (sección 6.3).'),
    ('No salió el ticket.', 'Permita las ventanas emergentes del navegador y reimprímalo desde Historial de ventas.'),
    ('No se abrió WhatsApp al cerrar.', 'Use el botón "Enviar resumen por WhatsApp" del resumen de cierre, o el de Reportes.'),
    ('¿Puedo usar el sistema en otro computador?', 'Sí, restaurando un respaldo en ese equipo (lo hace el administrador). Cada navegador guarda sus propios datos.'),
]
h += [tabla(['Pregunta', 'Respuesta'], [[q, a] for q, a in faq], [6, 10])]

construir(SALIDA, 'Manual del Usuario', 'Guía de uso para cajeros, administradores y dueño', h)
print('ok', SALIDA)
