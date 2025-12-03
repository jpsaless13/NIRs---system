import { Injectable, signal, computed, effect, Injector, inject } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { Router } from '@angular/router';
import { Auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, updateProfile } from '@angular/fire/auth';
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
        this.initOnlineStatusEffect();
    }

    private initOnlineStatusEffect() {
        // Effect to handle Online/Offline status automatically
        effect((onCleanup) => {
            const uid = this.userId();

            if (uid) {
                console.log(`[AuthEffect] User ${uid} detected. Setting Online.`);
                // Set Online
                this.userService.updateUserStatus(uid, true);

                // Register cleanup to set Offline when uid changes (logout) or effect destroyed
                onCleanup(() => {
                    console.log(`[AuthEffect] User ${uid} session ended. Setting Offline.`);
                    this.userService.updateUserStatus(uid, false);
                });
            }
        });
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
        const user = this.currentUser();
        if (user) {
            console.log('User inactive for 2 hours. Setting as offline.');
            this.userService.updateUserStatus(user.uid, false);
        }
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
            map(() => true),
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
                        isOnline: false,
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
        // Effect cleanup will handle offline status when _currentUser becomes null
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
