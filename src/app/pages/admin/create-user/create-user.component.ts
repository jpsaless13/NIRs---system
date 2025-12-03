import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../modules/services/auth.service';
import { UserService } from '../../../modules/services/user.service';
import { User } from '../../../modules/interfaces/user.model';
import { createUserWithEmailAndPassword, getAuth, updateProfile } from '@angular/fire/auth';
import { initializeApp, deleteApp } from '@angular/fire/app';
import { getFirestore, doc, setDoc } from '@angular/fire/firestore';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-create-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="create-user-container">
      <h2>Criar Novo Usuário</h2>
      <form [formGroup]="createUserForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" formControlName="email" required>
        </div>
        <div class="form-group">
          <label for="password">Senha</label>
          <input type="password" id="password" formControlName="password" required>
        </div>
        <div class="form-group">
          <label for="displayName">Nome</label>
          <input type="text" id="displayName" formControlName="displayName" required>
        </div>
        <div class="form-group">
          <label for="cargo">Cargo</label>
          <select id="cargo" formControlName="cargo" required>
            <option value="">Selecione</option>
            <option value="médico">Médico</option>
            <option value="enfermeiro">Enfermeiro</option>
            <option value="técnico de enfermagem">Técnico de Enfermagem</option>
            <option value="auxiliar de regulação">Auxiliar de Regulação</option>
            <option value="recepcionista">Recepcionista</option>
            <option value="farmacêutico">Farmacêutico</option>
            <option value="laboratorista">Laboratorista</option>
            <option value="administrativo">Administrativo</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div class="form-group">
          <label for="role">Função</label>
          <select id="role" formControlName="role">
            <option value="user">Usuário</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit" [disabled]="createUserForm.invalid || isLoading">
          {{ isLoading ? 'Criando...' : 'Criar Usuário' }}
        </button>
        <p *ngIf="message" [class.error]="isError" [class.success]="!isError">{{ message }}</p>
      </form>
    </div>
  `,
  styles: [`
    .create-user-container {
      padding: 2rem;
      max-width: 500px;
      margin: 0 auto;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    label {
      display: block;
      margin-bottom: 0.5rem;
    }
    input, select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    button {
      padding: 0.5rem 1rem;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:disabled {
      background-color: #ccc;
    }
    .error {
      color: red;
      margin-top: 1rem;
    }
    .success {
      color: green;
      margin-top: 1rem;
    }
  `]
})
export class CreateUserComponent {
  createUserForm: FormGroup;
  isLoading = false;
  message = '';
  isError = false;

  constructor(
    private fb: FormBuilder,
    private userService: UserService
  ) {
    this.createUserForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      displayName: ['', Validators.required],
      cargo: ['', Validators.required],
      role: ['user', Validators.required]
    });
  }

  async onSubmit() {
    if (this.createUserForm.invalid) return;

    this.isLoading = true;
    this.message = '';
    this.isError = false;

    const { email, password, displayName, cargo, role } = this.createUserForm.value;
    let secondaryApp: any;
    let secondaryAuth: any;
    let secondaryFirestore: any;

    try {
      console.log('[CreateUser] Starting user creation process...');

      // Initialize a secondary app to create user without logging out the admin
      const appName = `Secondary_${Date.now()}`;
      secondaryApp = initializeApp(environment.firebase, appName);
      secondaryAuth = getAuth(secondaryApp);
      secondaryFirestore = getFirestore(secondaryApp); // Initialize Firestore for secondary app

      console.log('[CreateUser] Secondary auth and firestore initialized');

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const uid = userCredential.user.uid;
      console.log('[CreateUser] User created in Firebase Auth:', uid);

      // Update profile on the auth user
      await updateProfile(userCredential.user, { displayName });
      console.log('[CreateUser] Display name updated');

      // Create user document in Firestore using the SECONDARY Firestore instance
      // This ensures the write happens with the NEW user's auth context
      const newUser: User = {
        uid,
        email,
        displayName,
        cargo,
        role,
        isOnline: false,
        createdAt: new Date()
      };

      const userRef = doc(secondaryFirestore, `users/${uid}`);
      await setDoc(userRef, newUser, { merge: true });

      console.log('[CreateUser] User document created in Firestore (using secondary app)');

      // Sign out from secondary auth before deleting app
      await secondaryAuth.signOut();
      console.log('[CreateUser] Secondary auth signed out');

      this.message = 'Usuário criado com sucesso!';
      this.isError = false;
      this.createUserForm.reset({ role: 'user', cargo: '' });
    } catch (error: any) {
      console.error('[CreateUser] Error:', error);
      this.isError = true;

      if (error.code === 'auth/email-already-in-use') {
        this.message = 'Este email já está cadastrado no sistema.';
      } else if (error.code === 'auth/invalid-email') {
        this.message = 'Email inválido.';
      } else if (error.code === 'auth/weak-password') {
        this.message = 'Senha muito fraca. Use pelo menos 6 caracteres.';
      } else if (error.code === 'permission-denied') {
        this.message = 'Erro de permissão ao salvar dados do usuário.';
      } else {
        this.message = 'Erro ao criar usuário: ' + (error.message || error.code || 'Erro desconhecido');
      }
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch (e) {
          console.error('[CreateUser] Error deleting secondary app:', e);
        }
      }
      this.isLoading = false;
    }
  }
}
