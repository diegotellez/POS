import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProductoService } from '../core/services/producto.service';
import { Producto } from '../core/models/models';
import { ProductoFormDialogComponent } from './producto-form-dialog.component';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
  ],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.scss',
})
export class ProductosComponent implements OnInit {
  productos = signal<Producto[]>([]);
  filtro = '';
  columnas = ['codigo', 'nombre', 'categoria_nombre', 'precio_venta', 'stock', 'acciones'];

  constructor(
    private productoService: ProductoService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.productoService.listar().subscribe((p) => this.productos.set(p));
  }

  get productosFiltrados(): Producto[] {
    const termino = this.filtro.trim().toLowerCase();
    if (!termino) return this.productos();
    return this.productos().filter(
      (p) =>
        p.nombre.toLowerCase().includes(termino) ||
        (p.codigo_barras || '').includes(termino) ||
        p.codigo_interno.includes(termino)
    );
  }

  nuevo(): void {
    const ref = this.dialog.open(ProductoFormDialogComponent, { data: { producto: null } });
    ref.afterClosed().subscribe((form) => {
      if (!form) return;
      this.productoService.crear(form).subscribe({
        next: () => {
          this.snackBar.open('Producto creado', 'Cerrar', { duration: 2000 });
          this.cargar();
        },
        error: (err) => this.snackBar.open(err.error?.error || 'Error al crear', 'Cerrar', { duration: 4000 }),
      });
    });
  }

  editar(producto: Producto): void {
    const ref = this.dialog.open(ProductoFormDialogComponent, { data: { producto } });
    ref.afterClosed().subscribe((form) => {
      if (!form) return;
      this.productoService.actualizar(producto.id, form).subscribe({
        next: () => {
          this.snackBar.open('Producto actualizado', 'Cerrar', { duration: 2000 });
          this.cargar();
        },
        error: (err) => this.snackBar.open(err.error?.error || 'Error al actualizar', 'Cerrar', { duration: 4000 }),
      });
    });
  }

  eliminar(producto: Producto): void {
    this.productoService.eliminar(producto.id).subscribe(() => {
      this.snackBar.open('Producto desactivado', 'Cerrar', { duration: 2000 });
      this.cargar();
    });
  }
}
