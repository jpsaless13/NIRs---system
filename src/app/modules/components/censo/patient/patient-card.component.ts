import { Component, Input, Output, EventEmitter, inject, OnInit, OnChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Leito, Paciente, StatusPaciente, PendenciaPaciente } from '../../../interfaces/censo.models';
import { PendenciasService } from '../../../services/pendencias.service';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-patient-card',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './patient-card.component.html',
    styleUrl: './patient-card.component.scss'
})
export class PatientCardComponent implements OnInit, OnChanges {
    @Input() leito!: Leito;
    @Output() pacienteChange = new EventEmitter<Paciente | null>();
    @Output() pendenciasChange = new EventEmitter<string>();
    @Output() deleteLeito = new EventEmitter<string>();
    @Output() darAlta = new EventEmitter<string>();
    @Output() removerPaciente = new EventEmitter<string>();
    @Output() updateBedNumber = new EventEmitter<{ leitoId: string, newNumero: number }>();
    constructor() { }

    // Better approach: Use a computed property
    // patientPendencias = computed(() => ...);
    // But I need to import computed.

    // Let's just use the service signal directly in the template with a pipe or helper?
    // Or just filter in the template? No, performance.

    // Let's add `effect` to the imports in the next step and use it here.
    // For now, I will just leave the constructor empty or remove this block and do it properly.

    // Actually, I'll use a getter that filters the signal.
    // filteredPendencias REMOVED

    private pendenciasService = inject(PendenciasService);
    private authService = inject(AuthService);
    private cdr = inject(ChangeDetectorRef);

    editingBedNumber = false;
    tempBedNumber: number = 0;

    ngOnInit() {
        // No longer loading pendencies here
    }

    ngOnChanges() {
        // Ensure UI updates when input changes
        this.cdr.markForCheck();
    }

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
        console.log('PatientCard: emitChange', this.leito.paciente);
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
     * Trigger "Alta" (discharge) action
     */
    darAltaPaciente(): void {
        console.log('PatientCard: darAltaPaciente');
        if (confirm('Confirmar alta do paciente?')) {
            this.darAlta.emit(this.leito.id);
        }
    }

    onRemovePaciente(): void {
        if (confirm('ATENÇÃO: Deseja remover este paciente SEM salvar no histórico?\n\nUse esta opção apenas para corrigir erros de cadastro.\nPara dar alta normal, use o botão de saída (porta).')) {
            this.removerPaciente.emit(this.leito.id);
        }
    }

    /**
     * Define o status do paciente - emits to parent for handling
     */
    setStatus(status: StatusPaciente) {
        if (!this.leito.paciente) return;

        // Toggle logic for Regulado and Aguardando Transporte
        if ((status === StatusPaciente.REGULADO && this.leito.paciente.status === StatusPaciente.REGULADO) ||
            (status === StatusPaciente.AGUARDANDO_TRANSPORTE && this.leito.paciente.status === StatusPaciente.AGUARDANDO_TRANSPORTE)) {
            // If already set and clicked again, revert to Internado
            this.updateStatus(StatusPaciente.INTERNADO);
        } else {
            this.updateStatus(status);
        }
    }

    private updateStatus(status: StatusPaciente) {
        if (!this.leito.paciente) return;

        this.leito.paciente.status = status;
        // If switching to Regulado, ensure we keep the unit if it exists, or init empty
        if (status !== StatusPaciente.REGULADO) {
            // Optional: clear unidadeDestino if not regulado? 
            // Ideally keep it in case they toggle back by mistake, but for clean data maybe clear.
            // Let's keep it for now.
        }

        this.emitChange();
    }

    /**
     * Retorna a classe CSS baseada no status
     */
    getStatusClass(): string {
        if (!this.leito.paciente) return '';

        switch (this.leito.paciente.status) {
            case StatusPaciente.REGULADO:
                return 'status-regulado';
            case StatusPaciente.AGUARDANDO_TRANSPORTE:
                return 'status-transporte';
            case StatusPaciente.ALTA:
                return 'status-alta';
            default:
                return '';
        }
    }

    get StatusPaciente() {
        return StatusPaciente;
    }

    onDeleteLeito(): void {
        this.deleteLeito.emit(this.leito.id);
    }

    startEditingBedNumber(): void {
        this.editingBedNumber = true;
        this.tempBedNumber = this.leito.numero;
    }

    saveBedNumber(): void {
        if (this.tempBedNumber > 0 && this.tempBedNumber !== this.leito.numero) {
            this.updateBedNumber.emit({ leitoId: this.leito.id, newNumero: this.tempBedNumber });
        }
        this.editingBedNumber = false;
    }

    cancelEditingBedNumber(): void {
        this.editingBedNumber = false;
        this.tempBedNumber = this.leito.numero;
    }
}
