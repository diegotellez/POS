import { Component, Inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MetodoPago, PagoVenta } from '../../core/models/models';

export interface PagoDialogResultado {
  pagos: PagoVenta[];
}

const EPSILON = 0.01;

@Component({
  selector: 'app-pago-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './pago-dialog.component.html',
  styleUrl: './pago-dialog.component.scss',
})
export class PagoDialogComponent {
  metodos: MetodoPago[] = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'];
  pagos = signal<PagoVenta[]>([]);

  totalPagado = computed(() => this.pagos().reduce((acc, p) => acc + Number(p.monto || 0), 0));
  diferencia = computed(() => Number((this.data.total - this.totalPagado()).toFixed(2)));
  cuadra = computed(() => Math.abs(this.diferencia()) <= EPSILON);

  constructor(
    private ref: MatDialogRef<PagoDialogComponent, PagoDialogResultado>,
    @Inject(MAT_DIALOG_DATA) public data: { total: number }
  ) {
    this.pagos.set([{ metodoPago: 'EFECTIVO', monto: this.data.total }]);
  }

  agregarPago(): void {
    this.pagos.set([...this.pagos(), { metodoPago: 'EFECTIVO', monto: Math.max(this.diferencia(), 0) }]);
  }

  quitarPago(index: number): void {
    const actual = [...this.pagos()];
    actual.splice(index, 1);
    this.pagos.set(actual);
  }

  actualizarMonto(index: number, valor: number): void {
    const actual = [...this.pagos()];
    actual[index] = { ...actual[index], monto: Number(valor) };
    this.pagos.set(actual);
  }

  actualizarMetodo(index: number, valor: MetodoPago): void {
    const actual = [...this.pagos()];
    actual[index] = { ...actual[index], metodoPago: valor };
    this.pagos.set(actual);
  }

  confirmar(): void {
    if (!this.cuadra()) return;
    this.ref.close({ pagos: this.pagos() });
  }

  cancelar(): void {
    this.ref.close();
  }
}
