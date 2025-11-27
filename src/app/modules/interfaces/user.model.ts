export type UserRole = 'admin' | 'common';

export interface User {
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    createdAt: Date;
}
