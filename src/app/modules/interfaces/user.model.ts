export type UserRole = 'admin' | 'common';

export interface User {
    uid: string;
    email: string;
    displayName: string;
    role: 'admin' | 'user';
    cargo: string; // Job title/position
    photoURL?: string; // Profile photo (base64 or URL) - Legacy/Auth sync
    avatar?: string; // Dedicated Base64 avatar storage (Primary)
    isOnline?: boolean; // Online status
    createdAt: Date;
}
