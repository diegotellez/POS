import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TurnoCaja } from '../models/models';

@Injectable({ providedIn: 'root' })
export class TurnoService {
  private base = '/api/turnos';

  constructor(private http: HttpClient) {}

  actual(): Observable<TurnoCaja | null> {
    return this.http.get<TurnoCaja | null>(`${this.base}/actual`);
  }

  abrir(baseInicialEfectivo: number): Observable<TurnoCaja> {
    return this.http.post<TurnoCaja>(`${this.base}/abrir`, { baseInicialEfectivo });
  }

  cerrar(id: number, efectivoContado: number): Observable<TurnoCaja> {
    return this.http.post<TurnoCaja>(`${this.base}/${id}/cerrar`, { efectivoContado });
  }

  listar(): Observable<TurnoCaja[]> {
    return this.http.get<TurnoCaja[]>(this.base);
  }

  obtener(id: number): Observable<TurnoCaja> {
    return this.http.get<TurnoCaja>(`${this.base}/${id}`);
  }
}
