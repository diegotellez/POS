# Sistema POS — versión HTML/CSS/JS

**Versión 2.6** (octubre de 2026). La versión aparece en la pantalla de inicio de sesión y en *Respaldo*.

Versión del punto de venta hecha solo con HTML, CSS y JavaScript. No hay que
compilar ni instalar nada, y no necesita Node, servidor ni internet.

## En preparación (próxima versión)

- **Turnos por usuario**: cada usuario abre su propio turno con su base, vende,
  registra gastos y cambios en él y lo cierra con su arqueo (por ejemplo, el
  administrador en el turno #1 y el cajero en el #2 al mismo tiempo). El
  administrador ve los turnos abiertos de los demás y puede cerrarlos o reabrirlos.

## Novedades de la versión 2.6

- **Compras desde el ZIP de la factura electrónica**: subir o arrastrar el ZIP tal
  como llega al correo (uno o varios); el POS saca el XML y carga la factura. Las
  demás quedan en "Facturas por cargar"; las ya registradas se avisan.
- **Cajón con "Ayudante de Windows"** (carpeta `ayudante-cajon`): para el cajón
  conectado a la impresora cuando el controlador no lo abre. Envía la orden de
  apertura en modo RAW al confirmar un pago en efectivo.
- Inicio de sesión con el nombre de la droguería y la versión junto al logo.
- **Iniciar la fase productiva** (Zona de peligro): borra compras, ventas, turnos,
  gastos y movimientos de prueba; conserva catálogo, precios, usuarios,
  configuración, proveedores y empleados; la numeración empieza en 1.

## Novedades de la versión 2.5

- **Actualizaciones automáticas**: instalado desde la dirección web, el POS
  funciona sin internet y avisa cuando hay una versión nueva. Botón para pasar
  los datos desde la copia en carpeta.
- **Productos**: eliminar de verdad (los que tienen historial se desactivan),
  eliminar varios a la vez, precio de compra y ganancia calculada.
- **No se vende sin stock** (configurable en Configuración).
- **Cajón** al confirmar la venta en efectivo; la ventana del ticket se cierra sola.
- **Ticket** al ancho que imprime la térmica (48 mm en papel de 58 mm), sin
  margen izquierdo y con letra más oscura; ancho y margen ajustables.

## Novedades de la versión 2.4.1

- Ventas lista todas las categorías, también las que aún no tienen productos
  (se ven con borde punteado y su conteo en 0).

## Novedades de la versión 2.4

- **Compras: cargar factura completa** de una vez, con borrador que se guarda
  solo. Líneas buscando o escaneando, importando el **XML de factura
  electrónica (DIAN)** o pegando JSON/CSV (por ejemplo, el que prepara Claude
  desde una foto). Cantidad, bonificación, costo, precio de venta con margen,
  lote, vencimiento y casilla de verificado por línea.
- Recuerda el código de cada producto en cada proveedor; une la bonificación con
  la compra (proveedores que usan el primer dígito del código, como Roma).
- "Crear todos los que faltan" para la primera factura de un proveedor.
- Facturas a crédito por pagar (el pago queda como gasto Pedidos) y aviso de
  productos próximos a vencer (no bloquea la venta).

## Novedades de la versión 2.3.1

- Botón "Imprimir ticket de prueba" (Respaldo y configuración > Cajón monedero).
- Manual de instalación: cómo revisar el puerto USB de la impresora térmica en
  Windows (si al imprimir pide guardar un archivo, el puerto quedó en FILE:).

## Novedades de la versión 2.3

- **Cajón monedero**: se abre solo al cobrar en efectivo (ventas, cambios con
  excedente en efectivo y gastos en efectivo). Dos modos: "Al imprimir" (el
  ticket se imprime solo y el controlador de la impresora abre el cajón) o
  "Directo" (orden ESC/POS por Web Serial en Chrome/Edge). Botón "Abrir cajón"
  en Ventas, registrado en Auditoría.
- **Formas de pago**: Efectivo, Nequi, QR y Transferencia (Tarjeta se reemplazó
  por Nequi; las ventas antiguas con tarjeta se siguen reportando).
- **Gastos**: tipos Pedidos, Servicios, Sueldos y Otros. Sueldos semanales por
  empleado con adelantos: el pago de la semana sugiere lo pendiente (sueldo
  menos adelantos) y hay un resumen por empleado.
- **Ventas mensuales en Excel** (.xlsx) con las hojas Categoría, Método, Día a
  día y Detalle.

## Novedades de la versión 2.2

- Devolver / Cambiar en tres pasos: qué devuelve, qué se lleva a cambio (buscar o
  escanear) y cuánto paga. Muestra devuelve / se lleva / paga, cobra el excedente
  y en efectivo calcula el cambio a entregar.

## Novedades de la versión 2.1.1

- Historial: el botón "Devolver / Cambiar" (antes "Cambiar") y "Anular" ya no se
  salen de la tabla en pantallas angostas, y también están en "Ver detalle".

## Novedades de la versión 2.1

- Ventas: todas las categorías arriba (ordenadas y sin scroll), búsqueda debajo y
  búsqueda en una o varias categorías.

## Novedades de la versión 2.0

- Categorías visibles al vender, con filtro por categoría principal.
- El cajero puede poner y corregir la base cuando no está el administrador.
- Reporte de ventas mensuales.
- Gastos y pedidos pagados en cada turno, descontados del efectivo esperado.
- Cambios de productos desde el historial (sin devolución de dinero, salvo excepción autorizada).
- Productos de la vitrina de maquillaje y de la nevera en el catálogo base.

## Instalación en línea con actualizaciones automáticas (recomendada)

Abra `https://diegotellez.github.io/POS/` en Chrome o Edge e instálelo como
aplicación (ícono **Instalar** de la barra de direcciones, o *Respaldo y
configuración > Actualizaciones automáticas*). Queda guardado en el equipo y
funciona sin internet; cuando se publica una versión nueva aparece el aviso
**"Hay una versión nueva · Actualizar ahora"**. Los datos no se tocan.

Para pasar los datos desde la copia en carpeta: *Respaldo y configuración >
Actualizaciones automáticas > Pasar a la versión con actualizaciones*.
Cómo se publica una versión: `scripts/PUBLICAR.md`.

## Cómo usarlo (copia en carpeta)

1. Copia la carpeta `pos-html/` al equipo (o a una USB).
2. Abre `index.html` con doble clic en Chrome, Edge, Firefox o Safari.
3. Inicia sesión con los usuarios de ejemplo y **cambia sus contraseñas** en *Usuarios*:

| Usuario | Contraseña | Rol           |
|---------|------------|---------------|
| admin   | admin123   | ADMINISTRADOR |
| cajero  | cajero123  | CAJERO        |

El primer arranque trae un catálogo de droguería:

- **17 productos de ejemplo con precio** (en pesos colombianos) y stock, para
  probar ventas, alertas de stock bajo y reportes.
- **Un catálogo base de 288 productos habituales sin precio** (`js/catalogo-base.js`),
  en 23 categorías: medicamentos por grupo, vitaminas, cuidado personal, higiene
  femenina, maquillaje y uñas, primeros auxilios, bebé, adulto mayor y misceláneos. Los que exigen
  fórmula médica están marcados "(Rx)". Un producto sin precio no se puede vender.

### Cargar precios rápido

En **Precios** (solo administrador):

- Escribe el precio y presiona Enter para pasar al siguiente producto. El filtro
  "Solo sin precio" muestra lo que falta y la barra muestra el avance.
- Para asignar el código de barras real, haz clic en su casilla y escanea: el
  cursor salta al precio del mismo producto.
- **Cargar desde WhatsApp o texto**: pega mensajes como
  `Dolex niños 10+, 14 mil` o `Advil max a 8.500. Noxpirin 3500`. Entiende
  "14 mil", "14.000", "14k", "14 lucas" y precios en palabras ("catorce mil
  quinientos"), y no confunde la presentación (500 mg, x 10, 2+) con el precio.
  Cada renglón se empareja con el catálogo y se puede revisar antes de guardar;
  lo que no existe se crea como producto nuevo. Para un audio de WhatsApp: mantén
  presionada la nota de voz, elige **Transcribir** y copia el texto.

Si prefieres servirla desde un servidor web, sirve la carpeta como archivos
estáticos (por ejemplo `python3 -m http.server` dentro de `pos-html/`).

## Manuales

En `docs/`:

- **Manual de instalación, configuración y mantenimiento** (PDF): requisitos,
  instalación, acceso directo, impresora, lector, WhatsApp, respaldos,
  actualización, seguridad y solución de problemas.
- **Manual del Usuario** (PDF): uso diario para cajeros, funciones del
  administrador y lo que recibe el dueño al cierre de caja.

## Funcionalidades

Son las mismas de la versión Angular + Express:

- **Ventas**: búsqueda por nombre y lectura de código de barras con lector USB
  (Enter agrega el producto), carrito, cobro con varios métodos de pago
  (efectivo, Nequi, QR, transferencia), cálculo del cambio, datos opcionales del
  cliente y atajo **F2** para cobrar. El ticket en curso se guarda en el
  navegador: no se pierde al cambiar de pantalla, recargar o cerrar sesión.
  Si un producto buscado o escaneado no existe, el administrador lo crea ahí
  mismo con "Agregar producto nuevo" (el código escaneado queda prellenado) y
  pasa directo al ticket.
- **Ticket** imprimible de 80 mm o 58 mm desde el diálogo de impresión del navegador.
- **Historial de ventas**: filtros por turno, estado y fechas; detalle,
  reimpresión y anulación con motivo (el stock se devuelve al inventario).
- **Cambios de productos**: botón "Devolver / Cambiar" en el historial (y en el detalle de la venta) para editar lo que
  el cliente se lleva de una venta (devuelve unos productos, lleva otros). Si
  lleva más valor paga la diferencia; si lleva menos, por norma **no se
  devuelve dinero** (queda como saldo no devuelto). Solo un administrador puede
  autorizar una devolución excepcional, con motivo. El cambio se registra en el
  turno del día, ajusta el inventario, tiene su comprobante y aparece en el
  cierre y en Auditoría.
- **Turno de caja**: apertura con base inicial (la puede poner un cajero si no
  está el administrador, y corregirla después con motivo) y cierre con arqueo
  (efectivo esperado contra contado, marcando faltante o sobrante).
- **Gastos y pedidos pagados** en cada turno: tipo (Pedidos, Servicios, Sueldos u Otros), valor y método de
  pago. Lo pagado en efectivo se descuenta del efectivo esperado; aparecen en el
  cierre, el WhatsApp del dueño y los reportes. El administrador los puede anular. El resumen
  del cierre lista **todos** los productos vendidos. Si hay un número de
  WhatsApp configurado, al cerrar se abre WhatsApp con ese número y un mensaje
  corto ya escrito (lo vendido, formas de pago y cuadre de caja) con un enlace
  **"Ver detalle"**: al abrirlo, el dueño ve el cierre completo (todos los
  productos, arqueo, cajeros) sin iniciar sesión. El cierre va codificado
  dentro del enlace, así que no depende de los datos del equipo que lo abre
  ni de que la caja tenga internet. La dirección base se configura en
  "Enlace de la app para ver cierres". Solo falta tocar "Enviar"; si el
  navegador bloquea la ventana, queda el botón "Enviar resumen por WhatsApp". Un administrador puede
  **reabrir el último turno** si se cerró por error: vuelve a quedar abierto
  con sus ventas, se borra el arqueo y queda registrado en Auditoría.
- **Productos y categorías** (con subcategorías). El código interno se genera solo.
- **Inventario**: compras (entrada de mercancía) con enlace "Nuevo producto"
  para crear en el momento lo que llegó y no existía, ajustes manuales,
  historial de movimientos y alertas de stock bajo.
- **Ventas mensuales**: total, ventas, promedio diario, ticket promedio, mejor
  día, gráfico por día, por categoría, por método de pago, gastos y ventas menos
  gastos; imprimible y descargable en Excel (hojas Categoría, Método, Día a día
  y Detalle).
- **Categorías al vender**: arriba de Ventas están todas las categorías en orden
  alfabético, a la vista sin scroll; debajo, la barra de búsqueda. Se pueden
  elegir una o varias categorías (cada una incluye sus subcategorías) y la
  búsqueda se hace solo en ellas; sin ninguna elegida, busca en todas. Encima de
  los resultados se indica dónde se está buscando. El lector de código de barras
  encuentra el producto sin importar el filtro.
- **Reportes por turno**: totales, desglose por método de pago, por usuario y
  por producto, e impresión o **Guardar como PDF**. También exporta a CSV y
  envía un resumen por WhatsApp (`wa.me`).
- **Usuarios y roles** (CAJERO / ADMINISTRADOR) y **auditoría** de las acciones sensibles.
- **Configuración**: nombre del negocio, NIT, moneda y decimales, ancho del
  ticket y número de WhatsApp.
- **Respaldo**: descarga un archivo `.json` y lo restaura.

## Dónde se guardan los datos

Todo se guarda en el `localStorage` **de ese navegador en ese equipo**:

- Otro navegador u otro PC no ven los mismos datos. Para pasarlos, usa
  *Respaldo → Descargar respaldo* y luego *Restaurar respaldo*.
- Si se borran los datos de navegación del sitio, o si se usa el modo
  privado, **se pierde la información**. Descarga un respaldo con frecuencia
  (por ejemplo al cerrar cada turno) y guárdalo en una USB o en una carpeta de
  Google Drive.
- El navegador da unos 5 MB por sitio, lo que alcanza para varios miles de
  ventas. La pantalla de Respaldo muestra el espacio usado.
- Si hay varias pestañas abiertas, cada operación relee los datos más
  recientes antes de guardar.

## Diferencias con la versión con backend

- Las contraseñas se guardan con hash (SHA-256 con sal), pero como todo corre
  en el navegador, alguien con acceso al equipo y conocimientos técnicos podría
  leer o modificar los datos. Los roles sirven para ordenar el trabajo; no son
  una barrera de seguridad fuerte.
- No imprime directo a impresoras térmicas ESC/POS. Usa el diálogo de impresión
  del navegador; con la térmica instalada como impresora del sistema funciona igual.
- El PDF se genera con *Imprimir → Guardar como PDF* del navegador.
- Es para un solo equipo: no hay sincronización entre cajas.

## Estructura

```
index.html          punto de entrada
css/estilos.css     estilos (misma paleta que la versión Angular)
js/sha256.js        hash de contraseñas (JS puro)
js/util.js          formato, íconos SVG, avisos y diálogos
js/db.js            almacenamiento en localStorage con transacciones
js/catalogo-base.js catálogo base de droguería (sin precios)
js/precios-texto.js interpreta listas de precios en lenguaje natural (WhatsApp)
js/cajon.js         apertura del cajón monedero (impresión o ESC/POS por Web Serial)
js/xlsx.js          generador de Excel (.xlsx) sin librerías
js/zip-lector.js    abre el ZIP de la factura electrónica en el navegador
ayudante-cajon/     ayudante de Windows para abrir el cajón (instalar.bat)
js/servicios.js     reglas de negocio (equivalente a backend/src/services)
js/app.js           arranque, enrutador (#/ruta) y menú
js/actualizaciones.js modo sin internet, aviso de versión nueva, instalar y pasar datos
sw.js               service worker (copia en el equipo; lista generada por scripts/version.py)
manifest.webmanifest, iconos/  datos e íconos para instalar como aplicación
version.json        versión publicada y notas del aviso
js/vistas/*.js      una pantalla por archivo (compras.js: carga de facturas)
docs/*.pdf          manuales de instalación y de usuario
```

Los scripts son clásicos (sin `import`/`export`) porque varios navegadores
bloquean los módulos ES cuando la página se abre con `file://`.
