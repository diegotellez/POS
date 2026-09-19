import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Categoria } from '../models/models';

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private base = '/api/categorias';

  constructor(private http: HttpClient) {}

  listar(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.base);
  }

  crear(nombre: string, categoriaPadreId: number | null): Observable<Categoria> {
    return this.http.post<Categoria>(this.base, { nombre, categoriaPadreId });
  }

  actualizar(id: number, nombre: string, categoriaPadreId: number | null): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.base}/${id}`, { nombre, categoriaPadreId });
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
