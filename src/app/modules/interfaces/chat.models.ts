export interface ChatMessage {
    id?: string;
    usuario: string;
    timestamp: number;
    texto: string;
    imagem?: string; // URL or Base64 string
    channel: ChatChannel; // NEW
}

export enum ChatChannel {
    MEDICOS_GERAL = 'medicos-geral',
    PEDIATRIA = 'pediatria',
    CHAT_GERAL = 'chat-geral',
    LABORATORIO = 'laboratorio'
}

export interface ChatChannelInfo {
    id: ChatChannel;
    name: string;
    icon: string;
    color: string;
}

export interface ChatUser {
    usuario: string;
    cor: string;
}
