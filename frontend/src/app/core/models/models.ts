export type Rol = 'CAJERO' | 'ADMINISTRADOR';

export interface Usuario {
  id: number;
  nombreUsuario?: string;
  nombre_usuario?: string;
  rol: Rol;
  activo?: number | boolean;
}

export interface Categoria {
  id: number;
  nombre: string;
  categoria_padre_id: number | null;
}

export interface Producto {
  id: number;
  codigo_barras: string | null;
  codigo_interno: string;
  nombre: string;
  descripcion: string | null;
  categoria_id: number | null;
  categoria_nombre?: string;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
  tasa_impuesto: number | null;
  activo: number;
}

export interface TurnoCaja {
  id: number;
  usuario_apertura_id: number;
  fecha_hora_apertura: string;
  base_inicial_efectivo: number;
  usuario_cierre_id: number | null;
  fecha_hora_cierre: string | null;
  efectivo_contado: number | null;
  diferencia_arqueo: number | null;
  estado: 'ABIERTO' | 'CERRADO';
  usuario_apertura?: string;
  usuario_cierre?: string;
  efectivoEsperado?: number;
}

export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';

export interface ItemCarrito {
  productoId: number;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  stockDisponible: number;
}

export interface PagoVenta {
  metodoPago: MetodoPago;
  monto: number;
}

export interface DetalleVenta {
  id: number;
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Venta {
  id: number;
  turno_caja_id: number;
  usuario_id: number;
  cliente_id: number | null;
  fecha_hora: string;
  total: number;
  estado: 'COMPLETADA' | 'ANULADA';
  motivo_anulacion: string | null;
  nombre_usuario?: string;
  cliente_nombre?: string;
  detalle?: DetalleVenta[];
  pagos?: PagoVenta[];
}

export interface AlertaStock {
  productoId: number;
  nombre: string;
  stock: number;
  stockMinimo: number;
  agotado: boolean;
}

export interface ResultadoVenta {
  venta: Venta;
  alertasStock: AlertaStock[];
}

export interface MovimientoInventario {
  id: number;
  producto_id: number;
  producto_nombre: string;
  tipo: 'ENTRADA' | 'SALIDA_POR_VENTA' | 'AJUSTE_ANULACION' | 'AJUSTE_MANUAL';
  cantidad: number;
  fecha_hora: string;
  referencia: string | null;
}

export interface ReporteTurno {
  turno: TurnoCaja;
  totalVentas: number;
  cantidadVentas: number;
  porMetodoPago: { metodo_pago: MetodoPago; total: number }[];
  porUsuario: { nombre_usuario: string; total: number; cantidad_ventas: number }[];
  ventas: Venta[];
  arqueo: {
    baseInicial: number;
    efectivoVentas: number;
    efectivoEsperado: number;
    efectivoContado: number | null;
    diferencia: number | null;
  };
}
