import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CategoriaService } from '../core/services/categoria.service';
import { Categoria } from '../core/models/models';

@Component({
  selector: 'app-categorias',
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
    MatListModule,
  ],
  templateUrl: './categorias.component.html',
  styleUrl: './categorias.component.scss',
})
export class CategoriasComponent implements OnInit {
  categorias = signal<Categoria[]>([]);
  nombreNueva = '';
  padreNueva: number | null = null;

  editandoId: number | null = null;
  nombreEdit = '';
  padreEdit: number | null = null;

  constructor(private categoriaService: CategoriaService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.categoriaService.listar().subscribe((c) => this.categorias.set(c));
  }

  get raiz(): Categoria[] {
    return this.categorias().filter((c) => !c.categoria_padre_id);
  }

  hijas(padreId: number): Categoria[] {
    return this.categorias().filter((c) => c.categoria_padre_id === padreId);
  }

  crear(): void {
    if (!this.nombreNueva.trim()) return;
    this.categoriaService.crear(this.nombreNueva.trim(), this.padreNueva).subscribe({
      next: () => {
        this.nombreNueva = '';
        this.padreNueva = null;
        this.cargar();
      },
      error: (err) => this.snackBar.open(err.error?.error || 'Error al crear', 'Cerrar', { duration: 4000 }),
    });
  }

  eliminar(categoria: Categoria): void {
    this.categoriaService.eliminar(categoria.id).subscribe(() => this.cargar());
  }

  iniciarEdicion(categoria: Categoria): void {
    this.editandoId = categoria.id;
    this.nombreEdit = categoria.nombre;
    this.padreEdit = categoria.categoria_padre_id;
  }

  cancelarEdicion(): void {
    this.editandoId = null;
    this.nombreEdit = '';
    this.padreEdit = null;
  }

  guardarEdicion(categoria: Categoria): void {
    if (!this.nombreEdit.trim()) return;
    this.categoriaService.actualizar(categoria.id, this.nombreEdit.trim(), this.padreEdit).subscribe({
      next: () => {
        this.cancelarEdicion();
        this.cargar();
      },
      error: (err) =>
        this.snackBar.open(err.error?.error || 'Error al actualizar', 'Cerrar', { duration: 4000 }),
    });
  }
}
