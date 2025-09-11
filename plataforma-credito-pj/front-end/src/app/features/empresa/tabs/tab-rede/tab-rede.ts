import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { DataSet, Network, Node, Edge } from 'vis-network/standalone';

@Component({
  standalone: true,
  selector: 'app-tab-rede',
  imports: [CommonModule, MatCardModule],
  template: `
  <mat-card>
    <mat-card-title>Rede Financeira</mat-card-title>
    <div #graph style="height:300px;"></div>
  </mat-card>
  `
})
export class TabRedeComponent implements AfterViewInit {
  @Input() empresaId = '';
  @Input() cnpj = '';

  @ViewChild('graph', { static: true }) graphEl!: ElementRef<HTMLDivElement>;

  ngAfterViewInit(): void {
    const nodes: Node[] = [
      { id: 'A', label: 'CNPJ_00001' },
      { id: 'B', label: 'CNPJ_00009' },
      { id: 'C', label: 'CNPJ_00042' },
    ];
    const edges: Edge[] = [
      { from: 'A', to: 'B', value: 123456 },
      { from: 'B', to: 'C', value: 45678 },
    ];

    const data = {
      nodes: new DataSet<Node>(nodes),
      edges: new DataSet<Edge>(edges),
    };

    const options = {
      nodes: { shape: 'dot', size: 12 },
      edges: { arrows: 'to', scaling: { min: 1, max: 5 } },
      physics: { stabilization: true }
    };

    // cria o grafo
    new Network(this.graphEl.nativeElement, data, options);
  }
}
