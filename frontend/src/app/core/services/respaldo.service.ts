import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RespaldoService {
  private base = '/api/respaldo';

  constructor(private http: HttpClient) {}

  respaldarAUSB(ruta: string): Observable<{ destino: string }> {
    return this.http.post<{ destino: string }>(`${this.base}/usb`, { ruta });
  }

  respaldarADrive(ruta: string): Observable<{ destino: string }> {
    return this.http.post<{ destino: string }>(`${this.base}/drive`, { ruta });
  }
}
