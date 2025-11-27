import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Firestore, collection, doc, setDoc, deleteDoc, updateDoc, query, onSnapshot } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Aviso, Kpi } from '../interfaces/dashboard.models';

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private avisosSubject = new BehaviorSubject<Aviso[]>([]);
    private kpisSubject = new BehaviorSubject<Kpi[]>([]);

    avisos$: Observable<Aviso[]> = this.avisosSubject.asObservable();
    kpis$: Observable<Kpi[]> = this.kpisSubject.asObservable();

    private auth = inject(Auth);


    constructor(private firestore: Firestore) {
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
                    this.avisosSubject.next(avisos);
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
                    this.kpisSubject.next(kpis);
                }, (error) => {
                    console.error('Error in DashboardService kpis listener:', error);
                });

            } else {
                this.avisosSubject.next([]);
                this.kpisSubject.next([]);
            }
        });
    }

    private async seedInitialKpis() {
        const initialKpis: Kpi[] = [
            { titulo: 'Regulações', valor: 0, cor: 'blue', name: 'outpatient' },
            { titulo: 'Saídas (Total)', valor: 0, cor: 'green', name: 'exit_to_app' },
            { titulo: 'Saídas Regulação', valor: 0, cor: 'blue', name: 'local_hospital' },
            { titulo: 'Aguard. Transporte', valor: 0, cor: 'orange', name: 'ambulance' },
            { titulo: 'Pendências', valor: 0, cor: 'red', name: 'person_alert' }
        ];

        for (const kpi of initialKpis) {
            // Use name as ID for easier updates
            const kpiRef = doc(this.firestore, `kpis/${kpi.name}`);
            await setDoc(kpiRef, kpi);
        }
    }

    getAvisos(): Aviso[] {
        return this.avisosSubject.value;
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
        // Assuming name is the ID as set in seed
        const kpiRef = doc(this.firestore, `kpis/${name}`);
        await updateDoc(kpiRef, { valor: newValue });
    }
}
