import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RespaldoService } from '../core/services/respaldo.service';

@Component({
  selector: 'app-respaldo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './respaldo.component.html',
  styleUrl: './respaldo.component.scss',
})
export class RespaldoComponent {
  rutaUSB = '';
  rutaDrive = '';
  ultimoDestino = signal<string | null>(null);

  constructor(private respaldoService: RespaldoService, private snackBar: MatSnackBar) {}

  respaldarUSB(): void {
    if (!this.rutaUSB.trim()) return;
    this.respaldoService.respaldarAUSB(this.rutaUSB.trim()).subscribe({
      next: (r) => {
        this.ultimoDestino.set(r.destino);
        this.snackBar.open('Respaldo copiado a USB', 'Cerrar', { duration: 3000 });
      },
      error: (err) => this.snackBar.open(err.error?.error || 'Error al respaldar', 'Cerrar', { duration: 4000 }),
    });
  }

  respaldarDrive(): void {
    if (!this.rutaDrive.trim()) return;
    this.respaldoService.respaldarADrive(this.rutaDrive.trim()).subscribe({
      next: (r) => {
        this.ultimoDestino.set(r.destino);
        this.snackBar.open('Respaldo copiado a la carpeta de Drive', 'Cerrar', { duration: 3000 });
      },
      error: (err) => this.snackBar.open(err.error?.error || 'Error al respaldar', 'Cerrar', { duration: 4000 }),
    });
  }
}
