import { Injectable } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, docData } from '@angular/fire/firestore';
import { User, UserRole } from '../interfaces/user.model';
import { Observable, from, map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class UserService {

    constructor(private firestore: Firestore) { }

    // cria no firestone
    async createUserDocument(user: User): Promise<void> {
        const userRef = doc(this.firestore, `users/${user.uid}`);
        await setDoc(userRef, user, { merge: true });
    }

   // pega o usuário pelo UID
    getUser(uid: string): Observable<User | undefined> {
        const userRef = doc(this.firestore, `users/${uid}`);
        return docData(userRef) as Observable<User | undefined>;
    }

   //checa se o usuário é admin
    async isAdmin(uid: string): Promise<boolean> {
        const userRef = doc(this.firestore, `users/${uid}`);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
            const data = snapshot.data() as User;
            return data.role === 'admin';
        }
        return false;
    }




}
