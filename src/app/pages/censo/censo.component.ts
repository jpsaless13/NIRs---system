import { Component, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CensoService } from '../../modules/services/censo.service';
import { PendenciasService } from '../../modules/services/pendencias.service';
import { ExcelExportService } from '../../modules/services/excel-export.service';
import { PatientCardComponent } from '../../modules/components/censo/patient/patient-card.component';
import { SecaoCenso, Paciente, SetorEnum, Leito } from '../../modules/interfaces/censo.models';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-censo',
  standalone: true,
  imports: [CommonModule, PatientCardComponent, DragDropModule],
  templateUrl: './censo.component.html',
  styleUrl: './censo.component.scss'
})
export class CensoComponent {
  private censoService = inject(CensoService);
  private pendenciasService = inject(PendenciasService);
  private excelService = inject(ExcelExportService);

  isExporting = false;

  // Computed signal for sections
  secoes = computed(() => this.censoService.getSecoesCenso());

  constructor() {
    // Effect to handle side effects like updating pendencias
    effect(() => {
      const secoes = this.secoes();
      // Inicializar pendências dos pacientes existentes
      secoes.forEach((secao: SecaoCenso) => {
        secao.leitos.forEach((leito: Leito) => {
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
    });
  }

  onPacienteChange(leitoId: string, paciente: Paciente | null): void {
    this.censoService.updatePaciente(leitoId, paciente);
  }

  onDarAlta(leitoId: string): void {
    console.log('CensoComponent: onDarAlta for', leitoId);

    // Use current time immediately as per requirement
    const exitDate = new Date();

    this.censoService.darAlta(leitoId, exitDate)
      .catch((error: any) => {
        console.error('Error giving discharge:', error);
        alert('Erro ao dar alta. Tente novamente.');
      });
  }

  onRemovePaciente(leitoId: string): void {
    console.log('CensoComponent: onRemovePaciente for', leitoId);
    this.censoService.removePaciente(leitoId)
      .catch((error: any) => {
        console.error('Error removing patient:', error);
        alert('Erro ao remover paciente.');
      });
  }

  onUpdateBedNumber(data: { leitoId: string, newNumero: number }): void {
    console.log('CensoComponent: onUpdateBedNumber', data);
    this.censoService.updateLeitoNumero(data.leitoId, data.newNumero)
      .catch((error: any) => {
        console.error('Error updating bed number:', error);
        alert('Erro ao atualizar número do leito.');
      });
  }

  onPendenciasChange(pacienteId: string, pacienteNome: string, leitoNumero: number, texto: string): void {
    this.pendenciasService.updatePendencia(pacienteId, pacienteNome, leitoNumero, texto);

    // Find the bed/patient to update Firestore
    const secoes = this.secoes();
    for (const secao of secoes) {
      const leito = secao.leitos.find((l: Leito) => l.paciente?.id === pacienteId);
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
      await this.excelService.exportCenso(this.secoes());
      // Feedback visual opcional
      console.log('Censo exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar censo:', error);
    } finally {
      this.isExporting = false;
    }
  }

  getTotalLeitos(): number {
    return this.secoes().reduce((sum: number, secao: SecaoCenso) => sum + secao.leitos.length, 0);
  }

  getLeitosOcupados(): number {
    return this.secoes().reduce((sum: number, secao: SecaoCenso) =>
      sum + secao.leitos.filter((l: Leito) => !!l.paciente).length, 0
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
    return secao.leitos.filter((l: Leito) => !!l.paciente).length;
  }

  addLeito(setor: SetorEnum): void {
    this.censoService.addLeito(setor);
  }

  deleteLeito(leitoId: string): void {
    if (confirm('Deseja realmente excluir este leito?')) {
      console.log('Deleting leito:', leitoId);
      this.censoService.deleteLeito(leitoId)
        .catch((error: any) => {
          console.error('Error deleting leito:', error);
          alert('Erro ao excluir leito. Tente novamente.');
        });
    }
  }

  drop(event: CdkDragDrop<Leito[]>) {
    if (event.previousContainer === event.container) {
      return;
    }

    const previousLeito = event.previousContainer.data[event.previousIndex];
    const currentLeito = event.container.data[event.currentIndex];

    console.log('Drop event:', {
      from: previousLeito,
      to: currentLeito
    });

    // Only allow move if source has patient
    if (!previousLeito.paciente) {
      console.warn('Source bed has no patient');
      return;
    }

    // Call service to move/swap in Firestore
    this.censoService.movePaciente(previousLeito.id, currentLeito.id)
      .catch((error: any) => {
        console.error('Error moving patient:', error);
        alert('Erro ao mover paciente. Tente novamente.');
      });
  }
}
