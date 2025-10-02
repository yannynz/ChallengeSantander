import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import {
  NgApexchartsModule,
  ApexAxisChartSeries, ApexChart, ApexXAxis, ApexPlotOptions
} from 'ng-apexcharts';

@Component({
  standalone: true,
  selector: 'app-card-alertas',
  imports: [CommonModule, MatCardModule, NgApexchartsModule],
  template: `
    <mat-card><mat-card-title>Alertas</mat-card-title>
      <apx-chart
        [series]="series"
        [chart]="chart"
        [xaxis]="xaxis"
        [plotOptions]="plotOptions">
      </apx-chart>
    </mat-card>
  `
})
export class CardAlertasComponent {
  series: ApexAxisChartSeries = [{ name:'Alertas', data:[3,1,4,2,5,2]}];
  chart: ApexChart = { type:'bar', height:260 };
  xaxis: ApexXAxis = { categories:['Risco','Saldo','Rede','Score','Dados','Outros'] };
  plotOptions: ApexPlotOptions = { bar:{ columnWidth:'45%', borderRadius:6 } };
}
