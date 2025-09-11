import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

import { NgApexchartsModule, ChartComponent } from 'ng-apexcharts';
import type {
  ApexNonAxisChartSeries, ApexChart, ApexPlotOptions
} from 'ng-apexcharts';

export type RadialChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  plotOptions: ApexPlotOptions;
  labels: string[];
};

@Component({
  standalone: true,
  selector: 'app-card-score',
  imports: [CommonModule, MatCardModule, NgApexchartsModule],
  template: `
    <mat-card>
      <mat-card-title>Score</mat-card-title>
      <apx-chart
        [series]="opts.series"
        [chart]="opts.chart"
        [plotOptions]="opts.plotOptions"
        [labels]="opts.labels">
      </apx-chart>
    </mat-card>
  `
})
export class CardScoreComponent {
  @ViewChild('chart') chart?: ChartComponent;

  opts: RadialChartOptions = {
    series: [82],
    chart: { type: 'radialBar', height: 260 },
    plotOptions: {
      radialBar: {
        hollow: { size: '65%' },
        dataLabels: { value: { formatter: (v: number) => `${v}%` } }
      }
    },
    labels: ['AUC alvo ≥ 0.80']
  };
}
