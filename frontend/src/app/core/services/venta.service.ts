import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagoVenta, ResultadoVenta, Venta } from '../models/models';

export interface NuevaVentaPayload {
  turnoCajaId: number;
  cliente?: { id?: number; nombre?: string; documento?: string };
  items: { productoId: number; cantidad: number; precioUnitario?: number }[];
  pagos: PagoVenta[];
}

@Injectable({ providedIn: 'root' })
export class VentaService {
  private base = '/api/ventas';

  constructor(private http: HttpClient) {}

  crear(payload: NuevaVentaPayload): Observable<ResultadoVenta> {
    return this.http.post<ResultadoVenta>(this.base, payload);
  }

  obtener(id: number): Observable<Venta> {
    return this.http.get<Venta>(`${this.base}/${id}`);
  }

  listarPorTurno(turnoId: number): Observable<Venta[]> {
    return this.http.get<Venta[]>(`${this.base}/turno/${turnoId}`);
  }

  listar(filtros: { desde?: string; hasta?: string; estado?: string } = {}): Observable<Venta[]> {
    return this.http.get<Venta[]>(this.base, { params: filtros as any });
  }

  anular(id: number, motivo: string): Observable<Venta> {
    return this.http.post<Venta>(`${this.base}/${id}/anular`, { motivo });
  }

  obtenerTicketHtml(id: number): Observable<string> {
    return this.http.get(`${this.base}/${id}/ticket`, { responseType: 'text' });
  }

  imprimir(id: number): Observable<{ impreso: boolean; motivo?: string }> {
    return this.http.post<{ impreso: boolean; motivo?: string }>(`${this.base}/${id}/imprimir`, {});
  }
}
