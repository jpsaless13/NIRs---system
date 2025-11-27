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

export interface PendenciaItem {
    pacienteId: string;
    pacienteNome: string;
    leitoNumero: number;
    texto: string;
    timestamp: Date;
}
