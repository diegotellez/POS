import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';

interface ItemMenu {
  ruta: string;
  icono: string;
  etiqueta: string;
  soloAdmin?: boolean;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  menu: ItemMenu[] = [
    { ruta: '/ventas', icono: 'point_of_sale', etiqueta: 'Ventas' },
    { ruta: '/turno', icono: 'schedule', etiqueta: 'Turno de caja' },
    { ruta: '/productos', icono: 'inventory_2', etiqueta: 'Productos', soloAdmin: true },
    { ruta: '/categorias', icono: 'category', etiqueta: 'Categorías', soloAdmin: true },
    { ruta: '/inventario', icono: 'warehouse', etiqueta: 'Inventario', soloAdmin: true },
    { ruta: '/reportes', icono: 'summarize', etiqueta: 'Reportes', soloAdmin: true },
    { ruta: '/usuarios', icono: 'group', etiqueta: 'Usuarios', soloAdmin: true },
    { ruta: '/respaldo', icono: 'backup', etiqueta: 'Respaldo', soloAdmin: true },
  ];

  constructor(public auth: AuthService, private router: Router) {}

  get menuVisible(): ItemMenu[] {
    return this.menu.filter((item) => !item.soloAdmin || this.auth.esAdministrador());
  }

  salir(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
