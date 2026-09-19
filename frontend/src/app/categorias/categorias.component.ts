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
}
