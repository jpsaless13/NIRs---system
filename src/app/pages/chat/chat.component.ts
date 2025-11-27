import { User } from './../../modules/interfaces/user.model';
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService } from '../../modules/services/chat.service';
import { AuthService } from '../../modules/services/auth.service';
import { ChatMessage } from '../../modules/interfaces/chat.models';



@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chat.component.html',
    styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
    @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
    @ViewChild('fileInput') private fileInput!: ElementRef;

    messages: ChatMessage[] = [];
    newMessage: string = '';
    currentUser: User | null = null;
    selectedImage: File | null = null;
    imagePreview: string | null = null;
    isUploading: boolean = false;

    private messagesSubscription?: Subscription;
    private shouldScrollToBottom = false;

    constructor(
        private chatService: ChatService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.currentUser = this.authService.getCurrentUser();
        console.log(this.currentUser);
        // Subscribe to real-time messages
        this.messagesSubscription = this.chatService.getMessages().subscribe({
            next: (messages) => {
                this.messages = messages;
                this.shouldScrollToBottom = true;
            },
            error: (error) => {
                console.error('Error loading messages:', error);
            }
        });
    }

    ngAfterViewChecked(): void {
        if (this.shouldScrollToBottom) {
            this.scrollToBottom();
            this.shouldScrollToBottom = false;
        }
    }

    ngOnDestroy(): void {
        this.messagesSubscription?.unsubscribe();
    }

    get currentUserName(): string {
        return  this.currentUser?.email || "user";
    }

    /**
     * Send a message
     */
    async sendMessage(): Promise<void> {
        if ((!this.newMessage.trim() && !this.selectedImage) || this.isUploading) {
            return;
        }

        this.isUploading = true;

        try {
            if (this.selectedImage) {
                await this.chatService.sendMessageWithImage(
                    this.currentUserName,
                    this.newMessage.trim(),
                    this.selectedImage
                );
            } else {
                await this.chatService.sendMessage(this.currentUserName, this.newMessage.trim());
            }

            // Clear input
            this.newMessage = '';
            this.clearImageSelection();
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Erro ao enviar mensagem. Tente novamente.');
        } finally {
            this.isUploading = false;
        }
    }

    /**
     * Handle image file selection
     */
    onImageSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];

            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Por favor, selecione apenas arquivos de imagem.');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('A imagem deve ter no máximo 5MB.');
                return;
            }

            this.selectedImage = file;

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                this.imagePreview = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    }

    /**
     * Clear image selection
     */
    clearImageSelection(): void {
        this.selectedImage = null;
        this.imagePreview = null;
        if (this.fileInput) {
            this.fileInput.nativeElement.value = '';
        }
    }

    /**
     * Trigger file input click
     */
    triggerFileInput(): void {
        this.fileInput.nativeElement.click();
    }

    /**
     * Check if message is from current user
     */
    isCurrentUser(message: ChatMessage): boolean {
        return message.usuario === this.currentUserName;
    }

    /**
     * Get user color
     */
    getUserColor(usuario: string): string {
        return this.chatService.getUserColor(usuario);
    }

    /**
     * Format timestamp
     */
    formatTime(timestamp: number): string {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        // Less than 1 minute
        if (diff < 60000) {
            return 'Agora';
        }

        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}min atrás`;
        }

        // Today
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }

        // This week
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            const days = Math.floor(diff / (24 * 60 * 60 * 1000));
            return `${days}d atrás`;
        }

        // Older
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }

    /**
     * Scroll to bottom of messages
     */
    private scrollToBottom(): void {
        try {
            if (this.messagesContainer) {
                this.messagesContainer.nativeElement.scrollTop =
                    this.messagesContainer.nativeElement.scrollHeight;
            }
        } catch (err) {
            console.error('Error scrolling to bottom:', err);
        }
    }

    /**
     * Handle Enter key press
     */
    onKeyPress(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }
}
