-- Esquema del sistema POS. La regla de negocio clave: el "dia de negocio"
-- lo define el turno de caja abierto->cerrado, no la fecha calendario.
-- Todas las ventas se asocian a un turno_caja_id.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categorias (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre              TEXT NOT NULL,
  categoria_padre_id  INTEGER NULL REFERENCES categorias(id)
);

CREATE TABLE IF NOT EXISTS productos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_barras   TEXT NULL UNIQUE,
  codigo_interno  TEXT NOT NULL UNIQUE,
  nombre          TEXT NOT NULL,
  descripcion     TEXT NULL,
  categoria_id    INTEGER NULL REFERENCES categorias(id),
  precio_venta    REAL NOT NULL DEFAULT 0,
  stock           INTEGER NOT NULL DEFAULT 0,
  stock_minimo    INTEGER NOT NULL DEFAULT 0,
  tasa_impuesto   REAL NULL,
  activo          INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);

CREATE TABLE IF NOT EXISTS usuarios (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_usuario  TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  rol             TEXT NOT NULL CHECK (rol IN ('CAJERO','ADMINISTRADOR')),
  activo          INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS turnos_caja (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_apertura_id     INTEGER NOT NULL REFERENCES usuarios(id),
  fecha_hora_apertura     TEXT NOT NULL,
  base_inicial_efectivo   REAL NOT NULL DEFAULT 0,
  usuario_cierre_id       INTEGER NULL REFERENCES usuarios(id),
  fecha_hora_cierre       TEXT NULL,
  efectivo_contado        REAL NULL,
  diferencia_arqueo       REAL NULL,
  estado                  TEXT NOT NULL CHECK (estado IN ('ABIERTO','CERRADO')) DEFAULT 'ABIERTO'
);

CREATE TABLE IF NOT EXISTS clientes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT NULL,
  documento   TEXT NULL
);

CREATE TABLE IF NOT EXISTS ventas (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  turno_caja_id           INTEGER NOT NULL REFERENCES turnos_caja(id),
  usuario_id              INTEGER NOT NULL REFERENCES usuarios(id),
  cliente_id              INTEGER NULL REFERENCES clientes(id),
  fecha_hora              TEXT NOT NULL,
  total                   REAL NOT NULL DEFAULT 0,
  estado                  TEXT NOT NULL CHECK (estado IN ('COMPLETADA','ANULADA')) DEFAULT 'COMPLETADA',
  motivo_anulacion        TEXT NULL,
  fecha_hora_anulacion    TEXT NULL,
  usuario_anulacion_id    INTEGER NULL REFERENCES usuarios(id)
);
CREATE INDEX IF NOT EXISTS idx_ventas_turno ON ventas(turno_caja_id);

CREATE TABLE IF NOT EXISTS detalle_ventas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id        INTEGER NOT NULL REFERENCES ventas(id),
  producto_id     INTEGER NOT NULL REFERENCES productos(id),
  cantidad        REAL NOT NULL,
  precio_unitario REAL NOT NULL,
  subtotal        REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_detalle_venta ON detalle_ventas(venta_id);

CREATE TABLE IF NOT EXISTS pagos_venta (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id      INTEGER NOT NULL REFERENCES ventas(id),
  metodo_pago   TEXT NOT NULL CHECK (metodo_pago IN ('EFECTIVO','TARJETA','TRANSFERENCIA')),
  monto         REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pagos_venta ON pagos_venta(venta_id);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id   INTEGER NOT NULL REFERENCES productos(id),
  tipo          TEXT NOT NULL CHECK (tipo IN ('ENTRADA','SALIDA_POR_VENTA','AJUSTE_ANULACION','AJUSTE_MANUAL')),
  cantidad      REAL NOT NULL,
  fecha_hora    TEXT NOT NULL,
  referencia    TEXT NULL
);
CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_inventario(producto_id);

CREATE TABLE IF NOT EXISTS log_auditoria (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id    INTEGER NULL REFERENCES usuarios(id),
  accion        TEXT NOT NULL,
  detalle       TEXT NULL,
  fecha_hora    TEXT NOT NULL
);
