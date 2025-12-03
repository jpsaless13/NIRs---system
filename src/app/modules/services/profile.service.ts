import { Injectable } from '@angular/core';
import { Auth, updateProfile } from '@angular/fire/auth';
import { Firestore, doc, updateDoc, setDoc } from '@angular/fire/firestore';

@Injectable({
    providedIn: 'root'
})
export class ProfileService {

    constructor(
        private auth: Auth,
        private firestore: Firestore
    ) { }

    /**
     * Updates user profile in both Firebase Auth and Firestore
     * Uses a "fire-and-forget" strategy for Auth if it hangs, and ensures the method returns.
     */
    async updateUserProfile(uid: string, displayName: string, cargo?: string): Promise<void> {
        const currentUser = this.auth.currentUser;
        if (!currentUser) throw new Error('No user logged in');

        // 1. Prepare Auth Updates
        const authUpdates: { displayName?: string } = { displayName };

        // 2. Prepare Firestore Updates
        const userRef = doc(this.firestore, `users/${uid}`);
        const firestoreUpdates: any = { displayName };

        if (cargo) firestoreUpdates.cargo = cargo;

        // 3. Run updates in parallel with a timeout
        // This ensures that if one hangs (e.g. Auth), the other can still succeed, and we don't wait forever.
        const updatePromise = Promise.allSettled([
            updateProfile(currentUser, authUpdates),
            setDoc(userRef, firestoreUpdates, { merge: true })
        ]);

        // Create a timeout promise that rejects after 10 seconds
        const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(() => reject(new Error('Update operation timed out')), 10000);
        });

        try {
            // Race the update against the timeout
            const results = await Promise.race([updatePromise, timeoutPromise]);

            // Check results if it wasn't the timeout
            if (Array.isArray(results)) {
                const [authResult, firestoreResult] = results;

                // Log failures but don't throw if at least one succeeded (optimistic)
                if (authResult.status === 'rejected') {
                    console.warn('Auth update failed or skipped:', authResult.reason);
                }
                if (firestoreResult.status === 'rejected') {
                    console.error('Firestore update failed:', firestoreResult.reason);
                    // If Firestore failed, that's critical, so we should probably throw
                    throw new Error('Failed to save profile data to database.');
                }
            }
        } catch (error) {
            console.error('Error in updateUserProfile:', error);
            throw error;
        }
    }
}
