import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, switchMap, of } from 'rxjs';
import { DataSet, Network, Node, Edge } from 'vis-network/standalone';

import { ApiService, EmpresaRedeResponse } from '../../../../shared/api';

@Component({
  standalone: true,
  selector: 'app-tab-rede',
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card>
      <mat-card-title>Rede Financeira</mat-card-title>

      <div
        #graph
        class="graph"
        style="height:300px;"
        [style.display]="hasData() && !error() ? 'block' : 'none'">
      </div>

      <div *ngIf="loading()" class="px-3 py-4 text-sm">Carregando rede...</div>
      <div *ngIf="!loading() && error()" class="px-3 py-4 text-sm" style="color:#b91c1c;">{{ error() }}</div>
      <div *ngIf="!loading() && !error() && !hasData()" class="px-3 py-4 text-sm">
        Sem dados de rede para esta empresa.
      </div>
    </mat-card>
  `,
})
export class TabRedeComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() empresaId = '';
  @Input() cnpj = '';

  @ViewChild('graph', { static: true }) graphEl!: ElementRef<HTMLDivElement>;

  constructor(
    private readonly api: ApiService,
    private readonly destroyRef: DestroyRef
  ) {}
  private network?: Network;
  private viewReady = false;
  private currentEmpresaId: string | null = null;

  loading = signal(false);
  error = signal<string | null>(null);
  hasData = signal(false);

  ngAfterViewInit(): void {
    this.viewReady = true;
    const id = this.currentEmpresaId ?? this.resolveEmpresaId();
    if (id) {
      this.currentEmpresaId = id;
      this.loadGraph(id);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('empresaId' in changes || 'cnpj' in changes)) {
      return;
    }

    const nextId = this.resolveEmpresaId();
    if (!nextId || nextId === this.currentEmpresaId) {
      return;
    }

    this.currentEmpresaId = nextId;
    if (this.viewReady) {
      this.loadGraph(nextId);
    }
  }

  ngOnDestroy(): void {
    this.destroyNetwork();
  }

  private resolveEmpresaId(): string | null {
    const candidate = (this.empresaId || this.cnpj || '').toString().trim();
    return candidate.length ? candidate : null;
  }

  private loadGraph(identifier: string): void {
    if (!this.graphEl?.nativeElement) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.api
      .resolveEmpresaId(identifier)
      .pipe(
        switchMap((resolvedId) => {
          if (!resolvedId) {
            this.error.set('Empresa nao encontrada.');
            this.hasData.set(false);
            this.destroyNetwork();
            return of<EmpresaRedeResponse | null>(null);
          }
          return this.api.getEmpresaRede(resolvedId);
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (response) => {
          if (!response) {
            return;
          }
          this.error.set(null);
          this.renderGraph(response);
        },
        error: (err) => {
          console.error('Erro ao carregar rede', err);
          this.error.set('Nao foi possivel carregar a rede desta empresa.');
          this.hasData.set(false);
          this.destroyNetwork();
        },
      });
  }

  private renderGraph(response: EmpresaRedeResponse): void {
    const nodesRaw = Array.isArray(response?.nodes) ? response.nodes : [];
    const edgesRaw = Array.isArray(response?.edges) ? response.edges : [];

    const nodes: Node[] = nodesRaw
      .map((node, index) => {
        const id = (node?.id ?? index) as string | number;
        if (id === undefined || id === null) {
          return null;
        }

        return {
          id,
          label: node?.label ?? String(id),
          value: typeof node?.value === 'number' ? node.value : undefined,
        } as Node;
      })
      .filter((node): node is Node => !!node);

    const edges: Edge[] = edgesRaw
      .map((edge, index) => {
        const from = (edge?.from ?? edge?.source) as string | number | undefined;
        const to = (edge?.to ?? edge?.target) as string | number | undefined;
        if (from === undefined || to === undefined) {
          return null;
        }

        const value = edge?.value ?? edge?.weight;

        return {
          id: (edge?.id ?? index) as string | number,
          from,
          to,
          value: typeof value === 'number' ? value : undefined,
        } as Edge;
      })
      .filter((edge): edge is Edge => !!edge);

    if (!nodes.length) {
      this.hasData.set(false);
      this.destroyNetwork();
      return;
    }

    const data = {
      nodes: new DataSet<Node>(nodes),
      edges: new DataSet<Edge>(edges),
    };

    const options = {
      nodes: { shape: 'dot', size: 12 },
      edges: { arrows: 'to', scaling: { min: 1, max: 5 } },
      physics: { stabilization: true },
    };

    this.hasData.set(true);

    if (this.network) {
      this.network.setData(data);
      this.network.setOptions(options);
    } else {
      this.network = new Network(this.graphEl.nativeElement, data, options);
    }
  }

  private destroyNetwork(): void {
    if (this.network) {
      this.network.destroy();
      this.network = undefined;
    }
  }
}
