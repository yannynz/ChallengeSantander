// src/app/shared/search-bar/search-bar.ts
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  selector: 'app-search-bar',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <mat-form-field class="w-100" appearance="outline">
      <mat-label>Buscar por ID ou CNPJ</mat-label>
      <input matInput [(ngModel)]="value" (keyup.enter)="emit()" />
      <button
        mat-icon-button
        matSuffix
        aria-label="Buscar"
        (click)="emit()"
      >
        <mat-icon>search</mat-icon>
      </button>
    </mat-form-field>
  `
})
export class SearchBarComponent {
  value = '';
  @Output() search = new EventEmitter<string>();

  emit() {
    const v = this.value?.trim();
    if (v) this.search.emit(v);
  }
}
