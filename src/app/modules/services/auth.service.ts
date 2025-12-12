import { Injectable, signal, computed, effect, Injector, inject } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { Router } from '@angular/router';
import { Auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, updateProfile } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { UserService } from './user.service';
import { User, UserRole } from '../interfaces/user.model';
import { switchMap, map, tap } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';

export interface AuthState {
    isAuthenticated: boolean;
    usuario: User | null;
    loading: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    // Signals
    private _currentUser = signal<User | null>(null);
    private _loading = signal<boolean>(true);

    // Public Signals
    public currentUser = this._currentUser.asReadonly();
    public loading = this._loading.asReadonly();
    public isAuthenticated = computed(() => !!this._currentUser());

    // Computed User ID for Effect tracking
    private userId = computed(() => this._currentUser()?.uid);

    // Compatibility Observable
    public authState$: Observable<AuthState>;

    constructor(
        private auth: Auth,
        private firestore: Firestore,
        private router: Router,
        private userService: UserService
    ) {
        console.log('AuthService: Constructor called');

        // Initialize compatibility observable
        this.authState$ = toObservable(computed(() => ({
            isAuthenticated: this.isAuthenticated(),
            usuario: this.currentUser(),
            loading: this.loading()
        })));

        this.initAuthStateListener();
        this.initInactivityListener();
    }

    private inactivityTimer: any;
    private readonly INACTIVITY_LIMIT_MS = 2 * 60 * 60 * 1000; // 2 hours

    private initInactivityListener() {
        const resetTimer = () => {
            if (this.isAuthenticated()) {
                clearTimeout(this.inactivityTimer);
                this.inactivityTimer = setTimeout(() => {
                    this.setAsOffline();
                }, this.INACTIVITY_LIMIT_MS);
            }
        };

        // Listen to activity events
        ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(event => {
            window.addEventListener(event, resetTimer);
        });
    }

    private setAsOffline() {
        // Feature removed
    }

    private initAuthStateListener() {
        onAuthStateChanged(this.auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Fetch user details from Firestore
                this.userService.getUser(firebaseUser.uid).subscribe({
                    next: (user) => {
                        // Update signal
                        this._currentUser.set(user || this.mapFirebaseUserToUser(firebaseUser));
                        this._loading.set(false);
                    },
                    error: (err) => {
                        console.error('Error fetching user from Firestore:', err);
                        this._currentUser.set(this.mapFirebaseUserToUser(firebaseUser));
                        this._loading.set(false);
                    }
                });
            } else {
                this._currentUser.set(null);
                this._loading.set(false);
            }
        });
    }

    private mapFirebaseUserToUser(fbUser: FirebaseUser): User {
        return {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || '',
            role: 'user', // Default role if not found in Firestore
            cargo: '', // Default empty cargo
            photoURL: fbUser.photoURL || undefined,
            avatar: undefined, // Will be populated from Firestore if available
            createdAt: new Date()
        };
    }

    login(usuario: string, senha: string): Observable<boolean> {
        this._loading.set(true);
        return from(signInWithEmailAndPassword(this.auth, usuario, senha)).pipe(
            switchMap(async (cred) => {
                if (cred.user) {
                    // Sync basic data
                    // This ensures that even if the Firestore document is missing/empty,
                    // we at least have the Auth data (preventing "U" / "Sem Cargo" display issues).
                    const updateData = {
                        email: cred.user.email,
                        displayName: cred.user.displayName,
                        photoURL: cred.user.photoURL,
                        lastLogin: new Date()
                    };

                    // Use setDoc with merge: true to preserve existing fields (like cargo)
                    const userRef = doc(this.firestore, `users/${cred.user.uid}`);
                    await setDoc(userRef, updateData, { merge: true });
                }
                return true;
            }),
            tap({
                error: (err) => {
                    console.error('Login error:', err);
                    this._loading.set(false);
                }
            })
        );
    }

    /**
     * Registers a new user with email and password
     */
    register(email: string, password: string, displayName: string, cargo: string = ''): Observable<boolean> {
        this._loading.set(true);
        return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
            switchMap(async (userCredential) => {
                if (userCredential.user) {
                    await updateProfile(userCredential.user, { displayName });

                    const newUser: User = {
                        uid: userCredential.user.uid,
                        email: email,
                        displayName: displayName,
                        role: 'user',
                        cargo: cargo,
                        createdAt: new Date()
                    };

                    await this.userService.createUserDocument(newUser);
                }
                return true;
            }),
            tap({
                next: () => this._loading.set(false),
                error: (err) => {
                    console.error('Registration error:', err);
                    this._loading.set(false);
                }
            })
        );
    }

    logout(): void {
        this._currentUser.set(null);

        signOut(this.auth).then(() => {
            this.router.navigate(['/login']);
        }).catch(error => {
            console.error('Logout error:', error);
            this.router.navigate(['/login']);
        });
    }

    // Public API helpers
    getCurrentUser(): User | null {
        return this.currentUser();
    }

    isAdmin(): boolean {
        return this.currentUser()?.role === 'admin';
    }

    /**
     * Updates the user's profile in Firebase Auth (displayName and photoURL)
     */
    async updateUserProfile(displayName?: string, photoURL?: string): Promise<void> {
        const currentUser = this.auth.currentUser;
        if (!currentUser) {
            throw new Error('No user logged in');
        }

        const updates: any = {};
        if (displayName !== undefined) updates.displayName = displayName;
        if (photoURL !== undefined) updates.photoURL = photoURL;

        await updateProfile(currentUser, updates);
        console.log('Firebase Auth profile updated successfully');
    }
}
