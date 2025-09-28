import { Component, DestroyRef, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, map, of, switchMap } from 'rxjs';

import { ApiService, Decisao } from '../../../../shared/api';

type DecisaoView = {
  id: string;
  label: string;
  motivo?: string | null;
  scorePercent: string;
  limiteFormat: string;
  dataFormat: string;
};

@Component({
  standalone: true,
  selector: 'app-tab-decisoes',
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card>
      <mat-card-title>Decisoes</mat-card-title>

      <div *ngIf="loading()" class="px-3 py-4 text-sm tab-subtitle">Carregando decisoes...</div>
      <div *ngIf="!loading() && error()" class="px-3 py-4 text-sm tab-subtitle" style="color:#b91c1c;">{{ error() }}</div>

      <ng-container *ngIf="!loading() && !error()">
        <ul *ngIf="decisoes().length; else emptyTpl" class="px-4 py-2">
          <li *ngFor="let decisao of decisoes()" class="py-2 text-sm">
            <div><strong>{{ decisao.label }}</strong></div>
            <div>Score: {{ decisao.scorePercent }}%</div>
            <div>Limite: {{ decisao.limiteFormat }}</div>
            <div>Data: {{ decisao.dataFormat }}</div>
            <div *ngIf="decisao.motivo">Motivo: {{ decisao.motivo }}</div>
          </li>
        </ul>
      </ng-container>

      <ng-template #emptyTpl>
        <div class="px-3 py-4 text-sm tab-subtitle">Nenhuma decisao encontrada para esta empresa.</div>
      </ng-template>
    </mat-card>
  `,
})
export class TabDecisoesComponent implements OnChanges {
  @Input() empresaId = '';
  @Input() cnpj = '';

  constructor(
    private readonly api: ApiService,
    private readonly destroyRef: DestroyRef
  ) {}

  loading = signal(false);
  error = signal<string | null>(null);
  decisoes = signal<DecisaoView[]>([]);
  private currentEmpresaId: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (!('empresaId' in changes || 'cnpj' in changes)) {
      return;
    }

    const nextId = this.resolveEmpresaId();
    if (!nextId || nextId === this.currentEmpresaId) {
      return;
    }

    this.currentEmpresaId = nextId;
    this.loadDecisoes(nextId);
  }

  private resolveEmpresaId(): string | null {
    const candidate = (this.empresaId || this.cnpj || '').toString().trim();
    return candidate.length ? candidate : null;
  }

  private loadDecisoes(identifier: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.api
      .resolveEmpresaId(identifier)
      .pipe(
        switchMap((resolvedId) => {
          if (!resolvedId) {
            this.error.set('Empresa nao encontrada.');
            return of({ resolvedId: '', lista: [] as Decisao[] });
          }
          return this.api
            .listDecisoes(resolvedId, 50)
            .pipe(map((lista) => ({ resolvedId, lista })));
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: ({ resolvedId, lista }) => {
          if (!resolvedId) {
            this.decisoes.set([]);
            return;
          }

          const filtered = lista
            .filter((item) => item.empresaId === resolvedId)
            .slice()
            .sort((a, b) => new Date(b.dtDecisao).getTime() - new Date(a.dtDecisao).getTime());

          const view = filtered.map((dec) => ({
            id: dec.id,
            label: dec.decisao ?? (dec.aprovacao ? 'APROVADO' : 'REPROVADO'),
            motivo: dec.motivo,
            scorePercent: this.toPercent(dec.score).toFixed(1),
            limiteFormat: this.formatCurrency(dec.limite ?? 0),
            dataFormat: this.formatDate(dec.dtDecisao),
          }));

          this.decisoes.set(view);
        },
        error: (err) => {
          console.error('Erro ao carregar decisoes', err);
          this.error.set('Nao foi possivel carregar as decisoes.');
          this.decisoes.set([]);
        },
      });
  }

  private toPercent(value: number | null | undefined): number {
    if (value === null || value === undefined) {
      return 0;
    }

    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) {
      return 0;
    }

    return numeric > 1 ? numeric : numeric * 100;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private formatDate(value: string): string {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return '--';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }
}
