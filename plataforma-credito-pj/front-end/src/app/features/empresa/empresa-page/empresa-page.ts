import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, Inject, PLATFORM_ID, WritableSignal, computed, signal } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TabScoreHistoricoComponent } from '../tabs/tab-score-historico/tab-score-historico';
import { TabRedeComponent } from '../tabs/tab-rede/tab-rede';
import { TabDecisoesComponent } from '../tabs/tab-decisoes/tab-decisoes';

type TabKey = 'score' | 'rede' | 'decisoes';

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
          <h3 *ngIf="soloMode()" class="empresa-page__subtitle">{{ soloTitle() }}</h3>
        </mat-card>
      </div>

      <ng-container *ngIf="!soloMode(); else soloView">
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
      </ng-container>

      <ng-template #soloView>
        <div class="empresa-page__solo">
          <ng-container [ngSwitch]="focusedTab()">
            <div *ngSwitchCase="'score'" class="empresa-page__solo-content">
              <app-tab-score-historico [empresaId]="id()" [cnpj]="cnpj()"></app-tab-score-historico>
            </div>

            <div *ngSwitchCase="'rede'" class="empresa-page__solo-content">
              <app-tab-rede [empresaId]="id()" [cnpj]="cnpj()"></app-tab-rede>
            </div>

            <div *ngSwitchCase="'decisoes'" class="empresa-page__solo-content">
              <app-tab-decisoes [empresaId]="id()" [cnpj]="cnpj()"></app-tab-decisoes>
            </div>

            <div *ngSwitchDefault class="empresa-page__solo-empty">
              <p>Selecione uma aba para visualizar os detalhes.</p>
            </div>
          </ng-container>
        </div>
      </ng-template>
    </div>
  `,
  styleUrls: ['./empresa-page.scss']
})
export class EmpresaPageComponent {
  private readonly tabKeyByIndex: TabKey[] = ['score', 'rede', 'decisoes'];
  private readonly tabIndexByKey: Record<TabKey, number> = {
    score: 0,
    rede: 1,
    decisoes: 2,
  };
  private readonly focusTitleByKey: Record<TabKey, string> = {
    score: 'Score e Historico',
    rede: 'Rede Financeira',
    decisoes: 'Decisoes',
  };

  private readonly params: WritableSignal<ParamMap>;
  private readonly queryParams: WritableSignal<ParamMap>;

  readonly id = computed(() => this.params().get('id') ?? '');
  readonly cnpj = computed(() => this.params().get('cnpj') ?? '');
  readonly idDisplay = computed(() => this.stripPrefix(this.id()));
  readonly cnpjDisplay = computed(() => this.stripPrefix(this.cnpj()));
  readonly selectedTab = signal(0);
  readonly focusedTab = signal<TabKey | null>(null);
  readonly soloMode = computed(() => this.focusedTab() !== null);
  readonly soloTitle = computed(() => {
    const key = this.focusedTab();
    return key ? this.focusTitleByKey[key] : '';
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly location: Location,
    private readonly destroyRef: DestroyRef,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {
    this.params = signal(this.route.snapshot.paramMap);
    this.queryParams = signal(this.route.snapshot.queryParamMap);

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((map) => this.params.set(map));

    this.updateView(this.queryParams());

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((map) => {
        this.queryParams.set(map);
        this.updateView(map);
      });
  }

  goBack(): void {
    if (this.canUseHistoryBack()) {
      this.location.back();
      return;
    }

    const term = this.resolveReturnTerm();
    if (term) {
      void this.router.navigate(['/dashboard'], { queryParams: { term } });
      return;
    }

    void this.router.navigate(['/dashboard']);
  }

  onTabChange(index: number): void {
    this.selectedTab.set(index);
    this.focusedTab.set(null);
    const tabKey = this.tabKeyByIndex[index] ?? 'score';

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabKey, focus: null },
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

  private updateView(map: ParamMap): void {
    const focusKey = this.normalizeTabKey(map.get('focus'));
    if (focusKey) {
      this.focusedTab.set(focusKey);
      this.selectedTab.set(this.tabIndexByKey[focusKey] ?? 0);
      return;
    }

    this.focusedTab.set(null);
    const tabKey = this.normalizeTabKey(map.get('tab'));
    const index = tabKey ? this.tabIndexByKey[tabKey] ?? 0 : 0;
    this.selectedTab.set(index);
  }

  private normalizeTabKey(raw: string | null): TabKey | null {
    if (!raw) {
      return null;
    }

    const key = raw.trim().toLowerCase();
    if (key === 'score' || key === 'rede' || key === 'decisoes') {
      return key as TabKey;
    }

    return null;
  }

  private canUseHistoryBack(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    try {
      return window.history.length > 1;
    } catch {
      return false;
    }
  }

  private resolveReturnTerm(): string | null {
    const raw = (this.queryParams().get('term') ?? '').trim();
    if (raw) {
      return raw;
    }

    const candidate = (this.id() || this.cnpj() || '').trim();
    if (candidate) {
      return candidate;
    }

    const readable = (this.idDisplay() || this.cnpjDisplay() || '').trim();
    return readable || null;
  }
}
