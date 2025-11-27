import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Leito, Paciente, StatusPaciente } from '../../../interfaces/censo.models';
import { CensoService } from '../../../services/censo.service';

@Component({
    selector: 'app-patient-card',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './patient-card.component.html',
    styleUrl: './patient-card.component.scss'
})
export class PatientCardComponent {
    @Input() leito!: Leito;
    @Output() pacienteChange = new EventEmitter<Paciente | null>();
    @Output() pendenciasChange = new EventEmitter<string>();
    @Output() deleteLeito = new EventEmitter<string>();

    constructor(private censoService: CensoService) { }

    /**
     * Inicializa paciente vazio se não existir
     */
    initPaciente(): void {
        if (!this.leito.paciente) {
            const now = new Date();
            const newPaciente: Paciente = {
                id: `p-${this.leito.id}-${Date.now()}`,
                nome: '',
                idade: 0,
                horaAdmissao: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
                dataAdmissao: now.toISOString().split('T')[0],
                recurso: '',
                suspeitaDiagnostica: '',
                pendencias: '',
                status: StatusPaciente.INTERNADO
            };
            this.leito = { ...this.leito, paciente: newPaciente };
            this.emitChange();
        }
    }

    /**
     * Emite mudanças para o componente pai
     */
    emitChange(): void {
        this.pacienteChange.emit(this.leito.paciente);
    }

    /**
     * Emite mudanças de pendências
     */
    onPendenciasChange(): void {
        if (this.leito.paciente) {
            this.pendenciasChange.emit(this.leito.paciente.pendencias);
        }
    }

    /**
     * Remove paciente do leito
     */
    clearPaciente(): void {
        this.leito = { ...this.leito, paciente: null };
        this.pacienteChange.emit(null);
        this.pendenciasChange.emit('');
    }

    /**
     * Solicita regulação para o paciente atual
     */
    solicitarRegulacao(): void {
        if (this.leito.paciente) {
            this.censoService.updateStatusPaciente(this.leito.id, 'Em Regulação');
            // Emit change to parent if needed
            this.emitChange();
        }
    }

    onDeleteLeito(): void {
        this.deleteLeito.emit(this.leito.id);
    }
}
