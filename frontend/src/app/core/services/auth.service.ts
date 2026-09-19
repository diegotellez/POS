import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Usuario } from '../models/models';

const TOKEN_KEY = 'pos_token';
const USUARIO_KEY = 'pos_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  usuario = signal<Usuario | null>(this.leerUsuarioGuardado());

  constructor(private http: HttpClient) {}

  private leerUsuarioGuardado(): Usuario | null {
    try {
      const raw = localStorage.getItem(USUARIO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  login(nombreUsuario: string, password: string): Observable<{ token: string; usuario: Usuario }> {
    return this.http
      .post<{ token: string; usuario: Usuario }>('/api/auth/login', { nombreUsuario, password })
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.token);
          localStorage.setItem(USUARIO_KEY, JSON.stringify(res.usuario));
          this.usuario.set(res.usuario);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    this.usuario.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  estaAutenticado(): boolean {
    return !!this.getToken();
  }

  esAdministrador(): boolean {
    return this.usuario()?.rol === 'ADMINISTRADOR';
  }
}
