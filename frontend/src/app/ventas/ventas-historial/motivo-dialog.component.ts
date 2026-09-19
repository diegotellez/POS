import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-motivo-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Anular venta</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Motivo de la anulación</mat-label>
        <textarea matInput [(ngModel)]="motivo" rows="3"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="ref.close()">Cancelar</button>
      <button mat-raised-button color="warn" [disabled]="!motivo.trim()" (click)="ref.close(motivo)">
        Anular
      </button>
    </mat-dialog-actions>
  `,
})
export class MotivoDialogComponent {
  motivo = '';
  constructor(public ref: MatDialogRef<MotivoDialogComponent, string>) {}
}
