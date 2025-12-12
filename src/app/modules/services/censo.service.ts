import { Injectable, inject, signal } from '@angular/core';
import { Firestore, collection, doc, setDoc, deleteDoc, updateDoc, query, onSnapshot, deleteField, runTransaction, addDoc } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Leito, SecaoCenso, SetorEnum, Paciente } from '../interfaces/censo.models';
import { DashboardService } from './dashboard.service';
import { PendenciasService } from './pendencias.service';

@Injectable({
    providedIn: 'root'
})
export class CensoService {
    // Signals state
    private _leitos = signal<Leito[]>([]);

    // Public read-only signal
    readonly leitos = this._leitos.asReadonly();

    private auth = inject(Auth);
    private firestore = inject(Firestore);
    private dashboardService = inject(DashboardService);
    private pendenciasService = inject(PendenciasService);

    constructor() {
        this.initLeitosListener();
    }

    private initLeitosListener() {
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                const leitosCollection = collection(this.firestore, 'leitos');
                const q = query(leitosCollection);

                onSnapshot(q, async (snapshot) => {
                    console.log('🔵 CensoService: Firestore snapshot received, docs count:', snapshot.docs.length);

                    // Check for seeding on first load if empty
                    if (snapshot.empty) {
                        console.log('Collection leitos is empty. Seeding initial beds...');
                        await this.seedInitialLeitos();
                        return;
                    }

                    const leitos = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            paciente: data['paciente'] || null
                        } as unknown as Leito;
                    });

                    // Sort by sector and number
                    leitos.sort((a, b) => {
                        if (a.setor !== b.setor) return a.setor.localeCompare(b.setor);
                        return a.numero - b.numero;
                    });

                    // Use truthy check to handle both null and undefined (from deleteField)
                    const occupiedCount = leitos.filter(l => !!l.paciente).length;
                    console.log('🔵 CensoService: Setting leitos signal. Total:', leitos.length, 'Occupied:', occupiedCount);
                    this._leitos.set(leitos);
                    console.log('🔵 CensoService: Signal updated successfully');
                }, (error) => {
                    console.error('Error in CensoService listener:', error);
                });
            } else {
                this._leitos.set([]);
            }
        });
    }

    private async seedInitialLeitos() {
        // Seed initial beds for each sector
        const initialBeds: Leito[] = [
            // Sala Vermelha - 4 beds
            { id: 'sv-1', numero: 1, setor: SetorEnum.SALA_VERMELHA, paciente: null },
            { id: 'sv-2', numero: 2, setor: SetorEnum.SALA_VERMELHA, paciente: null },
            { id: 'sv-3', numero: 3, setor: SetorEnum.SALA_VERMELHA, paciente: null },
            { id: 'sv-4', numero: 4, setor: SetorEnum.SALA_VERMELHA, paciente: null },

            // Enfermaria Feminina - 3 beds
            { id: 'ef-1', numero: 1, setor: SetorEnum.ENFERMARIA_FEMININA, paciente: null },
            { id: 'ef-2', numero: 2, setor: SetorEnum.ENFERMARIA_FEMININA, paciente: null },
            { id: 'ef-3', numero: 3, setor: SetorEnum.ENFERMARIA_FEMININA, paciente: null },

            // Enfermaria Masculina - 3 beds
            { id: 'em-1', numero: 1, setor: SetorEnum.ENFERMARIA_MASCULINA, paciente: null },
            { id: 'em-2', numero: 2, setor: SetorEnum.ENFERMARIA_MASCULINA, paciente: null },
            { id: 'em-3', numero: 3, setor: SetorEnum.ENFERMARIA_MASCULINA, paciente: null },

            // Extras/Corredor - 2 beds
            { id: 'ec-1', numero: 1, setor: SetorEnum.EXTRAS_CORREDOR, paciente: null },
            { id: 'ec-2', numero: 2, setor: SetorEnum.EXTRAS_CORREDOR, paciente: null }
        ];

        // Add all beds to Firestore
        for (const bed of initialBeds) {
            const bedRef = doc(this.firestore, `leitos/${bed.id}`);
            await setDoc(bedRef, bed);
        }
    }

    getLeitos(): Leito[] {
        return this._leitos();
    }

    getSecoesCenso(): SecaoCenso[] {
        const leitos = this._leitos();

        return [
            {
                titulo: 'Sala Vermelha',
                setor: SetorEnum.SALA_VERMELHA,
                leitos: leitos.filter(l => l.setor === SetorEnum.SALA_VERMELHA),
                corHeader: '#fee2e2'
            },
            {
                titulo: 'Enfermaria Feminina',
                setor: SetorEnum.ENFERMARIA_FEMININA,
                leitos: leitos.filter(l => l.setor === SetorEnum.ENFERMARIA_FEMININA),
                corHeader: '#fce7f3'
            },
            {
                titulo: 'Enfermaria Masculina',
                setor: SetorEnum.ENFERMARIA_MASCULINA,
                leitos: leitos.filter(l => l.setor === SetorEnum.ENFERMARIA_MASCULINA),
                corHeader: '#dbeafe'
            },
            {
                titulo: 'Extras/Corredor',
                setor: SetorEnum.EXTRAS_CORREDOR,
                leitos: leitos.filter(l => l.setor === SetorEnum.EXTRAS_CORREDOR),
                corHeader: '#f3f4f6'
            }
        ];
    }

    async updatePaciente(leitoId: string, paciente: Paciente | null): Promise<void> {
        try {
            console.log(`CensoService: updatePaciente for ${leitoId}`, paciente);
            const leitoRef = doc(this.firestore, `leitos/${leitoId}`);
            await updateDoc(leitoRef, { paciente });
            console.log(`CensoService: updatePaciente success for ${leitoId}`);
        } catch (error) {
            console.error(`Error updating patient in bed ${leitoId}: `, error);
            throw error;
        }
    }

    async updateStatusPaciente(leitoId: string, status: any, destino?: string): Promise<void> {
        const leito = this.getLeito(leitoId);
        if (leito && leito.paciente) {
            const updatedPaciente = {
                ...leito.paciente,
                status: status,
                destino: destino
            };
            await this.updatePaciente(leitoId, updatedPaciente);
        }
    }

    async removePaciente(leitoId: string): Promise<void> {
        console.log('🟣 CensoService.removePaciente: Starting for bed', leitoId);
        try {
            const leitoRef = doc(this.firestore, `leitos/${leitoId}`);

            // Verify doc exists first
            const docSnap = await this.getLeito(leitoId);
            if (!docSnap) {
                console.error(`🔴 CensoService.removePaciente: Leito ${leitoId} not found in local state`);
                // Try to continue anyway in case local state is stale
            }

            console.log('🟣 CensoService.removePaciente: Deleting paciente field in Firestore');
            await updateDoc(leitoRef, {
                paciente: deleteField()
            });
            console.log('🟣 CensoService.removePaciente: Successfully deleted paciente field');
        } catch (error) {
            console.error('🔴 CensoService.removePaciente: Error:', error);
            throw error;
        }
    }

    async darAlta(leitoId: string, dataSaida?: Date): Promise<void> {
        console.log('🟢 CensoService.darAlta: Starting transactional discharge for bed', leitoId);

        const leitoRef = doc(this.firestore, `leitos/${leitoId}`);
        const historyCollectionRef = collection(this.firestore, 'historico_pacientes');

        try {
            await runTransaction(this.firestore, async (transaction) => {
                // 1. Read bed data inside transaction
                console.log('🔍 CensoService.darAlta: Reading bed document', leitoId);
                const leitoDoc = await transaction.get(leitoRef);

                if (!leitoDoc.exists()) {
                    console.error('🔴 CensoService.darAlta: Bed document does not exist!', leitoId);
                    throw new Error('Leito não encontrado.');
                }

                const leitoData = leitoDoc.data() as Leito;
                const paciente = leitoData.paciente;

                if (!paciente) {
                    console.warn('🟡 CensoService.darAlta: No patient found in bed (transaction)');
                    return; // Nothing to do
                }

                // Check if patient data is effectively empty
                const hasName = paciente.nome && paciente.nome.trim().length > 0;
                const hasDiagnosis = paciente.suspeitaDiagnostica && paciente.suspeitaDiagnostica.trim().length > 0;

                // If patient has no name and no diagnosis, consider it an "empty" patient and just delete
                // This prevents "ghost" records in history
                if (!hasName && !hasDiagnosis) {
                    console.log('🟡 CensoService.darAlta: Patient has no name/diagnosis. Skipping history, just clearing bed.');
                    transaction.update(leitoRef, { paciente: deleteField() });
                    return;
                }

                const isRegulado = paciente.status === 'Regulado';

                // 2. Prepare history data
                // Clone to avoid mutation issues
                const historyData = { ...paciente };

                if (isRegulado && historyData.unidadeDestino) {
                    historyData.destino = historyData.unidadeDestino;
                }

                const finalHistoryRecord = {
                    ...historyData,
                    tipoSaida: isRegulado ? 'Regulação' : 'Alta',
                    dataSaida: dataSaida || new Date()
                };

                // 3. Create reference for new history doc
                const newHistoryDocRef = doc(historyCollectionRef);

                // 4. Perform writes
                // Add to history
                transaction.set(newHistoryDocRef, finalHistoryRecord);

                // Clear bed using deleteField for cleaner database
                transaction.update(leitoRef, { paciente: deleteField() });
            });

            console.log('🟢 CensoService.darAlta: Transaction completed successfully.');

            // Post-transaction actions
            const leito = this.getLeito(leitoId);
            // Note: leito might still show patient if signal hasn't updated yet, 
            // but we can't rely on it for ID if we deleted it.
            // However, we cloned the data before.
            // We need to pass the ID if we want to remove pendencies.
            // But we can't access the cloned data from inside the transaction scope here easily 
            // unless we return it or use a variable.

            // Actually, we can just rely on the fact that we know the patient ID from the *current* state 
            // before the signal updates (which is async).
            if (leito && leito.paciente) {
                const pid = leito.paciente.id;
                const isReg = leito.paciente.status === 'Regulado';

                // Remove pendencies
                this.pendenciasService.removePendencia(pid).catch(err =>
                    console.warn('Error removing pendencies after discharge:', err)
                );

                // Update KPIs
                this.dashboardService.incrementKpi('exit_to_app');
                if (isReg) {
                    this.dashboardService.incrementKpi('local_hospital');
                } else {
                    this.dashboardService.incrementKpi('check_circle');
                }
            }

        } catch (error) {
            console.error('🔴 CensoService.darAlta: Transaction failed:', error);
            throw error;
        }
    }

    async saveToHistory(paciente: Paciente, tipoSaida: string, dataSaida?: Date): Promise<void> {
        try {
            const historyRef = collection(this.firestore, 'historico_pacientes');
            await addDoc(historyRef, {
                ...paciente,
                tipoSaida,
                dataSaida: dataSaida || new Date()
            });
            console.log('Patient history saved successfully');
        } catch (error) {
            console.error('Error saving patient history:', error);
            // Don't throw here to avoid blocking the discharge if history fails
        }
    }

    async movePaciente(originLeitoId: string, targetLeitoId: string): Promise<void> {
        console.log(`Attempting to move patient from ${originLeitoId} to ${targetLeitoId}`);
        const originRef = doc(this.firestore, `leitos/${originLeitoId}`);
        const targetRef = doc(this.firestore, `leitos/${targetLeitoId}`);

        try {
            await runTransaction(this.firestore, async (transaction) => {
                const originDoc = await transaction.get(originRef);
                const targetDoc = await transaction.get(targetRef);

                if (!originDoc.exists()) {
                    throw new Error(`Leito de origem ${originLeitoId} não encontrado.`);
                }
                if (!targetDoc.exists()) {
                    throw new Error(`Leito de destino ${targetLeitoId} não encontrado.`);
                }

                const originData = originDoc.data() as Leito;
                const targetData = targetDoc.data() as Leito;

                const originPaciente = originData.paciente;
                const targetPaciente = targetData.paciente;

                if (!originPaciente) {
                    throw new Error(`Leito de origem ${originLeitoId} não possui paciente para mover.`);
                }

                console.log('Moving patient:', originPaciente.nome);

                // 1. Set target bed with origin patient
                transaction.update(targetRef, { paciente: originPaciente });

                // 2. Handle origin bed
                if (targetPaciente) {
                    // Swap: Put target patient in origin bed
                    console.log('Swapping with patient:', targetPaciente.nome);
                    transaction.update(originRef, { paciente: targetPaciente });
                } else {
                    // Move: Clear origin bed
                    console.log('Clearing origin bed');
                    transaction.update(originRef, { paciente: null });
                }
            });
            console.log(`Successfully moved patient from ${originLeitoId} to ${targetLeitoId}`);
        } catch (error) {
            console.error('Error executing move transaction:', error);
            throw error;
        }
    }

    async addLeito(setor: SetorEnum): Promise<void> {
        try {
            const currentLeitos = this._leitos();
            const leitosDoSetor = currentLeitos.filter(l => l.setor === setor);
            const nextNumero = leitosDoSetor.length > 0
                ? Math.max(...leitosDoSetor.map(l => l.numero)) + 1
                : 1;

            const newLeito: Leito = {
                id: `l-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                numero: nextNumero,
                setor: setor,
                paciente: null
            };

            console.log('Adding new leito:', newLeito);
            const leitoRef = doc(this.firestore, `leitos/${newLeito.id}`);
            await setDoc(leitoRef, newLeito);
            console.log('Leito added successfully');
        } catch (error) {
            console.error('Error adding leito:', error);
            throw error;
        }
    }

    async deleteLeito(leitoId: string): Promise<void> {
        console.log(`Attempting to delete leito: ${leitoId}`);
        try {
            const leitoRef = doc(this.firestore, `leitos/${leitoId}`);
            await deleteDoc(leitoRef);
            console.log(`Leito ${leitoId} deleted successfully`);
        } catch (error) {
            console.error(`Error deleting leito ${leitoId}: `, error);
            throw error;
        }
    }

    async updateLeitoNumero(leitoId: string, newNumero: number): Promise<void> {
        console.log(`Updating bed ${leitoId} number to ${newNumero}`);
        try {
            const leitoRef = doc(this.firestore, `leitos/${leitoId}`);
            await updateDoc(leitoRef, { numero: newNumero });
            console.log(`Bed number updated successfully`);
        } catch (error) {
            console.error(`Error updating bed number: `, error);
            throw error;
        }
    }

    getLeito(leitoId: string): Leito | undefined {
        return this._leitos().find(l => l.id === leitoId);
    }
}
