import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import {
  NgApexchartsModule,
  ApexAxisChartSeries, ApexChart, ApexXAxis, ApexStroke, ApexDataLabels
} from 'ng-apexcharts';

@Component({
  standalone: true,
  selector: 'app-card-macro',
  imports: [CommonModule, MatCardModule, NgApexchartsModule],
  template: `
    <mat-card><mat-card-title>Macro (IPCA/SELIC)</mat-card-title>
      <apx-chart
        [series]="series"
        [chart]="chart"
        [xaxis]="xaxis"
        [stroke]="stroke"
        [dataLabels]="dataLabels">
      </apx-chart>
    </mat-card>
  `
})
export class CardMacroComponent {
  series: ApexAxisChartSeries = [
    { name: 'IPCA', data: [4.1,4.2,4.0,3.9,4.0,4.1] },
    { name: 'SELIC', data: [10.5,10.25,10.25,10.0,9.75,9.5] }
  ];
  chart: ApexChart = { type: 'line', height: 260 };
  xaxis: ApexXAxis = { categories: ['Jan','Fev','Mar','Abr','Mai','Jun'] };
  stroke: ApexStroke = { curve: 'smooth', width: 3 };
  dataLabels: ApexDataLabels = { enabled: false };
}
