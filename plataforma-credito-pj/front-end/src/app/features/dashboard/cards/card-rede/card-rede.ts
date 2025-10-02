import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { DataSet, Network, Node, Edge } from 'vis-network/standalone';

@Component({
  standalone: true,
  selector: 'app-card-rede',
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card>
      <mat-card-title>Rede Financeira</mat-card-title>
      <div #graph style="height:260px"></div>
    </mat-card>
  `
})
export class CardRedeComponent implements AfterViewInit {
  @ViewChild('graph', { static: true }) graphRef!: ElementRef<HTMLDivElement>;

  ngAfterViewInit(): void {
    const nodes = new DataSet<Node>([
      { id: 'A', label: 'CNPJ_00001' },
      { id: 'B', label: 'CNPJ_00009' },
      { id: 'C', label: 'CNPJ_00042' },
    ]);

    const edges = new DataSet<Edge>([
      { from: 'A', to: 'B', value: 123456 },
      { from: 'B', to: 'C', value: 45678 },
    ]);

    new Network(this.graphRef.nativeElement, { nodes, edges }, {
      nodes: { shape: 'dot', size: 12 },
      edges: { arrows: 'to', scaling: { min: 1, max: 5 } },
      physics: { stabilization: true }
    });
  }
}
