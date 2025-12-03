import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../modules/services/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  isRegisterMode = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Initialize login form
    this.loginForm = this.fb.group({
      usuario: ['', [Validators.required]],
      senha: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Initialize register form
    this.registerForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(6)]],
      confirmarSenha: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    // Check if already authenticated on component load
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.errorMessage = '';
      const { usuario, senha } = this.loginForm.value;

      this.authService.login(usuario, senha).subscribe({
        next: (success) => {
          if (success) {
            this.router.navigate(['/dashboard']);
          } else {
            this.errorMessage = 'Usuário ou senha inválidos';
            this.loginForm.patchValue({ senha: '' });
          }
        },
        error: (error) => {
          this.errorMessage = 'Erro ao realizar login. Tente novamente.';
          console.error('Login error:', error);
        }
      });
    } else {
      this.errorMessage = 'Por favor, preencha todos os campos';
    }
  }

  onRegister(): void {
    if (this.registerForm.valid) {
      this.errorMessage = '';
      this.successMessage = '';
      const { email, senha, displayName } = this.registerForm.value;

      this.authService.register(email, senha, displayName).subscribe({
        next: (success) => {
          if (success) {
            this.successMessage = 'Conta criada com sucesso! Redirecionando...';
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 1500);
          }
        },
        error: (error) => {
          console.error('Registration error:', error);

          // Handle Firebase errors
          if (error.code === 'auth/email-already-in-use') {
            this.errorMessage = 'Este email já está em uso';
          } else if (error.code === 'auth/weak-password') {
            this.errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres';
          } else if (error.code === 'auth/invalid-email') {
            this.errorMessage = 'Email inválido';
          } else {
            this.errorMessage = 'Erro ao criar conta. Tente novamente.';
          }

          this.registerForm.patchValue({ senha: '', confirmarSenha: '' });
        }
      });
    } else {
      this.errorMessage = 'Por favor, preencha todos os campos corretamente';
    }
  }

  toggleMode(): void {
    this.isRegisterMode = !this.isRegisterMode;
    this.errorMessage = '';
    this.successMessage = '';
    this.loginForm.reset();
    this.registerForm.reset();
  }

  /**
   * Custom validator to check if password and confirm password match
   */
  private passwordMatchValidator(formGroup: FormGroup): { [key: string]: boolean } | null {
    const senha = formGroup.get('senha');
    const confirmarSenha = formGroup.get('confirmarSenha');

    if (!senha || !confirmarSenha) {
      return null;
    }

    return senha.value === confirmarSenha.value ? null : { passwordMismatch: true };
  }

  get usuario() {
    return this.loginForm.get('usuario');
  }

  get senha() {
    return this.loginForm.get('senha');
  }

  // Register form getters
  get displayName() {
    return this.registerForm.get('displayName');
  }

  get email() {
    return this.registerForm.get('email');
  }

  get registerSenha() {
    return this.registerForm.get('senha');
  }

  get confirmarSenha() {
    return this.registerForm.get('confirmarSenha');
  }

  get passwordsMatch(): boolean {
    return !this.registerForm.hasError('passwordMismatch');
  }
}
