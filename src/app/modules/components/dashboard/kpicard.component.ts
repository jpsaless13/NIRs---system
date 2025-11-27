import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import { Aviso, Kpi } from '../../interfaces/dashboard.models';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-kpicard',
  imports: [CommonModule, FormsModule],
  templateUrl: './kpicard.component.html',
  styleUrl: './kpicard.component.scss'
})
export class Kpicard implements OnInit, OnDestroy {

  avisos: Aviso[] = [];
  kpis: Kpi[] = [];

  novoAvisoTitulo: string = '';
  novoAvisoMensagem: string = '';
  novoAvisoTipo: 'critico' | 'info' | 'sucesso' = 'info';

  private destroy$ = new Subject<void>();

  constructor(private dashboardService: DashboardService) { }

  ngOnInit(): void {
    // Subscribe to avisos from Firestore
    this.dashboardService.avisos$
      .pipe(takeUntil(this.destroy$))
      .subscribe(avisos => {
        this.avisos = avisos;
      });

    // Subscribe to KPIs from Firestore
    this.dashboardService.kpis$
      .pipe(takeUntil(this.destroy$))
      .subscribe(kpis => {
        this.kpis = kpis;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async publicarAviso(): Promise<void> {
    if (this.novoAvisoTitulo.trim() && this.novoAvisoMensagem.trim()) {
      await this.dashboardService.addAviso({
        titulo: this.novoAvisoTitulo,
        mensagem: this.novoAvisoMensagem,
        tipo: this.novoAvisoTipo
      });

      // Reset form
      this.novoAvisoTitulo = '';
      this.novoAvisoMensagem = '';
      this.novoAvisoTipo = 'info';
    }
  }

  async deleteAviso(id: string): Promise<void> {
    await this.dashboardService.deleteAviso(id);
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `${minutes} min atrás`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;

    return d.toLocaleDateString('pt-BR');
  }

  getAvisoIcon(tipo: string): string {
    const icons: { [key: string]: string } = {
      'critico': 'warning',
      'info': 'info',
      'sucesso': 'check_circle'
    };
    return icons[tipo] || 'info';
  }
}
