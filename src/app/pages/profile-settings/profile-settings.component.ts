import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../modules/services/auth.service';
import { ProfileService } from '../../modules/services/profile.service';
import { UserService } from '../../modules/services/user.service';
import { User } from '../../modules/interfaces/user.model';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="profile-container">
      <div class="header-section">
        <h2>Configurações do Perfil</h2>
        <p>Gerencie suas informações pessoais</p>
      </div>
      
        <div class="profile-card">
          <div class="user-identity-section">
            <div class="initials-avatar">
              {{ getInitials(currentUser?.displayName) }}
            </div>
            <div class="user-info">
              <h3>{{ currentUser?.displayName || 'Usuário' }}</h3>
              <span class="role-badge" [class.admin]="currentUser?.role === 'admin'">
                {{ currentUser?.role === 'admin' ? 'Administrador' : 'Colaborador' }}
              </span>
            </div>
          </div>

        <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" class="profile-form">
          <!-- Name Field -->
          <div class="form-group">
            <label for="displayName">Nome Completo</label>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">person</span>
              <input type="text" id="displayName" formControlName="displayName" placeholder="Seu nome completo">
              <span class="material-symbols-outlined edit-icon">edit</span>
            </div>
          </div>

          <!-- Cargo Field -->
          <div class="form-group">
            <label for="cargo">Cargo / Função</label>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">work</span>
              <input type="text" id="cargo" formControlName="cargo" placeholder="Ex: Enfermeiro Chefe">
              <span class="material-symbols-outlined edit-icon">edit</span>
            </div>
          </div>

          <!-- Email Field (Read-only) -->
          <div class="form-group">
            <label for="email">Email</label>
            <div class="input-wrapper disabled">
              <span class="material-symbols-outlined input-icon">mail</span>
              <input type="email" id="email" [value]="currentUserEmail" disabled>
              <span class="material-symbols-outlined lock-icon">lock</span>
            </div>
            <span class="hint">O email não pode ser alterado.</span>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <button type="submit" [disabled]="profileForm.invalid || isLoading || !profileForm.dirty" class="btn-save">
              <span class="material-symbols-outlined" *ngIf="!isLoading">save</span>
              <span class="spinner" *ngIf="isLoading"></span>
              {{ isLoading ? 'Salvando...' : 'Salvar Alterações' }}
            </button>
          </div>
          
          <!-- Feedback Messages -->
          <div *ngIf="message" class="alert" [class.success]="!isError" [class.error]="isError">
            <span class="material-symbols-outlined">{{ isError ? 'error' : 'check_circle' }}</span>
            {{ message }}
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
      min-height: calc(100vh - 64px);
    }

    .header-section {
      margin-bottom: 2rem;
      text-align: center;

      h2 {
        font-size: 2rem;
        color: #2d3436;
        margin: 0;
        font-weight: 700;
      }

      p {
        color: #636e72;
        margin-top: 0.5rem;
      }
    }

    .profile-card {
      background: white;
      border-radius: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      
      @media (min-width: 768px) {
        flex-direction: row;
      }
    }

    .user-identity-section {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 3rem 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-bottom: 1px solid #eee;
      
      @media (min-width: 768px) {
        width: 300px;
        border-right: 1px solid #eee;
        border-bottom: none;
      }
    }

    .initials-avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6c5ce7, #a29bfe);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
      box-shadow: 0 8px 20px rgba(108, 92, 231, 0.3);
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .user-info {
      text-align: center;

      h3 {
        margin: 0 0 0.5rem 0;
        color: #2d3436;
        font-size: 1.25rem;
      }
    }

    .role-badge {
      display: inline-block;
      padding: 0.4rem 1rem;
      background: #e0f2f1;
      color: #00695c;
      border-radius: 50px;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;

      &.admin {
        background: #e3f2fd;
        color: #1565c0;
      }
    }

    .profile-form {
      flex: 1;
      padding: 3rem 2rem;
    }

    .form-group {
      margin-bottom: 1.5rem;

      label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: #2d3436;
        font-size: 0.9rem;
      }
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;

      .input-icon {
        position: absolute;
        left: 1rem;
        color: #b2bec3;
      }

      input {
        width: 100%;
        padding: 0.8rem 1rem 0.8rem 3rem;
        border: 2px solid #f1f2f6;
        border-radius: 12px;
        font-size: 1rem;
        color: #2d3436;
        transition: all 0.3s ease;
        background: #f8f9fa;
        z-index: 1; /* Ensure input is clickable */

        &:focus {
          border-color: #74b9ff;
          background: white;
          outline: none;
          box-shadow: 0 0 0 4px rgba(116, 185, 255, 0.1);
        }
      }

      .edit-icon {
        position: absolute;
        right: 1rem;
        color: #b2bec3;
        font-size: 1.2rem;
        pointer-events: none;
        z-index: 2;
      }

      &.disabled {
        input {
          background: #f1f2f6;
          color: #636e72;
          cursor: not-allowed;
        }
        
        .lock-icon {
          position: absolute;
          right: 1rem;
          color: #b2bec3;
          font-size: 1.2rem;
        }
      }
    }

    .hint {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.8rem;
      color: #b2bec3;
    }

    .form-actions {
      margin-top: 2rem;
    }

    .btn-save {
      width: 100%;
      padding: 1rem;
      background: #0984e3;
      color: white;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;

      &:hover:not(:disabled) {
        background: #0077d1;
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(9, 132, 227, 0.3);
      }

      &:disabled {
        background: #b2bec3;
        cursor: not-allowed;
        transform: none;
      }
    }

    .alert {
      margin-top: 1.5rem;
      padding: 1rem;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.95rem;
      animation: slideIn 0.3s ease;

      &.success {
        background: #e6fffa;
        color: #00b894;
        border: 1px solid #b2f5ea;
      }

      &.error {
        background: #fff5f5;
        color: #d63031;
        border: 1px solid #fed7d7;
      }
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class ProfileSettingsComponent implements OnInit {
  profileForm: FormGroup;
  currentUser: User | null = null;
  currentUserEmail: string = '';
  isLoading = false;
  message = '';
  isError = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private profileService: ProfileService,
    private userService: UserService
  ) {
    console.log('ProfileSettingsComponent: Constructor called');
    this.profileForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      cargo: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    const firebaseUser = this.authService['auth'].currentUser;
    if (firebaseUser) {
      this.currentUserEmail = firebaseUser.email || '';
    }

    this.authService.authState$.subscribe(state => {
      // Only update if we are NOT currently loading/saving to prevent overwriting with stale data
      if (!this.isLoading) {
        this.currentUser = state.usuario;

        if (this.currentUser) {
          if (!this.currentUser.email && firebaseUser) {
            this.currentUserEmail = firebaseUser.email || '';
          } else {
            this.currentUserEmail = this.currentUser.email || '';
          }

          // Only patch form if it's pristine (user hasn't started editing)
          if (this.profileForm.pristine) {
            this.profileForm.patchValue({
              displayName: this.currentUser.displayName || firebaseUser?.displayName || '',
              cargo: this.currentUser.cargo || ''
            }, { emitEvent: false });
          }

          // Explicitly enable controls to ensure editability
          this.profileForm.get('displayName')?.enable();
          this.profileForm.get('cargo')?.enable();
        }
      }
    });
  }

  getInitials(name: string | undefined): string {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  async onSubmit() {
    if (this.profileForm.invalid) {
      return;
    }

    // Ensure we have a user and UID
    let uid = this.currentUser?.uid;
    if (!uid) {
      // Fallback to Firebase Auth user
      const firebaseUser = this.authService['auth'].currentUser;
      if (firebaseUser) {
        uid = firebaseUser.uid;
      } else {
        this.isError = true;
        this.message = 'Erro: Usuário não identificado. Faça login novamente.';
        return;
      }
    }

    this.isLoading = true;
    this.message = '';
    this.isError = false;

    // Safety timeout: Force stop loading after 15 seconds no matter what
    const safetyTimeout = setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
        this.message = 'A operação demorou, mas os dados devem ter sido salvos.';
        this.isError = false;
        console.warn('Safety timeout triggered in ProfileSettingsComponent');
      }
    }, 15000);

    try {
      // Update user profile using ProfileService
      await this.profileService.updateUserProfile(
        uid,
        this.profileForm.get('displayName')?.value,
        this.profileForm.get('cargo')?.value
      );

      // Manually update local state to reflect changes immediately
      if (this.currentUser) {
        this.currentUser = {
          ...this.currentUser,
          displayName: this.profileForm.get('displayName')?.value,
          cargo: this.profileForm.get('cargo')?.value
        };
      }

      this.message = 'Perfil atualizado com sucesso!';
      this.isError = false;
      this.profileForm.markAsPristine();

      setTimeout(() => {
        this.message = '';
      }, 3000);

    } catch (error: any) {
      console.error('Error updating profile:', error);
      this.isError = true;
      this.message = `Erro ao atualizar: ${error.message || 'Tente novamente.'}`;
    } finally {
      clearTimeout(safetyTimeout);
      this.isLoading = false;
    }
  }
}
