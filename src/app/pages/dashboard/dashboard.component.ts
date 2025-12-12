import { Component, computed, inject, signal } from '@angular/core';
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
  leitos = this.censoService.leitos;
  cumulativeKpis = this.dashboardService.kpis; // Legacy global counters
  historyStats = this.dashboardService.historyStats; // New history for period stats

  // Carousel State
  viewMode: 'dia' | 'mes' | 'ano' = 'dia';
  selectedDate = new Date();
  isPaused = false;
  showProgressBar = signal(true); // Signal to control progress bar visibility for reset
  private carouselTimer: any;
  private readonly CAROUSEL_INTERVAL = 5000;

  // Form State
  novoAvisoTitulo = '';
  novoAvisoMensagem = '';
  novoAvisoTipo: 'normal' | 'urgente' = 'normal'; // Changed to normal/urgente

  constructor() {
    this.startCarousel();
  }

  // Computed KPIs based on View Mode
  kpis = computed(() => {
    const leitos = this.leitos();
    const history = this.historyStats();
    const mode = this.viewMode;
    const date = this.selectedDate;

    // 1. Live Stats (Always Current)
    const totalLeitos = leitos.length;
    const leitosOcupados = leitos.filter((l: Leito) => !!l.paciente).length;
    const leitosDisponiveis = totalLeitos - leitosOcupados;
    const ocupacao = totalLeitos > 0 ? Math.round((leitosOcupados / totalLeitos) * 100) : 0;
    const pacientesReguladosLive = leitos.filter((l: Leito) => l.paciente?.status === 'Regulado').length;
    const aguardandoTransporteLive = leitos.filter((l: Leito) => l.paciente?.status === 'Aguardando Transporte').length;

    // 2. Period Stats (Filtered from History)
    let filteredHistory = history;

    if (mode === 'dia') {
      filteredHistory = history.filter(h =>
        h.dataSaida &&
        h.dataSaida.getDate() === date.getDate() &&
        h.dataSaida.getMonth() === date.getMonth() &&
        h.dataSaida.getFullYear() === date.getFullYear()
      );
    } else if (mode === 'mes') {
      filteredHistory = history.filter(h =>
        h.dataSaida &&
        h.dataSaida.getMonth() === date.getMonth() &&
        h.dataSaida.getFullYear() === date.getFullYear()
      );
    } else if (mode === 'ano') {
      filteredHistory = history.filter(h =>
        h.dataSaida &&
        h.dataSaida.getFullYear() === date.getFullYear()
      );
    }

    // Calculate counts from filtered history
    const saidasTotal = filteredHistory.length;
    const saidasRegulacao = filteredHistory.filter(h => h.tipoSaida === 'Regulação' || h.tipoSaida === 'Transferência').length;
    const altas = filteredHistory.filter(h => h.tipoSaida === 'Alta').length;
    const obitos = filteredHistory.filter(h => h.tipoSaida === 'Óbito').length;
    const evasao = filteredHistory.filter(h => h.tipoSaida === 'Evasão').length;

    return [
      {
        titulo: 'Total Pacientes',
        valor: leitosOcupados.toString(),
        name: 'groups',
        cor: 'blue',
        isLive: true
      },
      {
        titulo: 'Taxa Ocupação',
        valor: `${ocupacao}%`,
        name: 'monitoring',
        cor: ocupacao > 80 ? 'red' : (ocupacao > 50 ? 'orange' : 'green'),
        isLive: true
      },
      {
        titulo: 'Leitos Livres',
        valor: leitosDisponiveis.toString(),
        name: 'bed',
        cor: leitosDisponiveis < 5 ? 'red' : 'green',
        isLive: true
      },
      {
        titulo: 'Regulados',
        valor: pacientesReguladosLive.toString(),
        name: 'ambulance',
        cor: 'orange',
        isLive: true
      },
      {
        titulo: 'Aguard. Transp.',
        valor: aguardandoTransporteLive.toString(),
        name: 'commute',
        cor: 'purple',
        isLive: true
      },
      {
        titulo: 'Saídas (Total)',
        valor: saidasTotal.toString(),
        name: 'exit_to_app',
        cor: 'green',
        isLive: false
      },
      {
        titulo: 'Saídas Regulação',
        valor: saidasRegulacao.toString(),
        name: 'local_hospital',
        cor: 'blue',
        isLive: false
      },
      {
        titulo: 'Altas',
        valor: altas.toString(),
        name: 'check_circle',
        cor: 'green',
        isLive: false
      }
    ];
  });

  // Carousel Logic
  startCarousel() {
    this.stopCarousel(); // Ensure no duplicate timers
    this.carouselTimer = setInterval(() => {
      this.nextView(true);
    }, this.CAROUSEL_INTERVAL);
  }

  stopCarousel() {
    if (this.carouselTimer) {
      clearInterval(this.carouselTimer);
      this.carouselTimer = null;
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.stopCarousel();
    } else {
      this.startCarousel();
    }
  }

  nextView(auto = false) {
    if (!auto) this.resetTimer();

    if (this.viewMode === 'dia') {
      this.viewMode = 'mes';
    } else if (this.viewMode === 'mes') {
      this.viewMode = 'ano';
    } else {
      this.viewMode = 'dia';
    }
  }

  prevView() {
    this.resetTimer();
    if (this.viewMode === 'dia') {
      this.viewMode = 'ano';
    } else if (this.viewMode === 'mes') {
      this.viewMode = 'dia';
    } else {
      this.viewMode = 'mes';
    }
  }

  resetTimer() {
    this.stopCarousel();
    // Trigger progress bar reset
    this.showProgressBar.set(false);
    setTimeout(() => {
      this.showProgressBar.set(true);
      if (!this.isPaused) {
        this.startCarousel();
      }
    }, 10);
  }

  // Date Selection Logic
  get months() {
    return [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
  }

  get years() {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2];
  }

  get currentMonthIndex() {
    return this.selectedDate.getMonth();
  }

  setMonth(index: number) {
    const newDate = new Date(this.selectedDate);
    newDate.setMonth(index);
    this.selectedDate = newDate;
  }

  get currentYear() {
    return this.selectedDate.getFullYear();
  }

  setYear(year: number) {
    const newDate = new Date(this.selectedDate);
    newDate.setFullYear(year);
    this.selectedDate = newDate;
  }

  // Aviso Logic
  publicarAviso(): void {
    if (this.novoAvisoTitulo.trim() && this.novoAvisoMensagem.trim()) {
      // Map normal/urgente to info/critico
      const tipoMap: Record<string, 'info' | 'critico'> = {
        'normal': 'info',
        'urgente': 'critico'
      };

      this.dashboardService.addAviso({
        titulo: this.novoAvisoTitulo,
        mensagem: this.novoAvisoMensagem,
        tipo: tipoMap[this.novoAvisoTipo]
      });

      // Reset form
      this.novoAvisoTitulo = '';
      this.novoAvisoMensagem = '';
      this.novoAvisoTipo = 'normal';
    }
  }

  deleteAviso(id: string, event: Event): void {
    event.stopPropagation();
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
      case 'groups': filter = 'total'; break;
      case 'exit_to_app': filter = 'all'; break;
      case 'local_hospital': filter = 'regulacao'; break;
      case 'check_circle': filter = 'alta'; break;
      default: return;
    }
    this.router.navigate(['/patient-history'], { queryParams: { filter } });
  }
}
