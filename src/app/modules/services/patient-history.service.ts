import { Injectable, inject, signal } from '@angular/core';
import { Firestore, collection, query, orderBy, onSnapshot, limit, doc, deleteDoc, updateDoc } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Paciente } from '../interfaces/censo.models';

export interface HistoricoPaciente extends Paciente {
    tipoSaida: string;
    dataSaida: any; // Timestamp or Date
    originalId?: string;
}

@Injectable({
    providedIn: 'root'
})
export class PatientHistoryService {
    private firestore = inject(Firestore);
    private auth = inject(Auth);

    // Private signal
    private _history = signal<HistoricoPaciente[]>([]);

    // Public read-only signal
    readonly history = this._history.asReadonly();

    constructor() {
        this.initHistoryListener();
    }

    private initHistoryListener() {
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                const historyRef = collection(this.firestore, 'historico_pacientes');
                // Limit to 50 to avoid quota exhaustion
                const q = query(historyRef, orderBy('dataSaida', 'desc'), limit(50));

                onSnapshot(q, (snapshot) => {
                    const history = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            ...data,
                            id: doc.id, // Use document ID for operations
                            originalId: data['id'], // Preserve original ID
                            // Ensure dates are handled correctly
                            dataSaida: data['dataSaida']?.toDate ? data['dataSaida'].toDate() : new Date(data['dataSaida']),
                            dataAdmissao: data['dataAdmissao']?.toDate ? data['dataAdmissao'].toDate() : data['dataAdmissao']
                        } as unknown as HistoricoPaciente;
                    });
                    console.log('📜 PatientHistoryService: Updated history signal with', history.length, 'records');
                    this._history.set(history);
                }, (error) => {
                    console.error('Error in PatientHistoryService listener:', error);
                });
            } else {
                this._history.set([]);
            }
        });
    }

    // Legacy method support if needed, but prefer using the signal
    getHistory() {
        return this._history();
    }

    async deleteHistory(id: string): Promise<void> {
        console.log(`[PatientHistoryService] Attempting to delete history record: ${id}`);
        try {
            const docRef = doc(this.firestore, 'historico_pacientes', id);
            await deleteDoc(docRef);
            console.log(`[PatientHistoryService] History record ${id} deleted successfully from Firestore`);
        } catch (error) {
            console.error(`[PatientHistoryService] Error deleting history record ${id}:`, error);
            throw error;
        }
    }

    async updateHistory(id: string, data: Partial<HistoricoPaciente>): Promise<void> {
        try {
            const docRef = doc(this.firestore, 'historico_pacientes', id);
            await updateDoc(docRef, data);
            console.log(`History record ${id} updated successfully`);
        } catch (error) {
            console.error(`Error updating history record ${id}:`, error);
            throw error;
        }
    }
}
