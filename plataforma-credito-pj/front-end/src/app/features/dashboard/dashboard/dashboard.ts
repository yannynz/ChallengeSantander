import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

import { NgApexchartsModule, ChartComponent } from 'ng-apexcharts';
import { Node as VisNode, Edge as VisEdge } from 'vis-network';

import type {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexStroke,
  ApexDataLabels,
  ApexPlotOptions,
  ApexNonAxisChartSeries
} from 'ng-apexcharts';

import { DataSet, Network } from 'vis-network/standalone';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    // Material
    MatCardModule, MatIconModule, MatFormFieldModule, MatInputModule,
    // Charts
    NgApexchartsModule
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements AfterViewInit {

  constructor(private router: Router) {}

  // --------- BUSCA (ID ou CNPJ)
  term = '';
  onSearch() {
    const raw = (this.term || '').trim();
    if (!raw) return;
    const digits = raw.replace(/\D/g, '');
    if (/^\d{14}$/.test(digits)) {
      this.router.navigate(['/empresa/cnpj', digits]);
    } else {
      this.router.navigate(['/empresa', raw]);
    }
  }

  // --------- SCORE (radialBar)
  scoreOpts = {
    series: [82] as ApexNonAxisChartSeries,
    chart: { type: 'radialBar', height: 260 } as ApexChart,
    plotOptions: { radialBar: { hollow: { size: '65%' }, dataLabels: { value: { formatter: (v:any)=>`${v}%` } } } } as ApexPlotOptions,
    labels: ['AUC alvo ≥ 0.80']
  };

  // --------- MACRO (linha)
  macroSeries: ApexAxisChartSeries = [
    { name: 'IPCA', data: [4.1,4.2,4.0,3.9,4.0,4.1] },
    { name: 'SELIC', data: [10.5,10.25,10.25,10.0,9.75,9.5] }
  ];
  macroChart: ApexChart = { type: 'line', height: 260 };
  macroXAxis: ApexXAxis = { categories: ['Jan','Fev','Mar','Abr','Mai','Jun'] };
  macroStroke: ApexStroke = { curve: 'smooth', width: 3 };
  macroDataLabels: ApexDataLabels = { enabled: false };

  // --------- ALERTAS (colunas)
  alertasSeries: ApexAxisChartSeries = [{ name:'Alertas', data:[3,1,4,2,5,2]}];
  alertasChart: ApexChart = { type: 'bar', height: 260 };
  alertasXAxis: ApexXAxis = { categories: ['Risco','Saldo','Rede','Score','Dados','Outros'] };
  alertasPlot: ApexPlotOptions = { bar: { columnWidth: '45%', borderRadius: 6 } };

  // --------- REDE (vis-network)
  @ViewChild('graph', { static: true }) graphRef!: ElementRef<HTMLDivElement>;
  ngAfterViewInit(): void {
  // Nós (precisam ter 'id')
const nodes = new DataSet<VisNode>([
  { id: 'A', label: 'CNPJ_00001' },
  { id: 'B', label: 'CNPJ_00099' },
  { id: 'C', label: 'CNPJ_00042' }
]);

// Arestas (from/to podem ser string ou number)
const edges = new DataSet<VisEdge>([
  { from: 'A', to: 'B', value: 120000 },
  { from: 'B', to: 'C', value: 45000 }
]);

    new Network(this.graphRef.nativeElement, { nodes, edges }, {
      nodes: { shape: 'dot', size: 12 },
      edges: { arrows: 'to', scaling: { min: 1, max: 5 } },
      physics: { stabilization: true }
    });
  }
}
