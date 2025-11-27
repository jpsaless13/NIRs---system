import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Firestore, collection, doc, setDoc, query, orderBy, onSnapshot } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { ChatMessage } from '../interfaces/chat.models';

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);

    private auth = inject(Auth);


    constructor(private firestore: Firestore) {
        this.initMessagesListener();
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
                            timestamp: data['timestamp']?.toDate ? data['timestamp'].toDate() : new Date(data['timestamp'])
                        } as ChatMessage;
                    });
                    this.messagesSubject.next(messages);
                }, (error) => {
                    console.error('Error in ChatService listener:', error);
                });
            } else {// Use onSnapshot for robust real-time updates without injection context issues
                this.messagesSubject.next([]);
            }
        });
    }

    // pega todas mensagens
    getMessages(): Observable<ChatMessage[]> {
        return this.messagesSubject.asObservable();
    }

    // envia mensagem de text
    async sendMessage(usuario: string, texto: string): Promise<void> {
        const message: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            usuario,
            texto,
            timestamp: Date.now()
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
                timestamp: Date.now()
            };

            await this.addMessageToFirestore(message);
        } catch (error) {
            console.error('Error processing image:', error);
            throw error;
        }
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
