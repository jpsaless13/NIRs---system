import { Injectable, inject, signal, computed, WritableSignal } from '@angular/core';
import { Firestore, collection, doc, setDoc, deleteDoc, updateDoc, query, onSnapshot, increment } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Aviso, Kpi } from '../interfaces/dashboard.models';

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    // Signals state
    private _avisos = signal<Aviso[]>([]);
    private _kpis = signal<Kpi[]>([]);

    // Public read-only signals
    readonly avisos = this._avisos.asReadonly();
    readonly kpis = this._kpis.asReadonly();

    private auth = inject(Auth);
    private firestore = inject(Firestore);

    constructor() {
        this.initListeners();
    }

    private initListeners() {
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                // Handle Avisos
                const avisosCollection = collection(this.firestore, 'avisos');
                const avisosQuery = query(avisosCollection);

                onSnapshot(avisosQuery, (snapshot) => {
                    const avisos = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            data: data['data']?.toDate ? data['data'].toDate() : new Date(data['data'])
                        } as unknown as Aviso;
                    });
                    avisos.sort((a, b) => b.data.getTime() - a.data.getTime());
                    this._avisos.set(avisos);
                }, (error) => {
                    console.error('Error in DashboardService avisos listener:', error);
                });

                // Handle KPIs
                const kpisCollection = collection(this.firestore, 'kpis');
                const kpisQuery = query(kpisCollection);

                onSnapshot(kpisQuery, (snapshot) => {
                    const kpis = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as unknown as Kpi[];

                    if (kpis.length === 0) {
                        this.seedInitialKpis();
                    }
                    this._kpis.set(kpis);
                }, (error) => {
                    console.error('Error in DashboardService kpis listener:', error);
                });

            } else {
                this._avisos.set([]);
                this._kpis.set([]);
            }
        });
    }

    private async seedInitialKpis() {
        const initialKpis: Kpi[] = [
            { titulo: 'Regulações', valor: 0, cor: 'blue', name: 'outpatient' },
            { titulo: 'Saídas (Total)', valor: 0, cor: 'green', name: 'exit_to_app' },
            { titulo: 'Saídas Regulação', valor: 0, cor: 'blue', name: 'local_hospital' },
            { titulo: 'Aguard. Transporte', valor: 0, cor: 'orange', name: 'ambulance' },
            { titulo: 'Pendências', valor: 0, cor: 'red', name: 'person_alert' },
            { titulo: 'Altas', valor: 0, cor: 'green', name: 'check_circle' } // New KPI
        ];

        for (const kpi of initialKpis) {
            // Use name as ID for easier updates
            const kpiRef = doc(this.firestore, `kpis/${kpi.name}`);
            await setDoc(kpiRef, kpi);
        }
    }

    async addAviso(aviso: Omit<Aviso, 'id' | 'data'>): Promise<void> {
        const newAviso = {
            ...aviso,
            data: new Date()
        };
        const id = `aviso-${Date.now()}`;
        const avisoRef = doc(this.firestore, `avisos/${id}`);
        await setDoc(avisoRef, newAviso);
    }

    async deleteAviso(id: string): Promise<void> {
        const avisoRef = doc(this.firestore, `avisos/${id}`);
        await deleteDoc(avisoRef);
    }

    async updateKpi(name: string, newValue: string | number): Promise<void> {
        const kpiRef = doc(this.firestore, `kpis/${name}`);
        await updateDoc(kpiRef, { valor: newValue });
    }

    async incrementKpi(name: string): Promise<void> {
        const kpiRef = doc(this.firestore, `kpis/${name}`);
        // Check if document exists first, if not create it (safe guard for new KPIs)
        // For now, assuming seed handles it or updateDoc fails if not exists? 
        // updateDoc fails if doc doesn't exist. setDoc with merge is safer if we are unsure.
        // But we have seed logic. Let's stick to updateDoc but maybe catch error and seed if needed?
        // Simpler: just use setDoc with merge: true which creates if not exists
        await setDoc(kpiRef, { valor: increment(1) }, { merge: true });
    }
}
