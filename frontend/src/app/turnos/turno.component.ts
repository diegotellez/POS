import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TurnoService } from '../core/services/turno.service';
import { TurnoCaja } from '../core/models/models';

@Component({
  selector: 'app-turno',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './turno.component.html',
  styleUrl: './turno.component.scss',
})
export class TurnoComponent implements OnInit {
  turno = signal<TurnoCaja | null>(null);
  baseInicial: number | null = null;
  efectivoContado: number | null = null;
  turnoCerrado = signal<TurnoCaja | null>(null);

  constructor(private turnoService: TurnoService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.turnoService.actual().subscribe((t) => this.turno.set(t));
  }

  abrir(): void {
    if (this.baseInicial === null) return;
    this.turnoService.abrir(this.baseInicial).subscribe({
      next: (t) => {
        this.turno.set(t);
        this.baseInicial = null;
        this.snackBar.open('Turno abierto', 'Cerrar', { duration: 2000 });
      },
      error: (err) =>
        this.snackBar.open(err.error?.error || 'No se pudo abrir el turno', 'Cerrar', {
          duration: 4000,
        }),
    });
  }

  cerrar(): void {
    const t = this.turno();
    if (!t || this.efectivoContado === null) return;
    this.turnoService.cerrar(t.id, this.efectivoContado).subscribe({
      next: (cerrado) => {
        this.turnoCerrado.set(cerrado);
        this.turno.set(null);
        this.efectivoContado = null;
        this.snackBar.open('Turno cerrado', 'Cerrar', { duration: 2000 });
      },
      error: (err) =>
        this.snackBar.open(err.error?.error || 'No se pudo cerrar el turno', 'Cerrar', {
          duration: 4000,
        }),
    });
  }
}
