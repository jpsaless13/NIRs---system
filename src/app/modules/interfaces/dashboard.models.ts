export interface Aviso {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'critico' | 'info' | 'sucesso';
  data: Date;
}

export interface Kpi {
  name: string;
  titulo: string;
  valor: string | number;
  cor: 'blue' | 'green' | 'red' | 'orange' | 'purple';
}
