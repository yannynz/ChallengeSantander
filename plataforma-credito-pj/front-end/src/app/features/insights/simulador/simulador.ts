import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap, tap } from 'rxjs';

import { ApiService, SimuladorRequest, SimuladorResponse } from '../../../shared/api';

@Component({
  standalone: true,
  selector: 'app-simulador',
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, RouterLink],
  templateUrl: './simulador.html',
  styleUrls: ['./simulador.scss'],
})
export class SimuladorComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.nonNullable.group({
    renda: 8000,
    idade: 35,
    historico: 0.8,
    conexoes_rede: 12,
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly resultado = signal<SimuladorResponse | null>(null);

  readonly scorePercent = computed(() => Math.round((this.resultado()?.score ?? 0) * 100));
  readonly influenciaPercent = computed(() => Math.round((this.resultado()?.influencia_rede ?? 0) * 100));

  ngOnInit(): void {
    this.form.valueChanges
      .pipe(
        startWith(this.form.value),
        debounceTime(250),
        map((value) => this.toPayload(value as SimuladorRequest)),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap((payload) =>
          this.api.simularCredito(payload).pipe(
            catchError((error) => {
              console.error('Falha ao simular credito', error);
              this.error.set('Nao foi possivel simular o cenario informado.');
              this.loading.set(false);
              return of(null);
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((response) => {
        if (response) {
          this.resultado.set(response);
        }
        this.loading.set(false);
      });
  }

  resetar(): void {
    this.form.setValue({ renda: 8000, idade: 35, historico: 0.8, conexoes_rede: 12 });
  }

  private toPayload(value: SimuladorRequest): SimuladorRequest {
    return {
      renda: Number(value.renda ?? 0),
      idade: Number(value.idade ?? 0),
      historico: Number(value.historico ?? 0),
      conexoes_rede: Number(value.conexoes_rede ?? 0),
      usuario: 'front-web',
    };
  }
}
