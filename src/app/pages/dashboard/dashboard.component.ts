import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DashboardService } from '../../modules/services/dashboard.service';
import { CensoService } from '../../modules/services/censo.service';
import { Aviso, Kpi } from '../../modules/interfaces/dashboard.models';
import { Leito } from '../../modules/interfaces/censo.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  private dashboardService = inject(DashboardService);
  private censoService = inject(CensoService);
  private router = inject(Router);

  // Signals
  avisos = this.dashboardService.avisos;

  // Use Signal from CensoService directly
  leitos = this.censoService.leitos;

  // Cumulative KPIs from Firestore
  cumulativeKpis = this.dashboardService.kpis;

  // Computed KPIs (Merging Live + Cumulative)
  kpis = computed(() => {
    const leitos = this.leitos();
    const cumulative = this.cumulativeKpis();

    console.log('📊 Dashboard: Computing KPIs. Leitos count:', leitos.length);

    const totalLeitos = leitos.length;
    const leitosOcupados = leitos.filter((l: Leito) => l.paciente !== null).length;
    const leitosDisponiveis = totalLeitos - leitosOcupados;
    const ocupacao = totalLeitos > 0 ? Math.round((leitosOcupados / totalLeitos) * 100) : 0;

    console.log('📊 Dashboard: Total:', totalLeitos, 'Occupied:', leitosOcupados, 'Available:', leitosDisponiveis);

    // Live counts
    const pacientesReguladosLive = leitos.filter((l: Leito) => l.paciente?.status === 'Regulado').length;
    const aguardandoTransporteLive = leitos.filter((l: Leito) => l.paciente?.status === 'Aguardando Transporte').length;

    // Helper to get cumulative value
    const getCumulativeValue = (name: string) => {
      const kpi = cumulative.find((k: Kpi) => k.name === name);
      return kpi ? kpi.valor : 0;
    };

    return [
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
        titulo: 'Regulados (Atual)',
        valor: pacientesReguladosLive.toString(),
        name: 'ambulance',
        cor: 'orange'
      },
      {
        titulo: 'Aguard. Transp.',
        valor: aguardandoTransporteLive.toString(),
        name: 'commute',
        cor: 'purple'
      },
      {
        titulo: 'Saídas (Total)',
        valor: getCumulativeValue('exit_to_app').toString(),
        name: 'exit_to_app',
        cor: 'green'
      },
      {
        titulo: 'Saídas Regulação',
        valor: getCumulativeValue('local_hospital').toString(),
        name: 'local_hospital',
        cor: 'blue'
      },
      {
        titulo: 'Altas',
        valor: getCumulativeValue('check_circle').toString(),
        name: 'check_circle',
        cor: 'green'
      }
    ];
  });

  novoAvisoTitulo = '';
  novoAvisoMensagem = '';
  novoAvisoTipo: 'critico' | 'info' | 'sucesso' = 'info';

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

  navigateToHistory(kpiName: string) {
    let filter = 'all';

    switch (kpiName) {
      case 'groups': // Total Pacientes
        filter = 'total';
        break;
      case 'exit_to_app': // Saídas (Total)
        filter = 'all'; // or 'alta' + 'regulacao' if we had a combined filter
        break;
      case 'local_hospital': // Saídas Regulação
        filter = 'regulacao';
        break;
      case 'check_circle': // Altas
        filter = 'alta';
        break;
      default:
        return; // Don't navigate for other KPIs
    }

    this.router.navigate(['/patient-history'], { queryParams: { filter } });
  }
}
