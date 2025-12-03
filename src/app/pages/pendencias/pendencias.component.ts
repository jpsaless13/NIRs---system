import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PendenciasService } from '../../modules/services/pendencias.service';
import { CensoService } from '../../modules/services/censo.service';
import { AuthService } from '../../modules/services/auth.service';
import { PendenciaGeral, PendenciaPaciente, Leito } from '../../modules/interfaces/censo.models';

@Component({
    selector: 'app-pendencias',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './pendencias.component.html',
    styleUrl: './pendencias.component.scss'
})
export class PendenciasComponent {
    private pendenciasService = inject(PendenciasService);
    private censoService = inject(CensoService);
    private authService = inject(AuthService);

    // Signals
    pendenciasPacientes = this.pendenciasService.pendenciasPacientes;
    pendenciasGerais = this.pendenciasService.pendenciasGerais;
    leitos = this.censoService.leitos; // To get available patients

    // Form state for general pendencias
    showAddGeralForm = false;
    editingGeralId: string | null = null;
    geralForm = {
        titulo: '',
        descricao: '',
        prioridade: 'media' as 'baixa' | 'media' | 'alta',
        destinatarioCargo: 'Geral'
    };

    // Form state for patient pendencias
    showAddPacienteForm = false;
    pacienteForm = {
        pacienteId: '',
        texto: '',
        destinatarioCargo: 'Geral'
    };

    availableRoles = ['Geral', 'Médico', 'Enfermeiro', 'Fisioterapeuta', 'Assistente Social', 'Recepcionista', 'Administrativo'];

    getPendenciasPacientesCount(): number {
        return this.pendenciasPacientes().filter(p => p.status === 'pendente').length;
    }

    getPendenciasGeraisCount(): number {
        return this.pendenciasGerais().filter(p => p.status === 'pendente').length;
    }

    formatTime(date: Date): string {
        return new Date(date).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDate(date: Date): string {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit'
        });
    }

    // ============================================
    // GENERAL PENDENCIAS METHODS
    // ============================================

    openAddGeralForm(): void {
        this.showAddGeralForm = true;
        this.editingGeralId = null;
        this.resetGeralForm();
    }

    openEditGeralForm(pendencia: PendenciaGeral): void {
        if (!pendencia.id) return;
        this.showAddGeralForm = true;
        this.editingGeralId = pendencia.id;
        this.geralForm = {
            titulo: pendencia.titulo,
            descricao: pendencia.descricao,
            prioridade: pendencia.prioridade,
            destinatarioCargo: pendencia.destinatarioCargo || 'Geral'
        };
    }

    cancelGeralForm(): void {
        this.showAddGeralForm = false;
        this.editingGeralId = null;
        this.resetGeralForm();
    }

    resetGeralForm(): void {
        this.geralForm = {
            titulo: '',
            descricao: '',
            prioridade: 'media',
            destinatarioCargo: 'Geral'
        };
    }

    async saveGeralPendencia(): Promise<void> {
        if (!this.geralForm.titulo.trim() || !this.geralForm.descricao.trim()) {
            alert('Por favor, preencha todos os campos');
            return;
        }

        try {
            if (this.editingGeralId) {
                // Update existing
                await this.pendenciasService.updatePendenciaGeral(this.editingGeralId, {
                    titulo: this.geralForm.titulo,
                    descricao: this.geralForm.descricao,
                    prioridade: this.geralForm.prioridade,
                    destinatarioCargo: this.geralForm.destinatarioCargo
                });
            } else {
                // Create new
                await this.pendenciasService.addPendenciaGeral({
                    titulo: this.geralForm.titulo,
                    descricao: this.geralForm.descricao,
                    prioridade: this.geralForm.prioridade,
                    status: 'pendente',
                    destinatarioCargo: this.geralForm.destinatarioCargo,
                    criadoPor: this.authService.getCurrentUser()?.displayName || 'Desconhecido'
                });
            }
            this.cancelGeralForm();
        } catch (error) {
            console.error('Error saving general pendencia:', error);
            alert('Erro ao salvar pendência.');
        }
    }

    async toggleGeralConcluida(pendencia: PendenciaGeral): Promise<void> {
        if (!pendencia.id) return;

        try {
            const newStatus = pendencia.status === 'pendente' ? 'concluida' : 'pendente';
            await this.pendenciasService.updatePendenciaGeral(pendencia.id, { status: newStatus });
        } catch (error) {
            console.error('Error toggling general pendencia:', error);
            alert('Erro ao atualizar pendência.');
        }
    }

    async deleteGeralPendencia(id: string): Promise<void> {
        if (confirm('Deseja realmente excluir esta pendência?')) {
            try {
                await this.pendenciasService.deletePendenciaGeral(id);
            } catch (error) {
                console.error('Error deleting general pendencia:', error);
                alert('Erro ao excluir pendência.');
            }
        }
    }

    // ============================================
    // PATIENT PENDENCIAS METHODS
    // ============================================

    openAddPacienteForm(): void {
        this.showAddPacienteForm = true;
        this.resetPacienteForm();
    }

    cancelPacienteForm(): void {
        this.showAddPacienteForm = false;
        this.resetPacienteForm();
    }

    resetPacienteForm(): void {
        this.pacienteForm = {
            pacienteId: '',
            texto: '',
            destinatarioCargo: 'Geral'
        };
    }

    getOccupiedLeitos(): Leito[] {
        return this.leitos().filter(l => l.paciente !== null);
    }

    async savePacientePendencia(): Promise<void> {
        if (!this.pacienteForm.pacienteId || !this.pacienteForm.texto.trim()) {
            alert('Por favor, selecione um paciente e descreva a pendência.');
            return;
        }

        const leito = this.leitos().find(l => l.paciente?.id === this.pacienteForm.pacienteId);
        if (!leito || !leito.paciente) return;

        try {
            await this.pendenciasService.addPendenciaPaciente({
                pacienteId: leito.paciente.id,
                pacienteNome: leito.paciente.nome,
                leitoNumero: leito.numero,
                texto: this.pacienteForm.texto,
                destinatarioCargo: this.pacienteForm.destinatarioCargo,
                criadoPor: this.authService.getCurrentUser()?.displayName || 'Desconhecido'
            });
            this.cancelPacienteForm();
        } catch (error) {
            console.error('Error saving patient pendencia:', error);
            alert('Erro ao salvar pendência.');
        }
    }

    async togglePacienteConcluida(pendencia: PendenciaPaciente): Promise<void> {
        try {
            const newStatus = pendencia.status === 'pendente' ? 'concluida' : 'pendente';
            await this.pendenciasService.updatePendenciaGeral(pendencia.pacienteId, { status: newStatus });

            // Also update the patient record if needed
            if (newStatus === 'concluida') {
                const leitos = this.censoService.leitos();
                const leito = leitos.find((l: Leito) => l.paciente?.id === pendencia.pacienteId);
                if (leito && leito.paciente) {
                    const updatedPaciente = { ...leito.paciente, pendencias: '' };
                    await this.censoService.updatePaciente(leito.id, updatedPaciente);
                }
            }
        } catch (error) {
            console.error('Error toggling patient pendencia:', error);
            alert('Erro ao atualizar pendência.');
        }
    }

    async deletePacientePendencia(pacienteId: string): Promise<void> {
        if (confirm('Deseja realmente excluir esta pendência?')) {
            try {
                await this.pendenciasService.removePendenciaPaciente(pacienteId);

                // Clear from patient record
                const leitos = this.censoService.leitos();
                const leito = leitos.find((l: Leito) => l.paciente?.id === pacienteId);
                if (leito && leito.paciente) {
                    const updatedPaciente = { ...leito.paciente, pendencias: '' };
                    await this.censoService.updatePaciente(leito.id, updatedPaciente);
                }
            } catch (error) {
                console.error('Error deleting patient pendencia:', error);
                alert('Erro ao excluir pendência.');
            }
        }
    }

    getPrioridadeClass(prioridade: 'baixa' | 'media' | 'alta'): string {
        return `prioridade-${prioridade}`;
    }

    getPrioridadeIcon(prioridade: 'baixa' | 'media' | 'alta'): string {
        const icons = {
            'baixa': 'flag',
            'media': 'flag',
            'alta': 'priority_high'
        };
        return icons[prioridade];
    }
}
