import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Firestore, collection, doc, setDoc, deleteDoc, query, onSnapshot } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { PendenciaItem } from '../interfaces/censo.models';

@Injectable({
    providedIn: 'root'
})
export class PendenciasService {
    private pendenciasSubject = new BehaviorSubject<PendenciaItem[]>([]);

    pendencias$: Observable<PendenciaItem[]> = this.pendenciasSubject.asObservable();

    private auth = inject(Auth);


    constructor(private firestore: Firestore) {
        this.initPendenciasListener();
    }

    /**
     * Initialize real-time listener for pendencias from Firestore
     */
    private initPendenciasListener() {
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                const pendenciasCollection = collection(this.firestore, 'pendencias');
                const q = query(pendenciasCollection);

                onSnapshot(q, (snapshot) => {
                    const pendencias = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            timestamp: data['timestamp']?.toDate ? data['timestamp'].toDate() : new Date(data['timestamp'])
                        } as unknown as PendenciaItem;
                    });
                    this.pendenciasSubject.next(pendencias);
                }, (error) => {
                    console.error('Error in PendenciasService listener:', error);
                });
            } else {
                this.pendenciasSubject.next([]);
            }
        });
    }

    /**
     * Atualiza ou adiciona uma pendência para um paciente
     */
    async updatePendencia(pacienteId: string, pacienteNome: string, leitoNumero: number, texto: string): Promise<void> {
        if (texto.trim()) {
            // Se o texto não estiver vazio, adiciona/atualiza pendência
            const pendencia: PendenciaItem = {
                pacienteId,
                pacienteNome,
                leitoNumero,
                texto: texto.trim(),
                timestamp: new Date()
            };

            // Use pacienteId as document ID for easy updates
            const pendenciaRef = doc(this.firestore, `pendencias/${pacienteId}`);
            await setDoc(pendenciaRef, pendencia);
        } else {
            // Se vazio, remove a pendência
            await this.removePendencia(pacienteId);
        }
    }

    /**
     * Remove uma pendência específica
     */
    async removePendencia(pacienteId: string): Promise<void> {
        const pendenciaRef = doc(this.firestore, `pendencias/${pacienteId}`);
        await deleteDoc(pendenciaRef);
    }

    /**
     * Retorna pendências de um paciente específico
     */
    getPendenciasByPaciente(pacienteId: string): PendenciaItem | undefined {
        return this.pendenciasSubject.value.find(p => p.pacienteId === pacienteId);
    }

    /**
     * Retorna todas as pendências
     */
    getAllPendencias(): PendenciaItem[] {
        return this.pendenciasSubject.value;
    }

    /**
     * Limpa todas as pendências (admin function)
     */
    async clearAll(): Promise<void> {
        // This would require batch delete
        // For now, just clear local state and warn
        console.warn('Clear all pendencias should be implemented with Firestore batch delete');
    }
}
