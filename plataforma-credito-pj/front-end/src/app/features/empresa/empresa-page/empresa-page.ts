import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-empresa-page',
  templateUrl: './empresa-page.html',
  styleUrls: ['./empresa-page.scss'],
})
export class EmpresaPageComponent {
  id?: string;
  cnpj?: string;

  constructor(private route: ActivatedRoute) {
    this.route.paramMap.subscribe(p => {
      this.id = p.get('id') || undefined;
      this.cnpj = p.get('cnpj') || undefined;
    });
  }
}
