# Sistema POS — versión HTML/CSS/JS

Versión del punto de venta hecha solo con HTML, CSS y JavaScript. No hay que
compilar ni instalar nada, y no necesita Node, servidor ni internet.

## Cómo usarlo

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
- **Un catálogo base de 256 productos habituales sin precio** (`js/catalogo-base.js`),
  en 22 categorías: medicamentos por grupo, vitaminas, cuidado personal, higiene
  femenina, primeros auxilios, bebé, adulto mayor y misceláneos. Los que exigen
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

## Funcionalidades

Son las mismas de la versión Angular + Express:

- **Ventas**: búsqueda por nombre y lectura de código de barras con lector USB
  (Enter agrega el producto), carrito, cobro con varios métodos de pago
  (efectivo, tarjeta, transferencia), cálculo del cambio, datos opcionales del
  cliente y atajo **F2** para cobrar.
- **Ticket** imprimible de 80 mm o 58 mm desde el diálogo de impresión del navegador.
- **Historial de ventas**: filtros por turno, estado y fechas; detalle,
  reimpresión y anulación con motivo (el stock se devuelve al inventario).
- **Turno de caja**: apertura con base inicial y cierre con arqueo
  (efectivo esperado contra contado, marcando faltante o sobrante).
- **Productos y categorías** (con subcategorías). El código interno se genera solo.
- **Inventario**: entradas de mercancía, ajustes manuales, historial de
  movimientos y alertas de stock bajo.
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
js/servicios.js     reglas de negocio (equivalente a backend/src/services)
js/app.js           arranque, enrutador (#/ruta) y menú
js/vistas/*.js      una pantalla por archivo
```

Los scripts son clásicos (sin `import`/`export`) porque varios navegadores
bloquean los módulos ES cuando la página se abre con `file://`.
