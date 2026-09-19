import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'ventas' },
      {
        path: 'ventas',
        loadComponent: () =>
          import('./ventas/venta-pos/venta-pos.component').then((m) => m.VentaPosComponent),
      },
      {
        path: 'ventas/historial',
        loadComponent: () =>
          import('./ventas/ventas-historial/ventas-historial.component').then(
            (m) => m.VentasHistorialComponent
          ),
      },
      {
        path: 'turno',
        loadComponent: () => import('./turnos/turno.component').then((m) => m.TurnoComponent),
      },
      {
        path: 'productos',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./productos/productos.component').then((m) => m.ProductosComponent),
      },
      {
        path: 'categorias',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./categorias/categorias.component').then((m) => m.CategoriasComponent),
      },
      {
        path: 'inventario',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./inventario/inventario.component').then((m) => m.InventarioComponent),
      },
      {
        path: 'reportes',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./reportes/reporte-turno.component').then((m) => m.ReporteTurnoComponent),
      },
      {
        path: 'usuarios',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./usuarios/usuarios.component').then((m) => m.UsuariosComponent),
      },
      {
        path: 'respaldo',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./respaldo/respaldo.component').then((m) => m.RespaldoComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
