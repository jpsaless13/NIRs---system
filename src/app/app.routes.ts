import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { CensoComponent } from './pages/censo/censo.component';
import { ChatComponent } from './pages/chat/chat.component';
import { MainLayoutComponent } from './layouts/main-layout.component';
import { authGuard } from './modules/guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [authGuard],
        children: [
            {
                path: 'dashboard',
                component: DashboardComponent
            },
            {
                path: 'censo',
                component: CensoComponent
            },
            {
                path: 'chat',
                component: ChatComponent
            },
            {
                path: 'pendencias',
                loadComponent: () => import('./pages/pendencias/pendencias.component').then(m => m.PendenciasComponent)
            },
            {
                path: 'admin/create-user',
                loadComponent: () => import('./pages/admin/create-user/create-user.component').then(m => m.CreateUserComponent)
            }
        ]
    },
    {
        path: '**',
        redirectTo: 'login'
    }
];

