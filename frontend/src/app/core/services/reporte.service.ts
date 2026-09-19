import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReporteTurno } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private base = '/api/reportes';

  constructor(private http: HttpClient) {}

  reporteTurno(turnoId: number): Observable<ReporteTurno> {
    return this.http.get<ReporteTurno>(`${this.base}/turno/${turnoId}`);
  }

  descargarPDF(turnoId: number): Observable<Blob> {
    return this.http.get(`${this.base}/turno/${turnoId}/pdf`, { responseType: 'blob' });
  }

  enviarWhatsApp(turnoId: number): Observable<any> {
    return this.http.post(`${this.base}/turno/${turnoId}/whatsapp`, {});
  }
}
