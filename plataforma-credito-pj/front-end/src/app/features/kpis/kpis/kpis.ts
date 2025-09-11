import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  standalone: true,
  selector: 'app-kpis',
  templateUrl: './kpis.html',
  styleUrls: ['./kpis.scss'],
  imports: [CommonModule, MatCardModule],
})
export class KpisComponent {}
