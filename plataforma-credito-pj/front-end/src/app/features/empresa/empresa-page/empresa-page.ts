import { Component, WritableSignal, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';

import { TabScoreHistoricoComponent } from '../tabs/tab-score-historico/tab-score-historico';
import { TabRedeComponent } from '../tabs/tab-rede/tab-rede';
import { TabDecisoesComponent } from '../tabs/tab-decisoes/tab-decisoes';


@Component({
  standalone: true,
  selector: 'app-empresa-page',
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    // as três abas como componentes filhos standalone:
    TabScoreHistoricoComponent,
    TabRedeComponent,
    TabDecisoesComponent
  ],
  template: `
    <mat-card class="mb-4">
      <h2 class="px-2 py-2">
        Empresa {{ id() || cnpj() }}
      </h2>
    </mat-card>

    <mat-tab-group>
      <mat-tab label="Score / Histórico">
        <app-tab-score-historico [empresaId]="id()" [cnpj]="cnpj()"></app-tab-score-historico>
      </mat-tab>

      <mat-tab label="Rede">
        <app-tab-rede [empresaId]="id()" [cnpj]="cnpj()"></app-tab-rede>
      </mat-tab>

      <mat-tab label="Decisões">
        <app-tab-decisoes [empresaId]="id()" [cnpj]="cnpj()"></app-tab-decisoes>
      </mat-tab>
    </mat-tab-group>
  `
})
export class EmpresaPageComponent {
  private readonly params: WritableSignal<ParamMap>;

  // sinais simples para usar no template
  readonly id = computed(() => this.params().get('id') ?? '');
  readonly cnpj = computed(() => this.params().get('cnpj') ?? '');

  constructor(private readonly route: ActivatedRoute) {
    this.params = signal(this.route.snapshot.paramMap);
  }
}
