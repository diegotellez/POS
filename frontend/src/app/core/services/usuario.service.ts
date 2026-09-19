import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Rol, Usuario } from '../models/models';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private base = '/api/usuarios';

  constructor(private http: HttpClient) {}

  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.base);
  }

  crear(nombreUsuario: string, password: string, rol: Rol): Observable<Usuario> {
    return this.http.post<Usuario>(this.base, { nombreUsuario, password, rol });
  }

  actualizar(id: number, rol: Rol, activo: boolean): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.base}/${id}`, { rol, activo });
  }

  cambiarPassword(id: number, password: string): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/password`, { password });
  }
}
