export interface ChatMessage {
    id?: string;
    usuario: string;
    timestamp: number;
    texto: string;
    imagem?: string; // URL or Base64 string
}

export interface ChatUser {
    usuario: string;
    cor: string;
}
