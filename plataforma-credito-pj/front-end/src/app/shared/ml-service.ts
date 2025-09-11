import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({providedIn:'root'})
export class MlService {
  base = 'http://localhost:8000/ml/v1';
  constructor(private http: HttpClient){}

  score(features:any): Observable<any>{
    return of({ score: 0.82, modelo: 'rf-baseline', versao: '1.0.0' });
    // REAL: return this.http.post(`${this.base}/score`, {features});
  }

  forecastArima(serie:string, horizonte:number){
    // REAL: return this.http.post(`${this.base}/forecast/arima`, {serie, horizonte});
    return of({ forecast: [4.1,4.15,4.2,4.1,4.0,3.95] });
  }
}
