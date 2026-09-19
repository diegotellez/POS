import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  nombreUsuario = '';
  password = '';
  cargando = signal(false);
  error = signal<string | null>(null);

  constructor(private auth: AuthService, private router: Router) {}

  ingresar(): void {
    if (!this.nombreUsuario || !this.password) return;
    this.cargando.set(true);
    this.error.set(null);
    this.auth.login(this.nombreUsuario, this.password).subscribe({
      next: () => {
        this.cargando.set(false);
        this.router.navigate(['/ventas']);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err.error?.error || 'No se pudo iniciar sesión');
      },
    });
  }
}
