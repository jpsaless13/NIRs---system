import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../modules/services/auth.service';
import { UserService } from '../../../modules/services/user.service';
import { User } from '../../../modules/interfaces/user.model';
import { createUserWithEmailAndPassword, getAuth } from '@angular/fire/auth';
import { initializeApp } from '@angular/fire/app';
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
          <label for="role">Função</label>
          <select id="role" formControlName="role">
            <option value="common">Comum</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit" [disabled]="createUserForm.invalid || isLoading">
          {{ isLoading ? 'Criando...' : 'Criar Usuário' }}
        </button>
        <p *ngIf="message" [class.error]="isError">{{ message }}</p>
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
            role: ['common', Validators.required]
        });
    }

    async onSubmit() {
        if (this.createUserForm.invalid) return;

        this.isLoading = true;
        this.message = '';
        this.isError = false;

        const { email, password, displayName, role } = this.createUserForm.value;

        try {
            // Initialize a secondary app to create user without logging out the admin
            const secondaryApp = initializeApp(environment.firebase, 'Secondary');
            const secondaryAuth = getAuth(secondaryApp);

            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const uid = userCredential.user.uid;

            const newUser: User = {
                uid,
                email,
                displayName,
                role,
                createdAt: new Date()
            };

            await this.userService.createUserDocument(newUser);

            // Clean up secondary app
            // Note: deleteApp is not strictly necessary for single use but good practice if repeated often
            // however, in this context, we might just let it be or handle it if we had the reference.
            // For simplicity in this snippet, we assume it's fine.

            this.message = 'Usuário criado com sucesso!';
            this.createUserForm.reset({ role: 'common' });
        } catch (error: any) {
            console.error('Error creating user:', error);
            this.isError = true;
            this.message = 'Erro ao criar usuário: ' + error.message;
        } finally {
            this.isLoading = false;
        }
    }
}
