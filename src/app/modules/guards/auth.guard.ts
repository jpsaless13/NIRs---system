import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.authState$.pipe(
        filter(state => !state.loading), // Wait until loading is false
        take(1), // Take the first emitted value after loading is false
        map(state => {
            if (state.isAuthenticated) {
                return true;
            } else {
                return router.createUrlTree(['/login']);
            }
        })
    );
};
