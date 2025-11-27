import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../modules/services/dashboard.service';
import { CensoService } from '../../modules/services/censo.service';
import { Aviso, Kpi } from '../../modules/interfaces/dashboard.models';
import { Subject, takeUntil } from 'rxjs';

import { Leito } from '../../modules/interfaces/censo.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  avisos: Aviso[] = [];
  kpis: Kpi[] = [];

  novoAvisoTitulo = '';
  novoAvisoMensagem = '';
  novoAvisoTipo: 'critico' | 'info' | 'sucesso' = 'info';

  private destroy$ = new Subject<void>();

  constructor(
    private dashboardService: DashboardService,
    private censoService: CensoService
  ) { }

  ngOnInit(): void {
    this.dashboardService.avisos$
      .pipe(takeUntil(this.destroy$))
      .subscribe(avisos => {
        this.avisos = avisos;
      });

    // Subscribe to Censo data to update KPIs
    this.censoService.leitos$
      .pipe(takeUntil(this.destroy$))
      .subscribe(leitos => {
        this.updateKpis(leitos);
      });
  }

  private updateKpis(leitos: Leito[]): void {
    const totalLeitos = leitos.length;
    const leitosOcupados = leitos.filter(l => l.paciente !== null).length;
    const leitosDisponiveis = totalLeitos - leitosOcupados;
    const ocupacao = totalLeitos > 0 ? Math.round((leitosOcupados / totalLeitos) * 100) : 0;

    // Novos KPIs
    const pacientesRegulados = leitos.filter(l => l.paciente?.status === 'Regulado').length;
    const aguardandoTransporte = leitos.filter(l => l.paciente?.status === 'Aguardando Transporte').length;

    this.kpis = [
      {
        titulo: 'Total Pacientes',
        valor: leitosOcupados.toString(),
        name: 'groups',
        cor: 'blue'
      },
      {
        titulo: 'Taxa Ocupação',
        valor: `${ocupacao}%`,
        name: 'monitoring',
        cor: ocupacao > 80 ? 'red' : (ocupacao > 50 ? 'orange' : 'green')
      },
      {
        titulo: 'Leitos Livres',
        valor: leitosDisponiveis.toString(),
        name: 'bed',
        cor: leitosDisponiveis < 5 ? 'red' : 'green'
      },
      {
        titulo: 'Regulados',
        valor: pacientesRegulados.toString(),
        name: 'ambulance',
        cor: 'orange'
      },
      {
        titulo: 'Aguardando Transp.',
        valor: aguardandoTransporte.toString(),
        name: 'commute',
        cor: 'purple'
      },
      {
        titulo: 'Total Leitos',
        valor: totalLeitos.toString(),
        name: 'local_hospital',
        cor: 'purple'
      }
    ];
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  publicarAviso(): void {
    if (this.novoAvisoTitulo.trim() && this.novoAvisoMensagem.trim()) {
      this.dashboardService.addAviso({
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

  deleteAviso(id: string, event: Event): void {
    event.stopPropagation();

    // Optimistic UI update with animation
    const element = (event.target as HTMLElement).closest('.aviso-card');
    if (element) {
      element.classList.add('removing');
      setTimeout(() => {
        this.dashboardService.deleteAviso(id);
      }, 300);
    } else {
      this.dashboardService.deleteAviso(id);
    }
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
