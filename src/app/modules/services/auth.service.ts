import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { Router } from '@angular/router';
import { Auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, updateProfile } from '@angular/fire/auth';
import { UserService } from './user.service';
import { User, UserRole } from '../interfaces/user.model';
import { switchMap, map, tap } from 'rxjs/operators';

export interface AuthState {
    isAuthenticated: boolean;
    usuario: User | null;
    loading: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private authStateSubject = new BehaviorSubject<AuthState>({
        isAuthenticated: false,
        usuario: null,
        loading: true // Start loading to check auth state
    });

    authState$: Observable<AuthState> = this.authStateSubject.asObservable();

    constructor(
        private auth: Auth,
        private router: Router,
        private userService: UserService
    ) {
        this.initAuthStateListener();
    }

    private initAuthStateListener() {
        onAuthStateChanged(this.auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Fetch user details from Firestore
                // Fetch user details from Firestore
                this.userService.getUser(firebaseUser.uid).subscribe({
                    next: (user) => {
                        console.log('User fetched from Firestore:', user);
                        this.authStateSubject.next({
                            isAuthenticated: true,
                            usuario: user || this.mapFirebaseUserToUser(firebaseUser),
                            loading: false
                        });
                    },
                    error: (err) => {
                        console.error('Error fetching user from Firestore:', err);
                        // Fallback to basic user info
                        this.authStateSubject.next({
                            isAuthenticated: true,
                            usuario: this.mapFirebaseUserToUser(firebaseUser),
                            loading: false
                        });
                    }
                });
            } else {
                this.authStateSubject.next({
                    isAuthenticated: false,
                    usuario: null,
                    loading: false
                });
            }
        });
    }

    private mapFirebaseUserToUser(fbUser: FirebaseUser): User {
        return {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || '',
            role: 'common', // Default role if not found in Firestore
            createdAt: new Date()
        };
    }

    login(usuario: string, senha: string): Observable<boolean> {
        this.setLoading(true);
        return from(signInWithEmailAndPassword(this.auth, usuario, senha)).pipe(
            map(() => true),
            tap({
                error: (err) => {
                    console.error('Login error:', err);
                    this.setLoading(false);
                }
            })
        );
    }

    /**
     * Registers a new user with email and password
     * Creates user in Firebase Auth and stores user data in Firestore
     */
    register(email: string, password: string, displayName: string): Observable<boolean> {
        this.setLoading(true);
        return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
            switchMap(async (userCredential) => {
                // Update the user's display name
                if (userCredential.user) {
                    await updateProfile(userCredential.user, { displayName });

                    // Create user document in Firestore
                    const newUser: User = {
                        uid: userCredential.user.uid,
                        email: email,
                        displayName: displayName,
                        role: 'common', // New users are common by default
                        createdAt: new Date()
                    };

                    await this.userService.createUserDocument(newUser);
                }
                return true;
            }),
            tap({
                next: () => this.setLoading(false),
                error: (err) => {
                    console.error('Registration error:', err);
                    this.setLoading(false);
                }
            })
        );
    }

    logout(): void {
        signOut(this.auth).then(() => {
            this.router.navigate(['/login']);
        });
    }

    isAuthenticated(): boolean {
        return this.authStateSubject.value.isAuthenticated;
    }

    getCurrentUser(): User | null {
        return this.authStateSubject.value.usuario;
    }
    isAdmin(): boolean {
        return this.authStateSubject.value.usuario?.role === 'admin';
    }

    private setLoading(loading: boolean): void {
        const currentState = this.authStateSubject.value;
        this.authStateSubject.next({ ...currentState, loading });
    }
}
