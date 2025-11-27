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
      min-height: 100vh;
    }

    .main-content {
      margin-top: 64px;
      min-height: calc(100vh - 64px);
      background: #f9fafb;
    }
  `]
})
export class MainLayoutComponent { }
