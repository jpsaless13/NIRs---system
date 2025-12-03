import { Component, OnInit, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PatientHistoryService, HistoricoPaciente } from '../../modules/services/patient-history.service';
import { CensoService } from '../../modules/services/censo.service';
import { FormsModule } from '@angular/forms';
import { Paciente } from '../../modules/interfaces/censo.models';

interface GeneralPatient extends Paciente {
  tipoSaida: string;
  dataSaida?: any;
  isCurrent: boolean;
  permanencia?: string;
}

@Component({
  selector: 'app-patient-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="history-container">
      <header class="page-header">
        <h1>Pacientes</h1>
        <p class="subtitle">Visão geral de todos os pacientes (Internados e Histórico)</p>
      </header>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card blue" (click)="setFilter('total')" [class.active]="currentFilter() === 'total'">
          <div class="icon-box">
            <span class="material-symbols-outlined">groups</span>
          </div>
          <div class="info">
            <span class="label">Total Geral</span>
            <span class="value">{{ totalGeneral() }}</span>
          </div>
        </div>

        <div class="stat-card purple" (click)="setFilter('internados')" [class.active]="currentFilter() === 'internados'">
          <div class="icon-box">
            <span class="material-symbols-outlined">ward</span>
          </div>
          <div class="info">
            <span class="label">Internados</span>
            <span class="value">{{ totalCurrent() }}</span>
          </div>
        </div>

        <div class="stat-card green" (click)="setFilter('alta')" [class.active]="currentFilter() === 'alta'">
          <div class="icon-box">
            <span class="material-symbols-outlined">check_circle</span>
          </div>
          <div class="info">
            <span class="label">Altas</span>
            <span class="value">{{ totalDischarges() }}</span>
          </div>
        </div>

        <div class="stat-card orange" (click)="setFilter('regulacao')" [class.active]="currentFilter() === 'regulacao'">
          <div class="icon-box">
            <span class="material-symbols-outlined">ambulance</span>
          </div>
          <div class="info">
            <span class="label">Saídas Regulação</span>
            <span class="value">{{ totalRegulationExits() }}</span>
          </div>
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="controls-bar">
        <div class="search-box">
          <span class="material-symbols-outlined">search</span>
          <input type="text" [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)" placeholder="Buscar paciente...">
        </div>
        
        <div class="filter-tabs">
          <button [class.active]="currentFilter() === 'total'" (click)="setFilter('total')">Geral</button>
          <button [class.active]="currentFilter() === 'internados'" (click)="setFilter('internados')">Internados</button>
          <button [class.active]="currentFilter() === 'alta'" (click)="setFilter('alta')">Altas</button>
          <button [class.active]="currentFilter() === 'regulacao'" (click)="setFilter('regulacao')">Regulação</button>
        </div>
      </div>

      <!-- Patient List -->
      <div class="patient-list">
        <div class="table-header">
          <span>Paciente</span>
          <span>Status</span>
          <span>Recurso</span>
          <span>Destino/Saída</span>
          <span class="actions-header">Ações</span>
        </div>
        
        <div class="list-content">
          <div class="patient-row" *ngFor="let p of filteredList()">
            <div class="col-name">
              <strong>{{ p.nome }}</strong>
                <small>Admissão: <strong>{{ formatDate(getAdmissionDate(p)) }}</strong></small>
            </div>
            <div class="col-status">
              <span class="badge" [ngClass]="getStatusClass(p)">
                {{ p.isCurrent ? 'Internado' : p.tipoSaida }}
              </span>
              <small *ngIf="!p.isCurrent">Saída: <strong>{{ formatDate(p.dataSaida) }}</strong></small>
            </div>

            <div class="col-resource">
              {{ p.recurso || 'N/A' }}
            </div>
            <div class="col-dest">
              {{ p.destino || (p.isCurrent ? '-' : p.tipoSaida) }}
            </div>
            
            <div class="col-actions">
              <button class="btn-icon edit" (click)="$event.stopPropagation(); openEditModal(p)" title="Editar">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button class="btn-icon delete" (click)="$event.stopPropagation(); deletePatient(p)" title="Excluir">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>

          <div class="empty-state" *ngIf="filteredList().length === 0">
            <p>Nenhum registro encontrado.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div class="modal-overlay" *ngIf="editingPatient" (click)="closeEditModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <h2>Editar Paciente</h2>
        
        <div class="form-group">
          <label>Nome</label>
          <input type="text" [(ngModel)]="editingPatient.nome" class="form-control">
        </div>

        <div class="form-group">
          <label>Idade</label>
          <input type="number" [(ngModel)]="editingPatient.idade" class="form-control">
        </div>

        <div class="form-group">
          <label>Recurso</label>
          <input type="text" [(ngModel)]="editingPatient.recurso" class="form-control">
        </div>

        <div class="form-group">
          <label>Suspeita Diagnóstica</label>
          <input type="text" [(ngModel)]="editingPatient.suspeitaDiagnostica" class="form-control">
        </div>

        <div class="form-group">
          <label>Nº Regulação</label>
          <input type="text" [(ngModel)]="editingPatient.numeroRegulacao" class="form-control">
        </div>

        <div class="form-group">
          <label>Unidade Destino</label>
          <input type="text" [(ngModel)]="editingPatient.unidadeDestino" class="form-control">
        </div>

        <div class="form-group">
          <label>Observações</label>
          <textarea [(ngModel)]="editingPatient.pendencias" class="form-control" rows="3"></textarea>
        </div>

        <div class="form-group">
          <label>Data Admissão</label>
          <input type="datetime-local" [ngModel]="editingPatientAdmissionDate" (ngModelChange)="updateAdmissionDate($event)" class="form-control">
        </div>

        <div class="form-group" *ngIf="!editingPatient.isCurrent">
          <label>Data Saída</label>
          <input type="datetime-local" [ngModel]="editingPatientExitDate" (ngModelChange)="updateExitDate($event)" class="form-control">
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" (click)="closeEditModal()">Cancelar</button>
          <button class="btn-save" (click)="saveEdit()">Salvar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .history-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }
    .page-header { margin-bottom: 2rem; }
    .page-header h1 { margin: 0; font-size: 1.75rem; color: #2c3e50; }
    .subtitle { color: #7f8c8d; margin: 0.5rem 0 0; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      border: 2px solid transparent;
    }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
    .stat-card.active { border-color: #3498db; background-color: #f8faff; }
    
    .icon-box {
      width: 48px; height: 48px;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      color: white;
    }
    .stat-card.blue .icon-box { background: #3498db; }
    .stat-card.green .icon-box { background: #2ecc71; }
    .stat-card.orange .icon-box { background: #e67e22; }
    .stat-card.purple .icon-box { background: #9b59b6; }

    .info { display: flex; flex-direction: column; }
    .info .label { font-size: 0.875rem; color: #7f8c8d; }
    .info .value { font-size: 1.5rem; font-weight: 700; color: #2c3e50; }

    .controls-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .search-box {
      background: white;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border: 1px solid #e0e0e0;
      width: 300px;
    }
    .search-box input { border: none; outline: none; width: 100%; }
    
    .filter-tabs {
      display: flex;
      background: #f1f2f6;
      padding: 0.25rem;
      border-radius: 8px;
    }
    .filter-tabs button {
      padding: 0.5rem 1rem;
      border: none;
      background: transparent;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      color: #7f8c8d;
    }
    .filter-tabs button.active {
      background: white;
      color: #2c3e50;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .patient-list {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      overflow: hidden;
    }
    .table-header {
      display: grid;
      grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 100px;
      padding: 1rem 1.5rem;
      background: #f8f9fa;
      font-weight: 600;
      color: #7f8c8d;
      border-bottom: 1px solid #eee;
    }
    .patient-row {
      display: grid;
      grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 100px;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #f1f2f6;
      align-items: center;
    }
    .patient-row:last-child { border-bottom: none; }
    .col-name { display: flex; flex-direction: column; }
    .col-name small { color: #95a5a6; font-size: 0.8rem; }
    
    .col-status { display: flex; flex-direction: column; gap: 0.25rem; }
    .col-status small { color: #95a5a6; font-size: 0.75rem; }

    .col-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
    .btn-icon {
      background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px;
      color: #95a5a6; transition: all 0.2s;
    }
    .btn-icon:hover { background: #f1f2f6; }
    .btn-icon.edit:hover { color: #3498db; }
    .btn-icon.delete:hover { color: #e74c3c; }

    .badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 500;
      width: fit-content;
    }
    .badge.internado { background: #e8f4fd; color: #3498db; }
    .badge.alta { background: #d4edda; color: #155724; }
    .badge.regulacao { background: #fff3cd; color: #856404; }

    .empty-state { padding: 3rem; text-align: center; color: #95a5a6; }

    /* Modal Styles */
    .modal-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); z-index: 1000;
      display: flex; align-items: center; justify-content: center;
    }
    .modal-content {
      background: white; padding: 1.5rem; border-radius: 12px;
      width: 100%; max-width: 400px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    .modal-content h2 { margin-top: 0; color: #2c3e50; font-size: 1.25rem; margin-bottom: 1rem; }
    .form-group { margin-bottom: 0.75rem; }
    .form-group label { display: block; margin-bottom: 0.25rem; color: #7f8c8d; font-size: 0.85rem; }
    .form-control {
      width: 100%; padding: 0.5rem; border: 1px solid #e0e0e0; border-radius: 6px;
      font-size: 0.9rem;
    }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
    .btn-cancel {
      padding: 0.5rem 1rem; border: none; background: #f1f2f6; color: #7f8c8d;
      border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 0.9rem;
    }
    .btn-save {
      padding: 0.5rem 1rem; border: none; background: #3498db; color: white;
      border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 0.9rem;
    }
  `]
})
export class PatientHistoryComponent implements OnInit {
  private historyService = inject(PatientHistoryService);
  private censoService = inject(CensoService);
  private route = inject(ActivatedRoute);

  // Signals for UI state
  searchTerm = signal('');
  currentFilter = signal('total');

  // Computed signal for all patients (merged)
  allPatients = computed(() => {
    const leitos = this.censoService.leitos();
    const history: HistoricoPaciente[] = this.historyService.history();

    // Process Current Patients
    const currentPatients: GeneralPatient[] = leitos
      .filter(l => !!l.paciente)
      .map(l => {
        const p = l.paciente!;
        return {
          ...p,
          tipoSaida: 'Internado',
          isCurrent: true,
          permanencia: this.calculateDuration(this.getAdmissionDate(p))
        };
      });

    // Process History Patients
    const historyPatients: GeneralPatient[] = history.map(h => ({
      ...h,
      isCurrent: false,
      permanencia: this.calculateDuration(this.getAdmissionDate(h), h.dataSaida)
    }));

    // Merge and Sort
    return [...currentPatients, ...historyPatients].sort((a, b) => {
      const dateA = a.dataSaida ? new Date(a.dataSaida.toDate ? a.dataSaida.toDate() : a.dataSaida) : new Date();
      const dateB = b.dataSaida ? new Date(b.dataSaida.toDate ? b.dataSaida.toDate() : b.dataSaida) : new Date();
      return dateB.getTime() - dateA.getTime();
    });
  });

  // Computed signal for filtered list
  filteredList = computed(() => {
    let temp = this.allPatients();
    const filter = this.currentFilter();
    const term = this.searchTerm().toLowerCase();

    // Apply Filter
    if (filter === 'internados') {
      temp = temp.filter(p => p.isCurrent);
    } else if (filter === 'alta') {
      temp = temp.filter(p => !p.isCurrent && p.tipoSaida === 'Alta');
    } else if (filter === 'regulacao') {
      temp = temp.filter(p => !p.isCurrent && p.tipoSaida === 'Regulação');
    }

    // Apply Search
    if (term) {
      temp = temp.filter(p =>
        p.nome.toLowerCase().includes(term)
      );
    }

    return temp;
  });

  // Computed stats
  totalGeneral = computed(() => this.allPatients().length);
  totalCurrent = computed(() => this.allPatients().filter(p => p.isCurrent).length);
  totalDischarges = computed(() => this.allPatients().filter(p => !p.isCurrent && p.tipoSaida === 'Alta').length);
  totalRegulationExits = computed(() => this.allPatients().filter(p => !p.isCurrent && p.tipoSaida === 'Regulação').length);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['filter']) {
        this.currentFilter.set(params['filter']);
      }
    });
  }

  setFilter(filter: string) {
    this.currentFilter.set(filter);
  }

  // Edit State
  editingPatient: GeneralPatient | null = null;
  editingPatientAdmissionDate: string = '';
  editingPatientExitDate: string = '';

  async deletePatient(p: GeneralPatient) {
    if (p.isCurrent) {
      alert('Para remover pacientes internados, utilize a tela do Censo.');
      return;
    }

    if (!p.id) {
      console.error('Error: Patient ID is missing', p);
      alert('Erro: ID do paciente não encontrado. Não é possível excluir.');
      return;
    }

    if (confirm(`Tem certeza que deseja excluir PERMANENTEMENTE o histórico de "${p.nome}"?`)) {
      try {
        console.log('Deleting patient with ID:', p.id);
        await this.historyService.deleteHistory(p.id);
        // Signal updates automatically
      } catch (error) {
        console.error('Error deleting patient:', error);
        alert('Erro ao excluir registro. Verifique o console para mais detalhes.');
      }
    }
  }

  openEditModal(p: GeneralPatient) {
    // Clone to avoid mutating signal directly
    this.editingPatient = { ...p };

    // Format dates for input[type="datetime-local"]
    this.editingPatientAdmissionDate = this.formatDateForInput(this.getAdmissionDate(p));
    if (!p.isCurrent && p.dataSaida) {
      const exitDate = p.dataSaida.toDate ? p.dataSaida.toDate() : new Date(p.dataSaida);
      this.editingPatientExitDate = this.formatDateForInput(exitDate);
    } else {
      this.editingPatientExitDate = '';
    }
  }

  closeEditModal() {
    this.editingPatient = null;
  }

  updateAdmissionDate(value: string) {
    this.editingPatientAdmissionDate = value;
  }

  updateExitDate(value: string) {
    this.editingPatientExitDate = value;
  }

  async saveEdit() {
    if (!this.editingPatient) return;

    try {
      const updates: any = {
        nome: this.editingPatient.nome,
        idade: this.editingPatient.idade,
        recurso: this.editingPatient.recurso,
        suspeitaDiagnostica: this.editingPatient.suspeitaDiagnostica,
        numeroRegulacao: this.editingPatient.numeroRegulacao,
        pendencias: this.editingPatient.pendencias
      };

      if (this.editingPatient.unidadeDestino) {
        updates.unidadeDestino = this.editingPatient.unidadeDestino;
      }

      if (this.editingPatient.destino) {
        updates.destino = this.editingPatient.destino;
      }

      if (this.editingPatientAdmissionDate) {
        updates.dataAdmissao = new Date(this.editingPatientAdmissionDate);
      }

      if (!this.editingPatient.isCurrent && this.editingPatientExitDate) {
        updates.dataSaida = new Date(this.editingPatientExitDate);
      }

      console.log('Saving edits for patient:', this.editingPatient.id, updates);

      if (this.editingPatient.isCurrent) {
        // Update in Census (Leitos)
        const leito = this.censoService.leitos().find(l => l.paciente?.id === this.editingPatient!.id);
        if (leito) {
          await this.censoService.updatePaciente(leito.id, { ...leito.paciente!, ...updates });
        }
      } else {
        // Update in History
        await this.historyService.updateHistory(this.editingPatient.id, updates);
      }

      this.closeEditModal();
    } catch (error) {
      console.error('Error updating patient:', error);
      alert('Erro ao atualizar paciente.');
    }
  }

  private formatDateForInput(date: Date): string {
    if (!date) return '';
    // YYYY-MM-DDThh:mm
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  calculateDuration(start: Date, end?: any): string {
    if (!start) return '-';

    const startDate = start;
    const endDate = end ? (end.toDate ? end.toDate() : new Date(end)) : new Date();

    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) return `${diffDays}d ${diffHours}h`;
    return `${diffHours}h`;
  }

  getAdmissionDate(p: any): Date {
    if (!p.dataAdmissao) return new Date();

    // If it's already a Date object or Timestamp
    if (p.dataAdmissao instanceof Date) return p.dataAdmissao;
    if (p.dataAdmissao.toDate) return p.dataAdmissao.toDate();

    // If it's a string YYYY-MM-DD
    const dateStr = p.dataAdmissao;
    const timeStr = p.horaAdmissao || '00:00';

    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);

    return new Date(year, month - 1, day, hours, minutes);
  }

  formatDate(date: any): string {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  getStatusClass(p: GeneralPatient): string {
    if (p.isCurrent) return 'internado';
    if (p.tipoSaida === 'Alta') return 'alta';
    return 'regulacao';
  }
}
