import { Component, DestroyRef, WritableSignal, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
    TabScoreHistoricoComponent,
    TabRedeComponent,
    TabDecisoesComponent
  ],
  template: `
    <div class="empresa-page">
      <div class="empresa-page__hero">
        <div class="empresa-page__toolbar">
          <button type="button" class="empresa-page__back" (click)="goBack()">Voltar</button>
        </div>

        <mat-card class="empresa-page__header-card">
          <h2 class="empresa-page__title">Empresa {{ idDisplay() || cnpjDisplay() }}</h2>
        </mat-card>
      </div>

      <mat-tab-group
        [selectedIndex]="selectedTab()"
        (selectedIndexChange)="onTabChange($event)">
        <mat-tab label="Score / Historico">
          <app-tab-score-historico [empresaId]="id()" [cnpj]="cnpj()"></app-tab-score-historico>
        </mat-tab>

        <mat-tab label="Rede">
          <app-tab-rede [empresaId]="id()" [cnpj]="cnpj()"></app-tab-rede>
        </mat-tab>

        <mat-tab label="Decisoes">
          <app-tab-decisoes [empresaId]="id()" [cnpj]="cnpj()"></app-tab-decisoes>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styleUrls: ['./empresa-page.scss']
})
export class EmpresaPageComponent {
  private readonly tabKeyByIndex: string[] = ['score', 'rede', 'decisoes'];
  private readonly tabIndexByKey: Record<string, number> = {
    score: 0,
    rede: 1,
    decisoes: 2,
  };

  private readonly params: WritableSignal<ParamMap>;
  private readonly queryParams: WritableSignal<ParamMap>;

  readonly id = computed(() => this.params().get('id') ?? '');
  readonly cnpj = computed(() => this.params().get('cnpj') ?? '');
  readonly idDisplay = computed(() => this.stripPrefix(this.id()));
  readonly cnpjDisplay = computed(() => this.stripPrefix(this.cnpj()));
  readonly selectedTab = signal(0);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef
  ) {
    this.params = signal(this.route.snapshot.paramMap);
    this.queryParams = signal(this.route.snapshot.queryParamMap);

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((map) => this.params.set(map));

    this.updateSelectedTab(this.queryParams());

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((map) => {
        this.queryParams.set(map);
        this.updateSelectedTab(map);
      });
  }

  goBack(): void {
    const term = (this.queryParams().get('term') ?? this.id() ?? this.cnpj() ?? this.idDisplay() ?? this.cnpjDisplay() ?? '').trim();
    if (term) {
      this.router.navigate(['/dashboard'], { queryParams: { term } });
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  onTabChange(index: number): void {
    this.selectedTab.set(index);
    const tabKey = this.tabKeyByIndex[index] ?? 'score';

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabKey },
      queryParamsHandling: 'merge',
    });
  }

  private stripPrefix(value: string): string {
    if (!value) {
      return value;
    }
    if (/^CNPJ_/i.test(value)) {
      return value.replace(/^CNPJ_/i, 'CNPJ ');
    }
    return value;
  }

  private updateSelectedTab(map: ParamMap): void {
    const key = (map.get('tab') ?? '').toLowerCase();
    const index = this.tabIndexByKey[key] ?? 0;
    this.selectedTab.set(index);
  }
}
