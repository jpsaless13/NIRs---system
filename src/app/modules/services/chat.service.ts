import { Injectable, inject, signal, computed } from '@angular/core';
import { Firestore, collection, doc, setDoc, deleteDoc, query, orderBy, onSnapshot, where } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { ChatMessage, ChatChannel, ChatChannelInfo } from '../interfaces/chat.models';

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    // Signals state
    private _allMessages = signal<ChatMessage[]>([]);
    private _currentChannel = signal<ChatChannel>(ChatChannel.CHAT_GERAL);

    // Public signals
    readonly currentChannel = this._currentChannel.asReadonly();

    // Computed filtered messages based on current channel
    readonly messages = computed(() => {
        const allMsgs = this._allMessages();
        const channel = this._currentChannel();
        return allMsgs.filter(msg => (msg.channel || ChatChannel.CHAT_GERAL) === channel);
    });

    // Channel definitions
    readonly channels: ChatChannelInfo[] = [
        { id: ChatChannel.CHAT_GERAL, name: 'Chat Geral da Equipe', icon: 'groups', color: '#667eea' },
        { id: ChatChannel.MEDICOS_GERAL, name: 'Médicos Geral', icon: 'medical_services', color: '#f093fb' },
        { id: ChatChannel.PEDIATRIA, name: 'Pediatria', icon: 'child_care', color: '#4facfe' },
        { id: ChatChannel.LABORATORIO, name: 'Laboratório', icon: 'biotech', color: '#43e97b' }
    ];

    private auth = inject(Auth);
    private firestore = inject(Firestore);

    constructor() {
        this.initMessagesListener();
    }

    /**
     * Switch to a different channel
     */
    setCurrentChannel(channel: ChatChannel): void {
        this._currentChannel.set(channel);
    }

    /**
     * Get channel info by ID
     */
    getChannelInfo(channelId: ChatChannel): ChatChannelInfo | undefined {
        return this.channels.find(c => c.id === channelId);
    }

    //inicializa as msgs em tempo real de acordo com a base de dados do firestone
    private initMessagesListener() {
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                const messagesCollection = collection(this.firestore, 'messages');
                const q = query(messagesCollection, orderBy('timestamp', 'asc'));

                // updates em tempo real
                onSnapshot(q, (snapshot) => {
                    const messages = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            channel: data['channel'] || ChatChannel.CHAT_GERAL, // Default to chat geral
                            timestamp: data['timestamp']?.toDate ? data['timestamp'].toDate() : new Date(data['timestamp'])
                        } as ChatMessage;
                    });
                    this._allMessages.set(messages);
                }, (error) => {
                    console.error('Error in ChatService listener:', error);
                });
            } else {
                this._allMessages.set([]);
            }
        });
    }

    // envia mensagem de text
    async sendMessage(usuario: string, texto: string): Promise<void> {
        const message: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            usuario,
            texto,
            timestamp: Date.now(),
            channel: this._currentChannel()
        };

        await this.addMessageToFirestore(message);
    }

    // envia imagem
    async sendMessageWithImage(usuario: string, texto: string, imageFile: File): Promise<void> {
        try {
            const base64Image = await this.fileToBase64(imageFile);

            const message: ChatMessage = {
                id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                usuario,
                texto,
                imagem: base64Image,
                timestamp: Date.now(),
                channel: this._currentChannel()
            };

            await this.addMessageToFirestore(message);
        } catch (error) {
            console.error('Error processing image:', error);
            throw error;
        }
    }

    /**
     * Delete a message
     */
    async deleteMessage(messageId: string): Promise<void> {
        try {
            const messageRef = doc(this.firestore, `messages/${messageId}`);
            await deleteDoc(messageRef);
        } catch (error) {
            console.error('Error deleting message:', error);
            throw error;
        }
    }

    /**
     * Download image from message
     */
    downloadImage(imageData: string, messageId: string): void {
        try {
            // Convert base64 to blob
            const base64Data = imageData.split(',')[1]; // Remove data:image/...;base64, prefix
            const mimeType = imageData.split(';')[0].split(':')[1]; // Extract MIME type

            // Decode base64 to binary
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);

            // Create blob
            const blob = new Blob([byteArray], { type: mimeType });

            // Create blob URL
            const blobUrl = URL.createObjectURL(blob);

            // Create temporary link and trigger download
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `chat-imagem-${messageId}.${this.getFileExtension(mimeType)}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up blob URL
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        } catch (error) {
            console.error('Error downloading image:', error);
            throw error;
        }
    }

    /**
     * Get file extension from MIME type
     */
    private getFileExtension(mimeType: string): string {
        const extensions: { [key: string]: string } = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'image/svg+xml': 'svg'
        };
        return extensions[mimeType] || 'png';
    }

    //gera cor para usuário baseado no hash de forma aleatória
    getUserColor(usuario: string): string {
        const colors = [
            '#3b82f6', // blue
            '#10b981', // green
            '#f59e0b', // amber
            '#ef4444', // red
            '#8b5cf6', // purple
            '#ec4899', // pink
            '#14b8a6', // teal
            '#f97316'  // orange
        ];

        let hash = 0;
        for (let i = 0; i < usuario.length; i++) {
            hash = usuario.charCodeAt(i) + ((hash << 5) - hash);
        }

        return colors[Math.abs(hash) % colors.length];
    }


    // TODO// limpar todas mensagens função a ser implementada quando o usuário for admin
    async clearAllMessages(): Promise<void> {

        console.warn('Clear all messages should be implemented with Firestore batch delete or Cloud Function');
    }

    //ADICIONA A MSG no firestone
    private async addMessageToFirestore(message: ChatMessage): Promise<void> {
        const messageRef = doc(this.firestore, `messages/${message.id}`);
        await setDoc(messageRef, message);
    }

    // converte para base 64
    private fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    }
}
