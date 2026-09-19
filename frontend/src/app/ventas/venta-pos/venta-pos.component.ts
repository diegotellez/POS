import { Component, OnInit, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';

import { ProductoService } from '../../core/services/producto.service';
import { TurnoService } from '../../core/services/turno.service';
import { VentaService } from '../../core/services/venta.service';
import { ItemCarrito, MetodoPago, PagoVenta, Producto, TurnoCaja } from '../../core/models/models';
import { PagoDialogComponent, PagoDialogResultado } from './pago-dialog.component';

@Component({
  selector: 'app-venta-pos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDialogModule,
    MatSelectModule,
  ],
  templateUrl: './venta-pos.component.html',
  styleUrl: './venta-pos.component.scss',
})
export class VentaPosComponent implements OnInit {
  @ViewChild('busquedaInput') busquedaInput?: ElementRef<HTMLInputElement>;

  turnoActual = signal<TurnoCaja | null>(null);
  termino = '';
  resultados = signal<Producto[]>([]);
  carrito = signal<ItemCarrito[]>([]);
  procesando = signal(false);

  total = computed(() => this.carrito().reduce((acc, i) => acc + i.precioUnitario * i.cantidad, 0));

  constructor(
    private productoService: ProductoService,
    private turnoService: TurnoService,
    private ventaService: VentaService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.turnoService.actual().subscribe((turno) => this.turnoActual.set(turno));
  }

  buscar(): void {
    const termino = this.termino.trim();
    if (!termino) {
      this.resultados.set([]);
      return;
    }
    this.productoService.buscar(termino).subscribe((productos) => this.resultados.set(productos));
  }

  // El lector de código de barras USB emula teclado: escribe el código y
  // termina con "Enter". Detectamos ese Enter para agregar el producto
  // directamente sin necesidad de hacer clic.
  onBusquedaKeydown(evento: KeyboardEvent): void {
    if (evento.key !== 'Enter') return;
    const codigo = this.termino.trim();
    if (!codigo) return;

    this.productoService.obtenerPorCodigo(codigo).subscribe({
      next: (producto) => {
        this.agregarAlCarrito(producto);
        this.termino = '';
        this.resultados.set([]);
      },
      error: () => this.buscar(),
    });
  }

  agregarAlCarrito(producto: Producto): void {
    const actual = this.carrito();
    const existente = actual.find((i) => i.productoId === producto.id);
    if (existente) {
      existente.cantidad += 1;
      this.carrito.set([...actual]);
    } else {
      this.carrito.set([
        ...actual,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          precioUnitario: producto.precio_venta,
          cantidad: 1,
          stockDisponible: producto.stock,
        },
      ]);
    }
    this.busquedaInput?.nativeElement.focus();
  }

  cambiarCantidad(item: ItemCarrito, delta: number): void {
    item.cantidad = Math.max(1, item.cantidad + delta);
    this.carrito.set([...this.carrito()]);
  }

  quitarDelCarrito(item: ItemCarrito): void {
    this.carrito.set(this.carrito().filter((i) => i !== item));
  }

  irATurno(): void {
    this.router.navigate(['/turno']);
  }

  confirmarVenta(): void {
    const turno = this.turnoActual();
    if (!turno) {
      this.snackBar.open('No hay un turno de caja abierto. Ábrelo antes de vender.', 'Cerrar', {
        duration: 4000,
      });
      return;
    }
    if (!this.carrito().length) return;

    const ref = this.dialog.open(PagoDialogComponent, {
      width: '420px',
      data: { total: this.total() },
    });

    ref.afterClosed().subscribe((resultado: PagoDialogResultado | undefined) => {
      if (!resultado) return;
      this.procesarVenta(turno.id, resultado.pagos);
    });
  }

  private procesarVenta(turnoCajaId: number, pagos: PagoVenta[]): void {
    this.procesando.set(true);
    this.ventaService
      .crear({
        turnoCajaId,
        items: this.carrito().map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
        pagos,
      })
      .subscribe({
        next: (resultado) => {
          this.procesando.set(false);
          this.carrito.set([]);
          this.snackBar.open(`Venta #${resultado.venta.id} registrada`, 'Cerrar', { duration: 3000 });

          if (resultado.alertasStock.length) {
            const nombres = resultado.alertasStock.map((a) => a.nombre).join(', ');
            this.snackBar.open(`Stock bajo: ${nombres}`, 'Cerrar', { duration: 6000 });
          }

          this.imprimirTicket(resultado.venta.id);
        },
        error: (err) => {
          this.procesando.set(false);
          this.snackBar.open(err.error?.error || 'No se pudo registrar la venta', 'Cerrar', {
            duration: 4000,
          });
        },
      });
  }

  private imprimirTicket(ventaId: number): void {
    this.ventaService.imprimir(ventaId).subscribe((resultado) => {
      if (resultado.impreso) return;
      // Respaldo: abrir el comprobante HTML en una ventana nueva para
      // imprimirlo desde el diálogo del navegador (ancho fijo 80mm).
      this.ventaService.obtenerTicketHtml(ventaId).subscribe((html) => {
        const ventana = window.open('', '_blank', 'width=380,height=600');
        if (ventana) {
          ventana.document.write(html);
          ventana.document.close();
        }
      });
    });
  }
}
