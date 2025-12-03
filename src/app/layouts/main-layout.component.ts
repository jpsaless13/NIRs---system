import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from '../modules/components/navigation/Navigation.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, NavigationComponent],
  template: `
    <app-navigation />
    <div class="main-content">
      <router-outlet />
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }

    .main-content {
      margin-top: 64px;
      height: calc(100vh - 64px); /* Exact height of remaining space */
      overflow-y: auto; /* Internal scrolling */
      background: #f9fafb;
      scroll-behavior: smooth;
      
      /* Ensure content doesn't touch edges on small screens */
      box-sizing: border-box;
    }
  `]
})
export class MainLayoutComponent { }
