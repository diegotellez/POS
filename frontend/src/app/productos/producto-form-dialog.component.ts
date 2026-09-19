import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { CategoriaService } from '../core/services/categoria.service';
import { Categoria, Producto } from '../core/models/models';

export interface ProductoFormData {
  producto: Producto | null;
}

@Component({
  selector: 'app-producto-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './producto-form-dialog.component.html',
  styleUrl: './producto-form-dialog.component.scss',
})
export class ProductoFormDialogComponent implements OnInit {
  categorias: Categoria[] = [];
  form: any = {
    codigoBarras: '',
    nombre: '',
    descripcion: '',
    categoriaId: null,
    precioVenta: 0,
    stock: 0,
    stockMinimo: 0,
  };
  esEdicion = false;

  constructor(
    private ref: MatDialogRef<ProductoFormDialogComponent, any>,
    private categoriaService: CategoriaService,
    @Inject(MAT_DIALOG_DATA) public data: ProductoFormData
  ) {}

  ngOnInit(): void {
    this.categoriaService.listar().subscribe((c) => (this.categorias = c));
    if (this.data.producto) {
      this.esEdicion = true;
      const p = this.data.producto;
      this.form = {
        codigoBarras: p.codigo_barras || '',
        nombre: p.nombre,
        descripcion: p.descripcion || '',
        categoriaId: p.categoria_id,
        precioVenta: p.precio_venta,
        stock: p.stock,
        stockMinimo: p.stock_minimo,
      };
    }
  }

  guardar(): void {
    if (!this.form.nombre.trim()) return;
    this.ref.close(this.form);
  }

  cancelar(): void {
    this.ref.close();
  }
}
