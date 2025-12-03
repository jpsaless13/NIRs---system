import { Component, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PendenciasService } from './modules/services/pendencias.service';
import { AuthService } from './modules/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'NIRs';

  showNotification = false;
  notificationMessage = '';

  private pendenciasService = inject(PendenciasService);
  private authService = inject(AuthService);

  constructor() {
    // Effect to check for pendencies
    effect(() => {
      const user = this.authService.getCurrentUser();
      if (user && user.cargo) {
        const { pacientes, gerais } = this.pendenciasService.getPendenciasForRole(user.cargo);
        const totalPendencias = pacientes.length + gerais.length;

        if (totalPendencias > 0) {
          this.notificationMessage = `Você tem ${totalPendencias} pendência(s) atribuída(s) ao seu cargo (${user.cargo}).`;
          this.showNotification = true;

          // Auto hide after 10s
          setTimeout(() => {
            this.showNotification = false;
          }, 10000);
        }
      }
    });
  }

  closeNotification() {
    this.showNotification = false;
  }
}
