import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Producto } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private base = '/api/productos';

  constructor(private http: HttpClient) {}

  listar(soloActivos = false): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.base, { params: { soloActivos } });
  }

  buscar(termino: string): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.base}/buscar`, { params: { q: termino } });
  }

  obtenerPorCodigo(codigo: string): Observable<Producto> {
    return this.http.get<Producto>(`${this.base}/codigo/${encodeURIComponent(codigo)}`);
  }

  stockBajo(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.base}/stock-bajo`);
  }

  crear(producto: Partial<Producto> & { codigoBarras?: string; codigoInterno?: string; categoriaId?: number; precioVenta?: number; stockMinimo?: number }): Observable<Producto> {
    return this.http.post<Producto>(this.base, producto);
  }

  actualizar(id: number, producto: any): Observable<Producto> {
    return this.http.put<Producto>(`${this.base}/${id}`, producto);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
