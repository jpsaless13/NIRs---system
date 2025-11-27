import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PendenciasService } from '../../modules/services/pendencias.service';
import { PendenciaItem } from '../../modules/interfaces/censo.models';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-pendencias',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './pendencias.component.html',
    styleUrl: './pendencias.component.scss'
})
export class PendenciasComponent implements OnInit, OnDestroy {
    pendencias: PendenciaItem[] = [];
    private destroy$ = new Subject<void>();

    constructor(private pendenciasService: PendenciasService) { }

    ngOnInit(): void {
        this.pendenciasService.pendencias$
            .pipe(takeUntil(this.destroy$))
            .subscribe(pendencias => {
                this.pendencias = pendencias.sort((a, b) =>
                    a.leitoNumero - b.leitoNumero
                );
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    getPendenciasCount(): number {
        return this.pendencias.length;
    }

    formatTime(date: Date): string {
        return new Date(date).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}
