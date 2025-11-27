import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Firestore, collection, doc, setDoc, deleteDoc, updateDoc, getDocs, query, onSnapshot } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Leito, SecaoCenso, SetorEnum, Paciente } from '../interfaces/censo.models';

@Injectable({
    providedIn: 'root'
})
export class CensoService {
    private leitosSubject = new BehaviorSubject<Leito[]>([]);
    leitos$: Observable<Leito[]> = this.leitosSubject.asObservable();

    private auth = inject(Auth);


    constructor(private firestore: Firestore) {
        this.initLeitosListener();
    }

    private initLeitosListener() {
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                const leitosCollection = collection(this.firestore, 'leitos');
                const q = query(leitosCollection);

                onSnapshot(q, async (snapshot) => {
                    // Check for seeding on first load if empty
                    if (snapshot.empty) {
                        console.log('Collection leitos is empty. Seeding initial beds...');
                        // We can call seed here, but be careful of infinite loops if seed fails.
                        // Since this is a real-time listener, it will fire again after seeding.
                        await this.seedInitialLeitos();
                        return;
                    }

                    const leitos = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data
                        } as unknown as Leito;
                    });

                    // Sort by sector and number if needed, or just emit
                    // Let's sort to ensure consistent order
                    leitos.sort((a, b) => {
                        if (a.setor !== b.setor) return a.setor.localeCompare(b.setor);
                        return a.numero - b.numero;
                    });

                    console.log('CensoService received leitos:', leitos);
                    this.leitosSubject.next(leitos);
                }, (error) => {
                    console.error('Error in CensoService listener:', error);
                });
            } else {
                this.leitosSubject.next([]);
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
        return this.leitosSubject.value;
    }

    getSecoesCenso(): SecaoCenso[] {
        const leitos = this.leitosSubject.value;

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
            const leitoRef = doc(this.firestore, `leitos/${leitoId}`);
            await updateDoc(leitoRef, { paciente });
        } catch (error) {
            console.error(`Error updating patient in bed ${leitoId}:`, error);
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
        await this.updatePaciente(leitoId, null);
    }

    async addLeito(setor: SetorEnum): Promise<void> {
        const currentLeitos = this.leitosSubject.value;
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

        const leitoRef = doc(this.firestore, `leitos/${newLeito.id}`);
        await setDoc(leitoRef, newLeito);
    }

    async deleteLeito(leitoId: string): Promise<void> {
        const leitoRef = doc(this.firestore, `leitos/${leitoId}`);
        await deleteDoc(leitoRef);
    }

    getLeito(leitoId: string): Leito | undefined {
        return this.leitosSubject.value.find(l => l.id === leitoId);
    }
}
