import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  standalone: true,
  selector: 'app-tab-decisoes',
  imports: [CommonModule, MatCardModule],
  template: `
  <mat-card>
    <mat-card-title>Decisões (mock)</mat-card-title>
    <ul class="px-4 py-2 list-disc">
      <li>Aprovado limite rotativo de R$ 25.000</li>
      <li>Solicitar comprovação de faturamento (últimos 6 meses)</li>
      <li>Monitorar variação de score em 30 dias</li>
    </ul>
  </mat-card>
  `
})
export class TabDecisoesComponent {
  @Input() empresaId = '';
  @Input() cnpj = '';
}
