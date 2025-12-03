import { User } from './../../modules/interfaces/user.model';
import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../modules/services/chat.service';
import { AuthService } from '../../modules/services/auth.service';
import { ChatMessage, ChatChannel, ChatChannelInfo } from '../../modules/interfaces/chat.models';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chat.component.html',
    styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit, AfterViewChecked {
    @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
    @ViewChild('fileInput') private fileInput!: ElementRef;

    private chatService = inject(ChatService);
    private authService = inject(AuthService);

    // Signals
    messages = this.chatService.messages;
    currentChannel = this.chatService.currentChannel;
    channels = this.chatService.channels;

    newMessage: string = '';
    currentUser: User | null = null;
    selectedImage: File | null = null;
    imagePreview: string | null = null;
    isUploading: boolean = false;
    activeImageMenu: string | null = null; // NEW: for 3-dot menu

    private shouldScrollToBottom = false;

    constructor() {
        // Effect to handle scrolling when messages change
        effect(() => {
            const msgs = this.messages(); // Track dependency
            if (msgs.length > 0) {
                this.shouldScrollToBottom = true;
            }
        });
    }

    ngOnInit(): void {
        this.currentUser = this.authService.getCurrentUser();
        console.log(this.currentUser);
    }

    ngAfterViewChecked(): void {
        if (this.shouldScrollToBottom) {
            this.scrollToBottom();
            this.shouldScrollToBottom = false;
        }
    }

    get currentUserName(): string {
        return this.currentUser?.displayName || this.currentUser?.email || "user";
    }

    /**
     * Switch to a different channel
     */
    switchChannel(channel: ChatChannel): void {
        this.chatService.setCurrentChannel(channel);
    }

    /**
     * Get current channel info
     */
    get currentChannelInfo(): ChatChannelInfo | undefined {
        return this.chatService.getChannelInfo(this.currentChannel());
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
     * Delete a message
     */
    async deleteMessage(message: ChatMessage): Promise<void> {
        if (!message.id) return;

        if (confirm('Deseja realmente excluir esta mensagem?')) {
            try {
                await this.chatService.deleteMessage(message.id);
            } catch (error) {
                console.error('Error deleting message:', error);
                alert('Erro ao excluir mensagem.');
            }
        }
    }

    /**
     * Download image from message
     */
    downloadImage(message: ChatMessage): void {
        if (!message.imagem || !message.id) return;

        try {
            this.chatService.downloadImage(message.imagem, message.id);
        } catch (error) {
            console.error('Error downloading image:', error);
            alert('Erro ao fazer download da imagem.');
        }
    }

    /**
     * Toggle image menu
     */
    toggleImageMenu(messageId: string | null): void {
        this.activeImageMenu = this.activeImageMenu === messageId ? null : messageId;
    }

    /**
     * Check if current user can delete message
     */
    canDeleteMessage(message: ChatMessage): boolean {
        return message.usuario === this.currentUserName;
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

        // This week (1-6 days ago)
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        if (days > 0 && days < 7) {
            return `${days}d atrás`;
        }

        // Older than a week
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
