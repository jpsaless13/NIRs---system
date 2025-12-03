import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../modules/services/user.service';
import { User } from '../../modules/interfaces/user.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-online-users',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="online-users-page">
      <div class="content-wrapper">
        <header>
          <h2>Quem está Online</h2>
          <p>Colaboradores ativos no momento</p>
        </header>
        
        <div class="carousel-container" *ngIf="users.length > 0; else emptyState">
          <!-- Navigation Button - Left -->
          <button class="nav-button nav-left" (click)="prev()" aria-label="Usuário anterior">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          
          <!-- User Card Carousel -->
          <div class="carousel-track">
            <div class="user-card">
              <div class="card-content">
                <div class="avatar-wrapper">
                  <div class="initials-avatar">
                    {{ getInitials(users[currentIndex].displayName) }}
                  </div>
                  <div class="status-ring"></div>
                </div>
                
                <div class="user-info">
                  <h3>{{ users[currentIndex].displayName }}</h3>
                  <span class="role-badge">{{ users[currentIndex].cargo || 'Sem cargo' }}</span>
                </div>
                
                <div class="card-footer">
                  <span class="status-text">
                    <span class="dot"></span> Online agora
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Navigation Button - Right -->
          <button class="nav-button nav-right" (click)="next()" aria-label="Próximo usuário">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
          
          <!-- Position Indicators -->
          <div class="position-indicators">
            <button 
              *ngFor="let user of users; let i = index" 
              class="indicator-dot"
              [class.active]="i === currentIndex"
              (click)="goToIndex(i)"
              [attr.aria-label]="'Ir para ' + user.displayName">
            </button>
          </div>
        </div>
        
        <ng-template #emptyState>
          <div class="empty-state">
            <div class="empty-icon">
              <span class="material-symbols-outlined">person_off</span>
            </div>
            <h3>Ninguém online</h3>
            <p>Parece que você é o único por aqui.</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .online-users-page {
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f6f8fd 0%, #e1e8f5 100%);
      padding: 2rem;
    }

    .content-wrapper {
      width: 100%;
      max-width: 1400px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2.5rem;
    }

    header {
      text-align: center;
      
      h2 {
        font-size: 2.5rem;
        color: #1a202c;
        margin: 0;
        font-weight: 800;
        letter-spacing: -0.02em;
        background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      
      p {
        color: #718096;
        font-size: 1.1rem;
        margin-top: 0.5rem;
        font-weight: 500;
      }
    }

    .carousel-container {
      position: relative;
      width: 100%;
      max-width: 450px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem 0;
    }

    .nav-button {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 10;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      color: #4a5568;

      &:hover {
        background: #fff;
        color: #2d3748;
        transform: translateY(-50%) scale(1.1);
        box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      }

      &:active {
        transform: translateY(-50%) scale(0.95);
      }

      span {
        font-size: 28px;
      }
    }

    .nav-left {
      left: -24px;
    }

    .nav-right {
      right: -24px;
    }

    .carousel-track {
      width: 100%;
      display: flex;
      justify-content: center;
      perspective: 1000px;
    }

    .user-card {
      width: 100%;
      height: 480px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 32px;
      padding: 2.5rem;
      box-shadow: 
        0 20px 40px rgba(0,0,0,0.08),
        0 0 0 1px rgba(255,255,255,0.5) inset;
      animation: cardFade 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      transition: transform 0.3s ease;

      .card-content {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
      }
    }

    @keyframes cardFade {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .avatar-wrapper {
      position: relative;
      width: 160px;
      height: 160px;
      margin-top: 1rem;
      border-radius: 50%;
      padding: 6px;
      background: white;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);

      .initials-avatar {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: linear-gradient(135deg, #6c5ce7, #a29bfe);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 3.5rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 2px;
      }

      .status-ring {
        position: absolute;
        top: -4px;
        left: -4px;
        right: -4px;
        bottom: -4px;
        border-radius: 50%;
        border: 3px solid #48bb78;
        opacity: 0.5;
        animation: pulse 2s infinite;
      }
    }

    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.5; }
      100% { transform: scale(1.15); opacity: 0; }
    }

    .user-info {
      text-align: center;
      width: 100%;
      
      h3 {
        font-size: 1.75rem;
        color: #1a202c;
        margin: 0 0 0.75rem 0;
        font-weight: 700;
        line-height: 1.2;
      }

      .role-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.5rem 1.25rem;
        background: #ebf8ff;
        color: #3182ce;
        border-radius: 999px;
        font-size: 0.9rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        box-shadow: 0 2px 6px rgba(49, 130, 206, 0.1);
      }
    }

    .card-footer {
      width: 100%;
      border-top: 1px solid rgba(0,0,0,0.06);
      padding-top: 1.5rem;
      display: flex;
      justify-content: center;

      .status-text {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: #48bb78;
        font-weight: 600;
        font-size: 0.95rem;
        background: rgba(72, 187, 120, 0.1);
        padding: 0.5rem 1rem;
        border-radius: 12px;

        .dot {
          width: 8px;
          height: 8px;
          background: #48bb78;
          border-radius: 50%;
          box-shadow: 0 0 0 2px rgba(72, 187, 120, 0.2);
          animation: blink 2s infinite;
        }
      }
    }

    @keyframes blink {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.9); }
    }

    .position-indicators {
      position: absolute;
      bottom: -40px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.5);
      backdrop-filter: blur(4px);
      border-radius: 20px;
    }

    .indicator-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #cbd5e0;
      border: none;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      padding: 0;

      &:hover {
        background: #a0aec0;
        transform: scale(1.2);
      }

      &.active {
        background: #3182ce;
        width: 24px;
        border-radius: 4px;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem;
      background: white;
      border-radius: 32px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.05);
      text-align: center;
      max-width: 400px;

      .empty-icon {
        width: 80px;
        height: 80px;
        background: #f7fafc;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 1.5rem;
        color: #cbd5e0;

        span {
          font-size: 40px;
        }
      }

      h3 {
        font-size: 1.5rem;
        color: #2d3748;
        margin: 0 0 0.5rem 0;
        font-weight: 700;
      }

      p {
        color: #718096;
        font-size: 1.1rem;
        margin: 0;
        line-height: 1.5;
      }
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .online-users-page {
        padding: 1rem;
      }

      header h2 {
        font-size: 2rem;
      }

      .carousel-container {
        max-width: 100%;
        padding: 0.5rem 0;
      }

      .user-card {
        height: 420px;
        padding: 2rem;
      }

      .nav-button {
        width: 40px;
        height: 40px;
        background: white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);

        span {
          font-size: 24px;
        }
      }

      .nav-left {
        left: -10px;
      }

      .nav-right {
        right: -10px;
      }

      .avatar-wrapper {
        width: 130px;
        height: 130px;
      }

      .user-info h3 {
        font-size: 1.5rem;
      }
    }
  `]
})
export class OnlineUsersComponent implements OnInit, OnDestroy {
  onlineUsers$: Observable<User[]> | undefined;
  users: User[] = [];
  currentIndex: number = 0;
  private autoAdvanceInterval: any;

  constructor(private userService: UserService) { }

  ngOnInit() {
    this.onlineUsers$ = this.userService.getOnlineUsers();

    // Subscribe to online users and store in local array
    this.onlineUsers$.subscribe(users => {
      this.users = users;
      // Reset index if it's out of bounds
      if (this.currentIndex >= this.users.length && this.users.length > 0) {
        this.currentIndex = 0;
      }
    });

    // Auto-advance every 4 seconds
    this.startAutoAdvance();
  }

  ngOnDestroy() {
    this.stopAutoAdvance();
  }

  startAutoAdvance() {
    this.stopAutoAdvance();
    this.autoAdvanceInterval = setInterval(() => {
      if (this.users.length > 0 && !document.hidden) {
        this.next(true); // true indicates auto-advance
      }
    }, 4000);
  }

  stopAutoAdvance() {
    if (this.autoAdvanceInterval) {
      clearInterval(this.autoAdvanceInterval);
    }
  }

  resetTimer() {
    this.startAutoAdvance();
  }

  next(isAuto: boolean = false) {
    if (this.users.length > 0) {
      this.currentIndex = (this.currentIndex + 1) % this.users.length;
      if (!isAuto) {
        this.resetTimer();
      }
    }
  }

  prev() {
    if (this.users.length > 0) {
      this.currentIndex = this.currentIndex === 0
        ? this.users.length - 1
        : this.currentIndex - 1;
      this.resetTimer();
    }
  }

  goToIndex(index: number) {
    this.currentIndex = index;
    this.resetTimer();
  }

  trackByUserId(index: number, user: User): string {
    return user.uid;
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
}
