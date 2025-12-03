import { Injectable } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, docData, collection, query, where, collectionData } from '@angular/fire/firestore';
import { User, UserRole } from '../interfaces/user.model';
import { Observable, from, map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    // Throttle mechanism removed

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

    /**
     * Sets the online status of a user
     * Use this for quick status changes
     */
    async setOnlineStatus(uid: string, isOnline: boolean): Promise<void> {
        const userRef = doc(this.firestore, `users/${uid}`);
        await setDoc(userRef, { isOnline }, { merge: true });
        console.log(`[UserService] Online status set to ${isOnline} for user ${uid}`);
    }



    /**
     * Updates online status (for login/logout events)
     */
    async updateUserStatus(uid: string, isOnline: boolean): Promise<void> {
        const userRef = doc(this.firestore, `users/${uid}`);
        // Only update isOnline
        console.log(`🔥 [UserService] WRITING to Firestore: User ${uid} isOnline=${isOnline}`);
        await setDoc(userRef, { isOnline }, { merge: true });
        console.log(`✅ [UserService] Write complete: User ${uid} isOnline=${isOnline}`);
    }

    // Atualiza dados do usuário
    async updateUser(user: Partial<User>): Promise<void> {
        if (!user.uid) throw new Error('User UID is required for update');
        const userRef = doc(this.firestore, `users/${user.uid}`);
        await setDoc(userRef, user, { merge: true });
    }

    // Pega usuários online
    getOnlineUsers(): Observable<User[]> {
        const usersRef = collection(this.firestore, 'users');
        const q = query(usersRef, where('isOnline', '==', true));
        return collectionData(q, { idField: 'uid' }) as Observable<User[]>;
    }
}
