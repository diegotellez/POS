import sys
from base import *

C = sys.argv[1]  # carpeta de capturas
SALIDA = sys.argv[2]

h = []

# ------------------------------------------------------------------ 1
h += [h1('1. Introducción')]
h += [p('Este manual explica cómo instalar, configurar y mantener el <b>Sistema POS para droguería</b> en su versión '
        'HTML/CSS/JS. Está dirigido a la persona que administra el sistema: el dueño del negocio, el administrador de la '
        'caja o quien le da soporte técnico.'),
      p('El sistema es una aplicación web que funciona completamente dentro del navegador. <b>No necesita instalar '
        'programas, ni servidor, ni base de datos, ni conexión a internet</b> para vender. Basta con abrir el archivo '
        '<font face="Mono">index.html</font>.')]
h += [h2('1.1 Qué incluye')]
h += [viñetas([
    'Punto de venta con lector de código de barras, pagos mixtos (efectivo, tarjeta, transferencia) y ticket imprimible.',
    'Turnos de caja con apertura, arqueo al cierre y envío del cierre al dueño por WhatsApp.',
    'Catálogo de droguería precargado: 17 productos de ejemplo con precio y 288 productos habituales sin precio, en 23 categorías.',
    'Carga rápida de precios, incluso pegando mensajes o audios transcritos de WhatsApp.',
    'Inventario (compras, ajustes, movimientos), reportes por turno, usuarios con roles, auditoría y respaldo de datos.',
])]
h += [h2('1.2 Cómo se guardan los datos')]
h += [p('Toda la información (productos, ventas, turnos, usuarios y configuración) se guarda en el '
        '<b>almacenamiento local del navegador</b> del equipo donde se usa. Esto tiene consecuencias importantes que '
        'conviene entender desde el principio:')]
h += [tabla(['Situación', 'Qué pasa'], [
    ['Cerrar el navegador o apagar el equipo', 'Los datos se conservan.'],
    ['Abrir el sistema en otro equipo u otro navegador', 'Empieza sin datos (con el catálogo de ejemplo). Cada navegador tiene su propia base.'],
    ['Borrar los datos de navegación / historial del sitio', '<b>Se pierde toda la información.</b>'],
    ['Usar una ventana de incógnito o privada', 'Los datos se borran al cerrar la ventana. No la use para trabajar.'],
    ['Mover la carpeta del sistema a otra ubicación', 'En algunos navegadores (Firefox) la base queda asociada a la ruta y el sistema aparece vacío.'],
], [5, 9])]
h += [caja('Regla de oro', 'Descargue un respaldo al cerrar cada turno y guárdelo fuera del equipo (USB o carpeta de Google Drive). '
           'Con el respaldo se recupera todo en minutos, en cualquier equipo. Vea la sección 5.', 'aviso')]

# ------------------------------------------------------------------ 2
h += [PageBreak(), h1('2. Requisitos')]
h += [h2('2.1 Equipo y navegador')]
h += [tabla(['Elemento', 'Requisito', 'Recomendación'], [
    ['Computador', 'Windows 10/11, macOS o Linux. También funciona en tabletas.', 'PC de escritorio o portátil dedicado a la caja.'],
    ['Navegador', 'Chrome, Edge, Firefox o Safari en versión reciente.', '<b>Google Chrome o Microsoft Edge.</b> Use siempre el mismo.'],
    ['Pantalla', 'Desde 1024 px de ancho; se adapta a celular.', '1366 x 768 o superior.'],
    ['Espacio', 'Menos de 1 MB para los archivos.', 'Los datos usan hasta ~5 MB del navegador.'],
    ['Internet', 'No se necesita para vender.', 'Solo para enviar el cierre por WhatsApp.'],
], [3, 6, 6])]
h += [h2('2.2 Periféricos opcionales')]
h += [tabla(['Periférico', 'Cómo se conecta', 'Notas'], [
    ['Lector de código de barras USB', 'Se conecta y funciona como un teclado.', 'Debe estar configurado para enviar <b>Enter</b> al final de cada lectura (la mayoría viene así de fábrica).'],
    ['Impresora térmica de tickets (58 u 80 mm)', 'Instálela como impresora normal del sistema operativo con su controlador.', 'El sistema imprime con el diálogo de impresión del navegador; no usa comandos ESC/POS directos.'],
    ['Cajón monedero', 'Conectado a la impresora térmica.', 'Si la impresora abre el cajón al imprimir, funcionará al imprimir el ticket.'],
], [4, 5, 7])]

# ------------------------------------------------------------------ 3
h += [PageBreak(), h1('3. Instalación')]
h += [h2('3.1 Instalar en el equipo de la caja')]
h += [pasos([
    'Copie el archivo <b>POS-Drogueria.zip</b> al equipo.',
    'Descomprímalo en una ubicación fija que no vaya a cambiar, por ejemplo <font face="Mono">C:\\POS</font> '
    '(en Windows: clic derecho sobre el ZIP &gt; <i>Extraer todo…</i>). Quedará la carpeta <font face="Mono">C:\\POS\\pos-html</font>.',
    'Abra la carpeta <font face="Mono">pos-html</font> y haga doble clic en <b>index.html</b>. Si se abre en un navegador '
    'distinto al que va a usar siempre, haga clic derecho &gt; <i>Abrir con</i> &gt; Chrome o Edge.',
    'Verá la pantalla de inicio de sesión. La instalación terminó.',
])]
h += [figura(C + '/u01-login.jpg', 'Figura 1. Pantalla de inicio de sesión en el primer uso.', ancho=UTIL * 0.45, recorte=(0.33, 0.22, 0.67, 0.78))]
h += [h2('3.2 Crear un acceso directo')]
h += [p('Para que el cajero abra el sistema con un solo clic y sin barras del navegador, cree un acceso directo en el '
        'escritorio que lo abra en <b>modo aplicación</b>:')]
h += [pasos([
    'Clic derecho en el escritorio &gt; <i>Nuevo</i> &gt; <i>Acceso directo</i>.',
    'En la ubicación escriba (ajuste la ruta si instaló en otra carpeta):',
])]
h += [Paragraph('"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --app="file:///C:/POS/pos-html/index.html"', E['mono'])]
h += [pasos(inicio=3, items=['Nómbrelo <b>Caja POS</b> y finalice. Para Edge, reemplace la ruta de Chrome por '
             '<font face="Mono">"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"</font>.'])]
h += [caja('Importante', 'Abra el sistema siempre de la misma forma (mismo navegador y misma ruta). Si un día lo abre con otro '
           'navegador o desde otra carpeta, verá el sistema vacío: los datos no se perdieron, están en el navegador y la ruta de siempre.', 'nota')]
h += [h2('3.3 Usar la versión en línea (artefacto de Claude)')]
h += [p('El sistema también está publicado como artefacto de claude.ai. Esa versión funciona igual, pero guarda sus propios '
        'datos en el navegador de quien la abre. Hay dos diferencias: el visor no permite imprimir directamente (muestra una '
        'vista previa) y las descargas piden confirmación. Para trabajar en la caja se recomienda la versión local (ZIP).'),
      p('El artefacto se usa también para que el dueño vea el detalle de los cierres enviados por WhatsApp (sección 4.4). '
        'Para que el dueño pueda abrirlo, compártale el artefacto desde el menú <b>Compartir</b> de claude.ai.')]
h += [h2('3.4 Publicar en un sitio web propio (opcional)')]
h += [p('La carpeta <font face="Mono">pos-html</font> se puede subir tal cual a cualquier hosting de archivos estáticos '
        '(GitHub Pages, Netlify, el hosting de su página web). No requiere configuración del servidor. Si lo hace, cambie '
        'la dirección del enlace de cierres en la configuración (sección 4.4).')]

# ------------------------------------------------------------------ 4
h += [PageBreak(), h1('4. Configuración inicial')]
h += [p('Realice estos pasos una sola vez, con el usuario administrador, antes de empezar a vender.')]
h += [h2('4.1 Usuarios y contraseñas')]
h += [p('El sistema trae dos usuarios de ejemplo. <b>Cambie sus contraseñas de inmediato</b>; mientras no lo haga, el '
        'sistema lo recordará en la pantalla de inicio y en <i>Usuarios</i>.')]
h += [tabla(['Usuario', 'Contraseña inicial', 'Rol', 'Puede'], [
    ['admin', 'admin123', 'ADMINISTRADOR', 'Todo: productos, precios, inventario, reportes, usuarios, configuración y respaldos.'],
    ['cajero', 'cajero123', 'CAJERO', 'Vender, ver el historial, anular ventas y abrir/cerrar el turno de caja.'],
], [2.2, 3, 3.3, 8])]
h += [pasos([
    'Ingrese con <b>admin / admin123</b> y vaya a <b>Usuarios</b>.',
    'En cada usuario pulse <b>Cambiar contraseña</b>, escríbala dos veces y guarde (mínimo 4 caracteres).',
    'Cree un usuario para cada persona que atiende la caja (rol <i>Cajero</i>), así los reportes muestran quién vendió.',
    'Si alguien deja de trabajar, desactive su usuario con el interruptor <i>Activo</i> (no se borra para conservar el historial).',
])]
h += [figura(C + '/u15-usuarios.jpg', 'Figura 2. Gestión de usuarios.', alto_max=9 * cm)]
h += [h2('4.2 Datos del negocio y del ticket')]
h += [p('En <b>Respaldo y configuración</b>, sección <i>Configuración</i>:')]
h += [tabla(['Campo', 'Para qué sirve', 'Ejemplo'], [
    ['Nombre del negocio', 'Aparece en el ticket, los reportes y el mensaje de cierre.', 'Droguería La Esperanza'],
    ['NIT / RUT y Dirección', 'Se imprimen en el encabezado del ticket.', '900.123.456-7 · Calle 10 # 5-20'],
    ['Símbolo de moneda', 'Símbolo antes de cada valor.', '$'],
    ['Decimales', '0 para pesos colombianos ($14.000); 2 para monedas con centavos.', '0'],
    ['Ancho del ticket', 'Debe coincidir con el papel de la impresora térmica.', '80 mm'],
    ['WhatsApp para reportes', 'Número que recibe el cierre de caja. Con indicativo de país, sin "+", ni espacios.', '573001234567'],
    ['Enlace de la app para ver cierres', 'Dirección que se agrega al mensaje de cierre para ver el detalle. Déjelo vacío si no quiere enlace.', 'https://claude.ai/artifact/…'],
    ['Mensaje al pie del ticket', 'Texto de despedida del ticket.', '¡Gracias por su compra!'],
], [4, 7, 5])]
h += [figura(C + '/u16-respaldo.jpg', 'Figura 3. Configuración y respaldo.', alto_max=9.5 * cm)]
h += [h2('4.3 Impresora de tickets')]
h += [p('El ticket se abre en una ventana y el navegador muestra su diálogo de impresión. La primera vez configure:')]
h += [pasos([
    'Destino: la impresora térmica.',
    'En <i>Más opciones</i>: <b>Márgenes: Ninguno</b>, <b>Encabezados y pies de página: desactivado</b>, escala 100 %.',
    'Tamaño de papel: el rollo de la impresora (80 mm o 58 mm). Si no aparece, créelo en las preferencias del controlador de la impresora.',
    'Chrome y Edge recuerdan estas opciones para las siguientes impresiones.',
])]
h += [caja('Consejo', 'Si el navegador bloquea la ventana del ticket, permita las ventanas emergentes para el sistema '
           '(icono en la barra de direcciones &gt; <i>Permitir siempre</i>). En modo aplicación normalmente no se bloquea.')]
h += [h2('4.4 WhatsApp del dueño y enlace de cierres')]
h += [p('Al cerrar la caja, el sistema abre WhatsApp con el número configurado y un mensaje corto ya escrito: lo vendido, '
        'las formas de pago, el cuadre de caja y un enlace <b>"Ver detalle"</b>. El enlace abre una página de solo lectura con '
        'todo el cierre (productos, arqueo, cajeros) sin iniciar sesión, porque el cierre viaja dentro del enlace.')]
h += [viñetas([
    'Configure el número en <i>WhatsApp para reportes</i> (formato internacional: 57 + número celular).',
    'El enlace usa por defecto la dirección del artefacto de claude.ai. El dueño debe tener acceso: compártale el artefacto desde claude.ai.',
    'Si publica el sistema en su propio sitio (sección 3.4), cambie <i>Enlace de la app para ver cierres</i> por esa dirección.',
    'WhatsApp no permite que una página envíe mensajes sola: siempre hay que tocar <b>Enviar</b>. Para envío 100 % automático se necesita la API de WhatsApp Business con un servidor.',
])]
h += [h2('4.5 Lector de código de barras')]
h += [p('Conecte el lector, abra <b>Ventas</b>, haga clic en el buscador y escanee un producto. Si el producto aparece en '
        'el ticket, está listo. Si solo se escribe el número sin agregarse, configure el lector para enviar <b>Enter</b> (sufijo '
        'CR) con el manual de su fabricante.')]
h += [h2('4.6 Catálogo y precios')]
h += [p('El catálogo base trae 288 productos habituales de droguería sin precio. Un producto sin precio no se puede vender, así '
        'que antes de abrir la caja asigne precios en la pantalla <b>Precios</b> (vea el Manual del Usuario, sección Precios):')]
h += [viñetas([
    'Escriba el precio y presione Enter para pasar al siguiente. La barra muestra el avance.',
    'Haga clic en la casilla de código de barras y escanee el producto para asociar su código real.',
    'Use <b>Cargar desde WhatsApp o texto</b> para pegar listas de precios del proveedor o audios transcritos.',
    'Revise las categorías en <b>Categorías</b> y desactive los productos que no maneja (Productos &gt; icono de papelera).',
    'Configure el <b>stock mínimo</b> de los productos que quiera vigilar; solo esos generan alertas de stock bajo.',
])]
h += [h2('4.7 Inventario inicial')]
h += [p('Registre las existencias actuales en <b>Inventario &gt; Compras (entrada de mercancía)</b>, producto por producto, '
        'con la referencia "Inventario inicial". A partir de ahí cada venta descuenta del stock y cada compra lo suma.')]

# ------------------------------------------------------------------ 5
h += [PageBreak(), h1('5. Mantenimiento')]
h += [h2('5.1 Respaldos')]
h += [p('El respaldo es un archivo <font face="Mono">.json</font> con <b>toda</b> la información: productos, precios, ventas, '
        'turnos, usuarios, auditoría y configuración.')]
h += [tabla(['Tarea', 'Frecuencia', 'Cómo'], [
    ['Descargar respaldo', 'Al cerrar cada turno (mínimo una vez al día).', 'Respaldo y configuración &gt; <b>Descargar respaldo</b>.'],
    ['Copiar fuera del equipo', 'Diario.', 'Guarde el archivo en una USB o en una carpeta sincronizada con Google Drive.'],
    ['Conservar históricos', 'Guarde al menos los respaldos de los últimos 30 días.', 'El nombre incluye fecha y hora: <font face="Mono">pos-respaldo-AAAAMMDD-HHMMSS.json</font>.'],
    ['Probar la restauración', 'Cada 3 meses.', 'Restaure un respaldo en otro navegador o equipo y verifique que abre bien.'],
], [3.5, 5, 7.5])]
h += [p('Si la descarga no arranca (por ejemplo, dentro del visor de claude.ai), use <b>Copiar respaldo</b> y pegue el texto en un '
        'archivo nuevo con extensión <font face="Mono">.json</font> usando el Bloc de notas.')]
h += [h3('Restaurar un respaldo')]
h += [pasos([
    'Ingrese como administrador y vaya a <b>Respaldo y configuración</b>.',
    'Pulse <b>Restaurar respaldo</b> y elija el archivo <font face="Mono">.json</font>.',
    'Confirme. <b>Se reemplazan todos los datos actuales</b> por los del archivo.',
    'Vuelva a iniciar sesión con los usuarios y contraseñas que había en el respaldo.',
])]
h += [h2('5.2 Cambiar de equipo o de navegador')]
h += [pasos([
    'En el equipo actual, descargue un respaldo.',
    'Instale el sistema en el equipo nuevo (sección 3.1) y ábralo con el navegador que usará.',
    'Ingrese con admin / admin123 (datos de ejemplo) y restaure el respaldo.',
])]
h += [h2('5.3 Actualizar el sistema a una versión nueva')]
h += [pasos([
    'Descargue un respaldo (por seguridad).',
    'Cierre el sistema y reemplace el contenido de la carpeta <font face="Mono">pos-html</font> por el de la versión nueva, <b>en la misma ruta</b>.',
    'Abra el sistema como siempre. Los datos se conservan porque están en el navegador, no en los archivos. '
    'Si el sistema incluye productos nuevos del catálogo base, se agregan solos sin duplicar los existentes.',
])]
h += [h2('5.4 Espacio de almacenamiento')]
h += [p('El navegador reserva unos 5 MB por sitio, suficiente para varios miles de ventas. La pantalla <i>Respaldo y '
        'configuración</i> muestra el espacio usado. Si pasa del 80 %:')]
h += [viñetas([
    'Descargue un respaldo completo y guárdelo como histórico.',
    'Si llega al límite, el sistema mostrará "No hay espacio para guardar los datos". Solicite soporte para depurar ventas antiguas a partir del respaldo.',
])]
h += [h2('5.5 Auditoría y control')]
h += [p('En <b>Auditoría</b> se registran las acciones sensibles: inicios de sesión, cambios de precio, entradas y ajustes de '
        'inventario, gastos del turno y sus anulaciones, correcciones de la base, anulaciones de venta, cambios de productos (y devoluciones de dinero autorizadas), aperturas, cierres y reaperturas de turno, creación y cambios de usuarios y cambios '
        'de configuración. Revísela periódicamente, en especial las anulaciones y los ajustes manuales de inventario.')]
h += [figura(C + '/u18-auditoria.jpg', 'Figura 4. Registro de auditoría.', alto_max=8.5 * cm)]
h += [h2('5.6 Corregir un cierre de caja hecho por error')]
h += [p('Un administrador puede reabrir el <b>último</b> turno cerrado desde <b>Turno de caja &gt; Reabrir turno</b>, siempre que '
        'no se haya abierto otro turno después. El turno vuelve a quedar abierto con todas sus ventas, se borra el arqueo y '
        'la reapertura queda en Auditoría con los datos del cierre anulado.')]
h += [h2('5.7 Reiniciar el sistema')]
h += [p('<b>Respaldo y configuración &gt; Borrar todos los datos</b> elimina toda la información del navegador y vuelve a los datos '
        'de ejemplo. Pide escribir BORRAR para confirmar. <b>No se puede deshacer</b>: descargue antes un respaldo.')]

# ------------------------------------------------------------------ 6
h += [PageBreak(), h1('6. Seguridad')]
h += [viñetas([
    'Cambie las contraseñas de ejemplo y asigne un usuario por persona. No comparta el usuario administrador con los cajeros.',
    'Las contraseñas se guardan cifradas (SHA-256 con sal). Aun así, como todo funciona dentro del navegador, alguien con '
    'acceso al equipo y conocimientos técnicos podría leer o modificar los datos. Los roles ordenan el trabajo, pero no '
    'sustituyen el control físico del equipo.',
    'Bloquee la sesión de Windows cuando la caja quede sola y cierre la sesión del POS al terminar el turno.',
    'Los respaldos contienen toda la información del negocio: guárdelos en un lugar privado.',
    'Los productos marcados "(Rx)" requieren fórmula médica. El sistema no la valida: es responsabilidad del personal.',
])]

# ------------------------------------------------------------------ 7
h += [h1('7. Solución de problemas')]
h += [tabla(['Síntoma', 'Causa probable', 'Solución'], [
    ['El sistema aparece vacío o con los datos de ejemplo.', 'Se abrió con otro navegador, desde otra carpeta o en incógnito.',
     'Ábralo con el acceso directo habitual. Si los datos se borraron, restaure el último respaldo.'],
    ['Aviso "Este navegador no permite guardar datos".', 'Ventana privada o almacenamiento bloqueado.',
     'Use una ventana normal y permita los datos del sitio en la configuración del navegador.'],
    ['No sale la ventana del ticket.', 'Ventanas emergentes bloqueadas.', 'Permita las ventanas emergentes para el sistema.'],
    ['El ticket sale en hoja carta o con márgenes.', 'Opciones de impresión.', 'Márgenes: Ninguno, sin encabezados; papel de 80/58 mm (sección 4.3).'],
    ['El lector escribe el código pero no agrega el producto.', 'El lector no envía Enter, o el código no está registrado.',
     'Configure el sufijo Enter. Si aparece "No se encontraron productos", asigne el código en Precios o créelo con "Agregar producto nuevo".'],
    ['"No tiene precio" al vender.', 'Producto del catálogo base sin precio.', 'Asigne el precio en Precios (administrador).'],
    ['No se abre WhatsApp al cerrar la caja.', 'Número no configurado o ventana bloqueada.',
     'Configure el número; use el botón "Enviar resumen por WhatsApp" del resumen de cierre.'],
    ['El dueño no puede abrir "Ver detalle".', 'No tiene acceso al artefacto.', 'Compártale el artefacto en claude.ai o publique el sistema en su sitio.'],
    ['"No hay espacio para guardar los datos".', 'Se llenó el almacenamiento del navegador.', 'Descargue un respaldo y solicite depurar datos antiguos (sección 5.4).'],
    ['Olvidó la contraseña del administrador.', '—', 'Otro administrador puede cambiarla en Usuarios. Si no hay otro, restaure un respaldo del que conozca la clave.'],
], [5, 5, 7])]

# ------------------------------------------------------------------ 8
h += [PageBreak(), h1('8. Anexo técnico')]
h += [h2('8.1 Archivos del sistema')]
h += [tabla(['Archivo', 'Contenido'], [
    ['index.html', 'Punto de entrada. Se abre con doble clic.'],
    ['css/estilos.css', 'Estilos, con tema claro y oscuro automático.'],
    ['js/db.js', 'Almacenamiento en el navegador con escrituras transaccionales.'],
    ['js/servicios.js', 'Reglas de negocio: ventas, turnos, inventario, reportes, usuarios.'],
    ['js/catalogo-base.js', 'Catálogo base de droguería (sin precios).'],
    ['js/precios-texto.js', 'Interpretación de listas de precios en lenguaje natural.'],
    ['js/vistas/*.js', 'Una pantalla por archivo.'],
    ['docs/*.pdf', 'Estos manuales.'],
], [5, 11])]
h += [h2('8.2 Datos en el navegador')]
h += [tabla(['Clave de almacenamiento', 'Contenido'], [
    ['pos_html_db_v1', 'Base de datos completa (la misma que el respaldo .json).'],
    ['pos_html_carrito', 'Ticket en curso, para no perderlo al recargar o cambiar de usuario.'],
    ['pos_html_sesion', 'Sesión activa (solo mientras la pestaña está abierta).'],
], [5, 11])]
h += [p('El sistema no envía datos a ningún servidor. La única información que sale del equipo es el mensaje de cierre, '
        'cuando el usuario lo envía por WhatsApp.')]

construir(SALIDA, 'Manual de instalación,\nconfiguración y mantenimiento',
          'Guía para el administrador del sistema', h)
print('ok', SALIDA)
