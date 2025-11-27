import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CensoService } from '../../modules/services/censo.service';
import { PendenciasService } from '../../modules/services/pendencias.service';
import { ExcelExportService } from '../../modules/services/excel-export.service';
import { PatientCardComponent } from '../../modules/components/censo/patient/patient-card.component';
import { SecaoCenso, Paciente, SetorEnum } from '../../modules/interfaces/censo.models';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-censo',
  standalone: true,
  imports: [CommonModule, PatientCardComponent],
  templateUrl: './censo.component.html',
  styleUrl: './censo.component.scss'
})
export class CensoComponent implements OnInit, OnDestroy {
  secoes: SecaoCenso[] = [];
  isExporting = false;
  private destroy$ = new Subject<void>();

  constructor(
    private censoService: CensoService,
    private pendenciasService: PendenciasService,
    private excelService: ExcelExportService
  ) { }

  ngOnInit(): void {
    this.censoService.leitos$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadCenso();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCenso(): void {
    this.secoes = this.censoService.getSecoesCenso();

    // Inicializar pendências dos pacientes existentes
    this.secoes.forEach(secao => {
      secao.leitos.forEach(leito => {
        if (leito.paciente && leito.paciente.pendencias) {
          this.pendenciasService.updatePendencia(
            leito.paciente.id,
            leito.paciente.nome,
            leito.numero,
            leito.paciente.pendencias
          );
        }
      });
    });
  }

  onPacienteChange(leitoId: string, paciente: Paciente | null): void {
    this.censoService.updatePaciente(leitoId, paciente);
  }

  onPendenciasChange(pacienteId: string, pacienteNome: string, leitoNumero: number, texto: string): void {
    this.pendenciasService.updatePendencia(pacienteId, pacienteNome, leitoNumero, texto);

    // Find the bed/patient to update Firestore
    for (const secao of this.secoes) {
      const leito = secao.leitos.find(l => l.paciente?.id === pacienteId);
      if (leito && leito.paciente) {
        const updatedPaciente = { ...leito.paciente, pendencias: texto };
        this.censoService.updatePaciente(leito.id, updatedPaciente);
        break;
      }
    }
  }

  async exportarCenso(): Promise<void> {
    this.isExporting = true;

    try {
      await this.excelService.exportCenso(this.secoes);
      // Feedback visual opcional
      console.log('Censo exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar censo:', error);
    } finally {
      this.isExporting = false;
    }
  }

  getTotalLeitos(): number {
    return this.secoes.reduce((sum, secao) => sum + secao.leitos.length, 0);
  }

  getLeitosOcupados(): number {
    return this.secoes.reduce((sum, secao) =>
      sum + secao.leitos.filter(l => l.paciente !== null).length, 0
    );
  }

  getLeitosDisponiveis(): number {
    return this.getTotalLeitos() - this.getLeitosOcupados();
  }

  getOcupacaoPercentual(): number {
    const total = this.getTotalLeitos();
    return total > 0 ? Math.round((this.getLeitosOcupados() / total) * 100) : 0;
  }

  getLeitosOcupadosSecao(secao: SecaoCenso): number {
    return secao.leitos.filter(l => l.paciente !== null).length;
  }

  addLeito(setor: SetorEnum): void {
    this.censoService.addLeito(setor);
  }

  deleteLeito(leitoId: string): void {
    if (confirm('Deseja realmente excluir este leito?')) {
      this.censoService.deleteLeito(leitoId);
    }
  }
}

