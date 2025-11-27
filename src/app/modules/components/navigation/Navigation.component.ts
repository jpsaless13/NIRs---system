import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './Navigation.component.html',
  styleUrl: './Navigation.component.scss',
})
export class NavigationComponent {
  menuOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  logout() {
    this.authService.logout();
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }
}