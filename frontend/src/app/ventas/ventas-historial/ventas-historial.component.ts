import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { VentaService } from '../../core/services/venta.service';
import { Venta } from '../../core/models/models';
import { MotivoDialogComponent } from './motivo-dialog.component';

@Component({
  selector: 'app-ventas-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatTableModule, MatButtonModule, MatIconModule],
  templateUrl: './ventas-historial.component.html',
  styleUrl: './ventas-historial.component.scss',
})
export class VentasHistorialComponent implements OnInit {
  ventas = signal<Venta[]>([]);
  columnas = ['id', 'fecha_hora', 'nombre_usuario', 'total', 'estado', 'acciones'];

  constructor(
    private ventaService: VentaService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.ventaService.listar({}).subscribe((ventas) => this.ventas.set(ventas));
  }

  anular(venta: Venta): void {
    const ref = this.dialog.open(MotivoDialogComponent, { width: '400px' });
    ref.afterClosed().subscribe((motivo?: string) => {
      if (!motivo) return;
      this.ventaService.anular(venta.id, motivo).subscribe({
        next: () => {
          this.snackBar.open(`Venta #${venta.id} anulada`, 'Cerrar', { duration: 3000 });
          this.cargar();
        },
        error: (err) =>
          this.snackBar.open(err.error?.error || 'No se pudo anular la venta', 'Cerrar', {
            duration: 4000,
          }),
      });
    });
  }
}
