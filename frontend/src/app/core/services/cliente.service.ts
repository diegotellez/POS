import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Cliente {
  id: number;
  nombre: string | null;
  documento: string | null;
}

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private base = '/api/clientes';

  constructor(private http: HttpClient) {}

  buscar(termino: string): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${this.base}/buscar`, { params: { q: termino } });
  }
}
