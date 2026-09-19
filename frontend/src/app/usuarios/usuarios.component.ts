import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UsuarioService } from '../core/services/usuario.service';
import { Rol, Usuario } from '../core/models/models';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTableModule,
    MatSlideToggleModule,
  ],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss',
})
export class UsuariosComponent implements OnInit {
  usuarios = signal<Usuario[]>([]);
  columnas = ['nombre_usuario', 'rol', 'activo'];

  nuevoNombre = '';
  nuevaPassword = '';
  nuevoRol: Rol = 'CAJERO';

  constructor(private usuarioService: UsuarioService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.usuarioService.listar().subscribe((u) => this.usuarios.set(u));
  }

  crear(): void {
    if (!this.nuevoNombre.trim() || !this.nuevaPassword) return;
    this.usuarioService.crear(this.nuevoNombre.trim(), this.nuevaPassword, this.nuevoRol).subscribe({
      next: () => {
        this.snackBar.open('Usuario creado', 'Cerrar', { duration: 2000 });
        this.nuevoNombre = '';
        this.nuevaPassword = '';
        this.nuevoRol = 'CAJERO';
        this.cargar();
      },
      error: (err) => this.snackBar.open(err.error?.error || 'Error al crear usuario', 'Cerrar', { duration: 4000 }),
    });
  }

  cambiarEstado(usuario: Usuario, activo: boolean): void {
    this.usuarioService.actualizar(usuario.id, usuario.rol, activo).subscribe(() => this.cargar());
  }
}
