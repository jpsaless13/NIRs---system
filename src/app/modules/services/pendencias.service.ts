import { Injectable, inject, signal } from '@angular/core';
import { Firestore, collection, doc, setDoc, deleteDoc, updateDoc, query, onSnapshot, deleteField, runTransaction, addDoc } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { PendenciaGeral, PendenciaPaciente, PendenciaItem } from '../interfaces/censo.models';

@Injectable({
    providedIn: 'root'
})
export class PendenciasService {
    // Signals state for pacientes (backwards compatible)
    private _pendenciasPacientes = signal<PendenciaPaciente[]>([]);

    // Signals state for general pendencias
    private _pendenciasGerais = signal<PendenciaGeral[]>([]);

    // Public read-only signals
    readonly pendenciasPacientes = this._pendenciasPacientes.asReadonly();
    readonly pendenciasGerais = this._pendenciasGerais.asReadonly();

    // Backwards compatibility
    readonly pendencias = this._pendenciasPacientes.asReadonly();

    private auth = inject(Auth);
    private firestore = inject(Firestore);

    constructor() {
        this.initPendenciasListeners();
    }

    /**
     * Initialize real-time listeners for both types of pendencias
     */
    private initPendenciasListeners() {
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                // Listen to patient pendencias
                const pendenciasPacientesCol = collection(this.firestore, 'pendencias-pacientes');
                const qPacientes = query(pendenciasPacientesCol);

                onSnapshot(qPacientes, (snapshot) => {
                    const pendencias = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            status: data['status'] || 'pendente',
                            timestamp: data['timestamp']?.toDate ? data['timestamp'].toDate() : new Date(data['timestamp'])
                        } as unknown as PendenciaPaciente;
                    });
                    this._pendenciasPacientes.set(pendencias);
                }, (error) => {
                    console.error('Error in PendenciasService patient listener:', error);
                });

                // Listen to general pendencias
                const pendenciasGeraisCol = collection(this.firestore, 'pendencias-gerais');
                const qGerais = query(pendenciasGeraisCol);

                onSnapshot(qGerais, (snapshot) => {
                    const pendencias = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            timestamp: data['timestamp']?.toDate ? data['timestamp'].toDate() : new Date(data['timestamp'])
                        } as unknown as PendenciaGeral;
                    });
                    this._pendenciasGerais.set(pendencias);
                }, (error) => {
                    console.error('Error in PendenciasService general listener:', error);
                });
            } else {
                this._pendenciasPacientes.set([]);
                this._pendenciasGerais.set([]);
            }
        });
    }

    // ============================================
    // PATIENT PENDENCIAS METHODS
    // ============================================

    /**
     * Atualiza ou adiciona uma pendência para um paciente
     */
    /**
     * Adiciona uma nova pendência estruturada para um paciente
     */
    async addPendenciaPaciente(pendencia: Omit<PendenciaPaciente, 'id' | 'timestamp' | 'status'>): Promise<void> {
        const id = `pendencia-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const novaPendencia: PendenciaPaciente = {
            ...pendencia,
            id,
            status: 'pendente',
            timestamp: new Date()
        };

        const pendenciaRef = doc(this.firestore, `pendencias-pacientes/${id}`);
        await setDoc(pendenciaRef, novaPendencia);
    }

    /**
     * Atualiza ou adiciona uma pendência para um paciente (Legacy/Observações)
     * Mantendo para compatibilidade com o campo de texto antigo, agora tratado como observação simples
     */
    async updatePendenciaPaciente(pacienteId: string, pacienteNome: string, leitoNumero: number, texto: string): Promise<void> {
        // This method was originally overwriting a single doc per patient. 
        // We will keep it for the "Observações" field which behaves like a single text block.
        // However, the previous implementation was using `pendencias-pacientes/${pacienteId}`.
        // To avoid conflict with the new individual pendencies (which use random IDs), 
        // we should keep using the patientID for this specific "summary" doc if we want to preserve it,
        // OR we migrate it. 
        // Given the requirement to rename to "Observações", let's keep this as the "Main Observation" 
        // stored in a specific doc or just update the patient record itself (which is already done in CensoService).
        // 
        // Wait, CensoService updates the patient object. This service was mirroring it to a collection?
        // The previous code: `setDoc(doc(..., pacienteId), ...)`
        // This means there was ONE doc per patient in `pendencias-pacientes`.
        // The new `addPendenciaPaciente` creates NEW docs with random IDs.
        // So they can coexist in the same collection if the IDs don't collide.
        // `pacienteId` (e.g., 'p-sv-1-...') vs `pendencia-...`
        // They won't collide.

        if (texto.trim()) {
            const pendencia: PendenciaPaciente = {
                pacienteId,
                pacienteNome,
                leitoNumero,
                texto: texto.trim(),
                status: 'pendente',
                timestamp: new Date(),
                destinatarioCargo: 'Geral' // Mark legacy/observation as General
            };

            const pendenciaRef = doc(this.firestore, `pendencias-pacientes/${pacienteId}`);
            await setDoc(pendenciaRef, pendencia);
        } else {
            await this.removePendenciaPaciente(pacienteId);
        }
    }

    /**
     * Backwards compatibility wrapper
     */
    async updatePendencia(pacienteId: string, pacienteNome: string, leitoNumero: number, texto: string): Promise<void> {
        return this.updatePendenciaPaciente(pacienteId, pacienteNome, leitoNumero, texto);
    }

    /**
     * Marca uma pendência de paciente como concluída
     */
    async marcarPendenciaPacienteConcluida(pacienteId: string): Promise<void> {
        const pendenciaRef = doc(this.firestore, `pendencias-pacientes/${pacienteId}`);
        await updateDoc(pendenciaRef, { status: 'concluida' });
    }

    /**
     * Remove uma pendência de paciente
     */
    async removePendenciaPaciente(pacienteId: string): Promise<void> {
        const pendenciaRef = doc(this.firestore, `pendencias-pacientes/${pacienteId}`);
        await deleteDoc(pendenciaRef);
    }

    /**
     * Backwards compatibility wrapper
     */
    async removePendencia(pacienteId: string): Promise<void> {
        return this.removePendenciaPaciente(pacienteId);
    }

    /**
     * Retorna pendências de um paciente específico
     */
    getPendenciasByPaciente(pacienteId: string): PendenciaPaciente | undefined {
        return this._pendenciasPacientes().find(p => p.pacienteId === pacienteId);
    }

    /**
     * Retorna todas as pendências de pacientes
     */
    getAllPendenciasPacientes(): PendenciaPaciente[] {
        return this._pendenciasPacientes();
    }

    /**
     * Retorna pendências filtradas por cargo
     */
    getPendenciasForRole(role: string): { pacientes: PendenciaPaciente[], gerais: PendenciaGeral[] } {
        const normalizedRole = role.toLowerCase();

        const pacientes = this.pendenciasPacientes().filter(p => {
            if (p.status === 'concluida') return false;
            if (!p.destinatarioCargo || p.destinatarioCargo === 'Geral' || p.destinatarioCargo === 'Todos') return true;
            return p.destinatarioCargo.toLowerCase() === normalizedRole;
        });

        const gerais = this.pendenciasGerais().filter(p => {
            if (p.status === 'concluida') return false;
            if (!p.destinatarioCargo || p.destinatarioCargo === 'Geral' || p.destinatarioCargo === 'Todos') return true;
            return p.destinatarioCargo.toLowerCase() === normalizedRole;
        });

        return { pacientes, gerais };
    }

    /**
     * Backwards compatibility
     */
    getAllPendencias(): PendenciaItem[] {
        return this.getAllPendenciasPacientes();
    }

    // ============================================
    // GENERAL PENDENCIAS METHODS
    // ============================================

    /**
     * Adiciona uma nova pendência geral
     */
    async addPendenciaGeral(pendencia: Omit<PendenciaGeral, 'id' | 'timestamp'>): Promise<void> {
        try {
            const pendenciasRef = collection(this.firestore, 'pendencias-gerais');
            await addDoc(pendenciasRef, {
                ...pendencia,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error adding general pendencia:', error);
            throw error;
        }
    }

    /**
     * Atualiza uma pendência geral
     */
    async updatePendenciaGeral(id: string, updates: Partial<PendenciaGeral>): Promise<void> {
        const pendenciaRef = doc(this.firestore, `pendencias-gerais/${id}`);
        await updateDoc(pendenciaRef, updates);
    }

    /**
     * Marca uma pendência geral como concluída
     */
    async marcarPendenciaGeralConcluida(id: string): Promise<void> {
        await this.updatePendenciaGeral(id, { status: 'concluida' });
    }

    /**
     * Remove uma pendência geral
     */
    async deletePendenciaGeral(id: string): Promise<void> {
        const pendenciaRef = doc(this.firestore, `pendencias-gerais/${id}`);
        await deleteDoc(pendenciaRef);
    }

    /**
     * Retorna todas as pendências gerais
     */
    getAllPendenciasGerais(): PendenciaGeral[] {
        return this._pendenciasGerais();
    }

    // ============================================
    // UNIFIED METHODS
    // ============================================

    /**
     * Marca uma pendência como concluída (qualquer tipo)
     */
    async marcarConcluida(id: string, tipo: 'geral' | 'paciente'): Promise<void> {
        if (tipo === 'geral') {
            await this.marcarPendenciaGeralConcluida(id);
        } else {
            await this.marcarPendenciaPacienteConcluida(id);
        }
    }

    /**
     * Deleta uma pendência (qualquer tipo)
     */
    async deletePendencia(id: string, tipo: 'geral' | 'paciente'): Promise<void> {
        if (tipo === 'geral') {
            await this.deletePendenciaGeral(id);
        } else {
            await this.removePendenciaPaciente(id);
        }
    }
}
