# Sistema POS Web (ejecución local)

Aplicación de Punto de Venta pensada para un único punto de venta: corre
completa en el PC del negocio (backend + frontend en un único proceso Node)
y se usa desde el navegador en `http://localhost:3000`, sin depender de
internet para la operación diaria.

## Stack

- **Backend**: Node.js + Express (API REST), SQLite (`better-sqlite3`),
  arquitectura en capas `routes/controllers` → `services` → `data/repositories`.
- **Frontend**: Angular (standalone components) + Angular Material, con un
  tema personalizado (paleta del template "Stocker": verde `#00D084`,
  azul marino `#17303B`, fondo `#F8F8F8`, texto `#787878`, alerta `#FF5722`).
  Tipografías Inter/Roboto e íconos Material están **alojados localmente**
  (no vía Google Fonts CDN), para que la interfaz funcione sin conexión.
- **Impresión de tickets**: `node-thermal-printer` (ESC/POS) si hay una
  impresora térmica configurada; si no, un comprobante HTML imprimible
  desde el navegador (ancho fijo 58/80mm) como respaldo.
- **Reportes**: PDF generado en el backend con `pdfkit`.

## Estructura

```
backend/    API REST + servidor Express (sirve también el frontend compilado)
frontend/   Aplicación Angular (SPA)
scripts/    Utilidades (build.sh: compila el frontend y lo copia al backend)
```

## Puesta en marcha

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # ajusta JWT_SECRET, WHATSAPP_NUMERO, etc. si quieres
npm run seed               # crea usuarios y datos de ejemplo
npm start                  # arranca en http://localhost:3000
```

Usuarios de ejemplo creados por el seed:

| Usuario | Contraseña | Rol            |
|---------|------------|----------------|
| admin   | admin123   | ADMINISTRADOR  |
| cajero  | cajero123  | CAJERO         |

**Cámbialas antes de usar el sistema en producción.**

### 2. Frontend

Angular es la única parte del stack que requiere compilación (`ng build`).
Desde la raíz del repo puedes usar el script de conveniencia:

```bash
./scripts/build.sh
```

Esto instala dependencias si hace falta, corre `ng build` y copia el
resultado (`frontend/dist/frontend/browser`) a `backend/public`, que es lo
que Express sirve como archivos estáticos.

Manualmente sería:

```bash
cd frontend
npm install
npx ng build
rm -rf ../backend/public && mkdir -p ../backend/public
cp -r dist/frontend/browser/* ../backend/public/
```

Después de compilar, con el backend corriendo (`npm start` en `backend/`),
abre `http://localhost:3000` en el navegador.

### Desarrollo del frontend con recarga en caliente

Para iterar sobre el frontend sin recompilar cada vez, usa `ng serve` con
proxy hacia el backend (el backend debe estar corriendo en el puerto 3000):

```bash
cd frontend
npx ng serve --proxy-config proxy.conf.json
```

## Módulos funcionales

- **Productos**: CRUD con código de barras opcional (se autogenera un
  código interno con prefijo `2` si no hay código de barras), categorías
  jerárquicas, búsqueda rápida.
- **Ventas**: pantalla de dos columnas (búsqueda/catálogo a la izquierda,
  ticket a la derecha). El lector de código de barras USB emula teclado:
  al escribir un código y presionar Enter, el producto se agrega solo.
  Pago mixto (efectivo + tarjeta + transferencia, validado contra el total).
  Descuento de stock atómico; vender con stock en 0 se permite pero alerta.
- **Turnos de caja**: apertura (base inicial), cierre con arqueo
  (efectivo esperado vs. contado, diferencia). El "día de negocio" lo
  define el turno abierto→cerrado, no la fecha calendario.
- **Anulación de ventas**: cualquier usuario puede anular; restaura stock
  y queda registrado en el log de auditoría (usuario, fecha, motivo).
- **Inventario**: entradas de mercancía, ajustes manuales, historial de
  movimientos, alertas de stock bajo.
- **Reportes**: consolidado por turno (total, desglose por método de pago
  y por usuario, resultado del arqueo), exportable a PDF y con un botón
  para abrir el explorador de archivos + WhatsApp Web/Desktop y enviarlo
  manualmente (configurar `WHATSAPP_NUMERO` en `.env`).
- **Usuarios y roles**: Cajero (vender, abrir/cerrar su turno) y
  Administrador (todo lo anterior + productos, categorías, usuarios,
  reportes, ajustes de inventario, respaldo).
- **Respaldo de base de datos**: copia manual del archivo `.db` a una
  unidad USB o a una carpeta local sincronizada con Google Drive Desktop
  (solo copia de archivo; la base de trabajo nunca se mueve de su ruta local).

## Escalabilidad futura (no implementada, pero no bloqueada)

El modelo de datos ya reserva `tasa_impuesto` en productos para IVA, y el
comprobante de venta está aislado en `impresionService`/`reporteService`
para poder integrar facturación electrónica DIAN más adelante. Los
`services` del backend son independientes de Express, por lo que extender
la API para varias cajas en red (y migrar de SQLite a PostgreSQL/SQL
Server) no requiere rediseño mayor.
