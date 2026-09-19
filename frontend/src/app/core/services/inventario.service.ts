import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MovimientoInventario, Producto } from '../models/models';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private base = '/api/inventario';

  constructor(private http: HttpClient) {}

  registrarEntrada(productoId: number, cantidad: number, referencia?: string): Observable<Producto> {
    return this.http.post<Producto>(`${this.base}/entradas`, { productoId, cantidad, referencia });
  }

  ajustarManual(productoId: number, nuevoStock: number, motivo: string): Observable<Producto> {
    return this.http.post<Producto>(`${this.base}/ajustes`, { productoId, nuevoStock, motivo });
  }

  movimientos(productoId?: number): Observable<MovimientoInventario[]> {
    const params: Record<string, string> = {};
    if (productoId) params['productoId'] = String(productoId);
    return this.http.get<MovimientoInventario[]>(`${this.base}/movimientos`, { params });
  }

  stockBajo(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.base}/stock-bajo`);
  }
}
