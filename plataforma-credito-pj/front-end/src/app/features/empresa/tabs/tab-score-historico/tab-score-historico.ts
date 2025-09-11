import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import {
  NgApexchartsModule,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexStroke,
  ApexDataLabels,
  ApexTitleSubtitle,
} from 'ng-apexcharts';

type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
  dataLabels: ApexDataLabels;
  title: ApexTitleSubtitle;
};

@Component({
  standalone: true,
  selector: 'app-tab-score-historico',
  imports: [CommonModule, MatCardModule, NgApexchartsModule],
  template: `
    <mat-card>
      <mat-card-title>Score e Histórico</mat-card-title>
      <apx-chart
        [series]="opts.series"
        [chart]="opts.chart"
        [xaxis]="opts.xaxis"
        [stroke]="opts.stroke"
        [dataLabels]="opts.dataLabels"
        [title]="opts.title">
      </apx-chart>
    </mat-card>
  `,
})
export class TabScoreHistoricoComponent {
  // <-- inputs que o pai (empresa-page) usa
  @Input() empresaId?: string | number | null;
  @Input() cnpj?: string | null;

  opts: ChartOptions = {
    series: [{ name: 'Score', data: [12, 18, 22, 35, 28, 40, 42, 50, 55, 61, 70, 76] }],
    chart: { type: 'line', height: 280, toolbar: { show: false } },
    xaxis: { categories: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'] },
    stroke: { curve: 'smooth', width: 3 },
    dataLabels: { enabled: false },
    title: { text: 'Evolução do Score', align: 'left' },
  };
}
