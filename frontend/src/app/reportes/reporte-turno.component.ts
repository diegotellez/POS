import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TurnoService } from '../core/services/turno.service';
import { ReporteService } from '../core/services/reporte.service';
import { ReporteTurno, TurnoCaja } from '../core/models/models';

@Component({
  selector: 'app-reporte-turno',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './reporte-turno.component.html',
  styleUrl: './reporte-turno.component.scss',
})
export class ReporteTurnoComponent implements OnInit {
  turnos = signal<TurnoCaja[]>([]);
  turnoSeleccionado: number | null = null;
  reporte = signal<ReporteTurno | null>(null);

  constructor(
    private turnoService: TurnoService,
    private reporteService: ReporteService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.turnoService.listar().subscribe((turnos) => {
      this.turnos.set(turnos);
      if (turnos.length) {
        this.turnoSeleccionado = turnos[0].id;
        this.cargarReporte();
      }
    });
  }

  cargarReporte(): void {
    if (!this.turnoSeleccionado) return;
    this.reporteService.reporteTurno(this.turnoSeleccionado).subscribe((r) => this.reporte.set(r));
  }

  descargarPDF(): void {
    if (!this.turnoSeleccionado) return;
    this.reporteService.descargarPDF(this.turnoSeleccionado).subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-turno-${this.turnoSeleccionado}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  enviarWhatsApp(): void {
    if (!this.turnoSeleccionado) return;
    this.reporteService.enviarWhatsApp(this.turnoSeleccionado).subscribe({
      next: () =>
        this.snackBar.open('Se abrió el explorador de archivos y WhatsApp para enviar el reporte', 'Cerrar', {
          duration: 5000,
        }),
      error: (err) =>
        this.snackBar.open(err.error?.error || 'No se pudo abrir WhatsApp', 'Cerrar', { duration: 4000 }),
    });
  }
}
