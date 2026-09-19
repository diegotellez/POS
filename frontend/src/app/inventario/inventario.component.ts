import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InventarioService } from '../core/services/inventario.service';
import { ProductoService } from '../core/services/producto.service';
import { MovimientoInventario, Producto } from '../core/models/models';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
  ],
  templateUrl: './inventario.component.html',
  styleUrl: './inventario.component.scss',
})
export class InventarioComponent implements OnInit {
  productos = signal<Producto[]>([]);
  stockBajo = signal<Producto[]>([]);
  movimientos = signal<MovimientoInventario[]>([]);
  columnasMovimientos = ['fecha_hora', 'producto_nombre', 'tipo', 'cantidad', 'referencia'];

  productoEntradaId: number | null = null;
  cantidadEntrada: number | null = null;
  referenciaEntrada = '';

  productoAjusteId: number | null = null;
  nuevoStockAjuste: number | null = null;
  motivoAjuste = '';

  constructor(
    private inventarioService: InventarioService,
    private productoService: ProductoService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.productoService.listar(true).subscribe((p) => this.productos.set(p));
    this.inventarioService.stockBajo().subscribe((p) => this.stockBajo.set(p));
    this.inventarioService.movimientos().subscribe((m) => this.movimientos.set(m));
  }

  get nombresStockBajo(): string {
    return this.stockBajo()
      .map((p) => p.nombre)
      .join(', ');
  }

  registrarEntrada(): void {
    if (!this.productoEntradaId || !this.cantidadEntrada) return;
    this.inventarioService
      .registrarEntrada(this.productoEntradaId, this.cantidadEntrada, this.referenciaEntrada)
      .subscribe({
        next: () => {
          this.snackBar.open('Entrada registrada', 'Cerrar', { duration: 2000 });
          this.productoEntradaId = null;
          this.cantidadEntrada = null;
          this.referenciaEntrada = '';
          this.cargarTodo();
        },
        error: (err) => this.snackBar.open(err.error?.error || 'Error', 'Cerrar', { duration: 4000 }),
      });
  }

  ajustarStock(): void {
    if (!this.productoAjusteId || this.nuevoStockAjuste === null) return;
    this.inventarioService
      .ajustarManual(this.productoAjusteId, this.nuevoStockAjuste, this.motivoAjuste)
      .subscribe({
        next: () => {
          this.snackBar.open('Stock ajustado', 'Cerrar', { duration: 2000 });
          this.productoAjusteId = null;
          this.nuevoStockAjuste = null;
          this.motivoAjuste = '';
          this.cargarTodo();
        },
        error: (err) => this.snackBar.open(err.error?.error || 'Error', 'Cerrar', { duration: 4000 }),
      });
  }
}
