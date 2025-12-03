export enum SetorEnum {
    SALA_VERMELHA = 'Sala Vermelha',
    ENFERMARIA_FEMININA = 'Enfermaria Feminina',
    ENFERMARIA_MASCULINA = 'Enfermaria Masculina',
    EXTRAS_CORREDOR = 'Extras/Corredor'
}

export enum StatusPaciente {
    INTERNADO = 'Internado',
    ALTA = 'Alta',
    REGULADO = 'Regulado',
    AGUARDANDO_TRANSPORTE = 'Aguardando Transporte'
}

export interface Paciente {
    id: string;
    nome: string;
    idade: number;
    horaAdmissao: string;
    dataAdmissao: string;
    recurso: string;
    suspeitaDiagnostica: string;
    pendencias: string;
    status: StatusPaciente;
    destino?: string; // Para quando estiver aguardando transporte
    unidadeDestino?: string; // Para quando estiver regulado
    numeroRegulacao?: string;
}

export interface Leito {
    id: string;
    numero: number;
    setor: SetorEnum;
    paciente: Paciente | null;
}

export interface SecaoCenso {
    titulo: string;
    setor: SetorEnum;
    leitos: Leito[];
    corHeader: string;
}

export interface PendenciaGeral {
    id?: string;
    titulo: string;
    descricao: string;
    prioridade: 'baixa' | 'media' | 'alta';
    status: 'pendente' | 'concluida';
    timestamp: Date;
    destinatarioCargo?: string;
    criadoPor?: string;
}

export interface PendenciaPaciente {
    id?: string;
    pacienteId: string;
    pacienteNome: string;
    leitoNumero: number;
    texto: string;
    status: 'pendente' | 'concluida';
    timestamp: Date;
    destinatarioCargo?: string; // Cargo/Role that this pendency is for (e.g., 'Médico', 'Enfermeiro')
    criadoPor?: string; // Name of the user who created it
}

// Backwards compatibility alias
export type PendenciaItem = PendenciaPaciente;
