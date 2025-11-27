import { Injectable } from '@angular/core';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { SecaoCenso, Leito, Paciente } from '../interfaces/censo.models';

@Injectable({
    providedIn: 'root'
})
export class ExcelExportService {

    constructor() { }


    // Exporta o censo hospitalar para Excel com formatação

    async exportCenso(secoes: SecaoCenso[]): Promise<void> {
        const workbook = new Workbook();

        workbook.creator = 'UPA System';
        workbook.created = new Date();
        workbook.modified = new Date();

        // Criar uma aba para cada seção
        for (const secao of secoes) {
            this.createSecaoSheet(workbook, secao);
        }

        // Gerar e salvar arquivo
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const fileName = `Censo_Hospitalar_${this.getFormattedDate()}.xlsx`;
        saveAs(blob, fileName);
    }

    /**
     * Cria uma planilha para cada seção
     */
    private createSecaoSheet(workbook: Workbook, secao: SecaoCenso): void {
        // Sanitize worksheet name to remove invalid characters: * ? : \ / [ ]
        const sanitizedTitle = secao.titulo.replace(/[\\/*?:[\]]/g, '-');

        const sheet = workbook.addWorksheet(sanitizedTitle, {
            properties: { tabColor: { argb: this.getColorArgb(secao.corHeader) } }
        });

        // Configurar largura das colunas
        sheet.columns = [
            { width: 10 },  // Leito
            { width: 30 },  // Nome
            { width: 8 },   // Idade
            { width: 12 },  // Data Admissão
            { width: 10 },  // Hora Admissão
            { width: 20 },  // Recurso
            { width: 35 },  // Suspeita Diagnóstica
            { width: 50 }   // Pendências
        ];

        // Cabeçalho do setor
        const headerRow = sheet.addRow([secao.titulo]);
        sheet.mergeCells('A1:H1');
        headerRow.height = 30;
        headerRow.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: this.getColorArgb(secao.corHeader) }
        };

        // Cabeçalho das colunas
        const columnHeaderRow = sheet.addRow([
            'Leito',
            'Nome do Paciente',
            'Idade',
            'Data Adm.',
            'Hora Adm.',
            'Recurso',
            'Suspeita Diagnóstica',
            'Pendências'
        ]);

        columnHeaderRow.height = 25;
        columnHeaderRow.font = { bold: true, size: 11 };
        columnHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
        columnHeaderRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5E7EB' }
        };

        // Adicionar bordas ao cabeçalho
        columnHeaderRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Adicionar dados dos leitos
        for (const leito of secao.leitos) {
            this.addLeitoRow(sheet, leito);
        }

        // Adicionar linha de resumo
        const totalLeitos = secao.leitos.length;
        const leitosOcupados = secao.leitos.filter(l => l.paciente !== null).length;
        const leitosDisponiveis = totalLeitos - leitosOcupados;

        sheet.addRow([]);
        const summaryRow = sheet.addRow([
            'RESUMO:',
            `Total: ${totalLeitos}`,
            `Ocupados: ${leitosOcupados}`,
            `Disponíveis: ${leitosDisponiveis}`,
            '', '', '', ''
        ]);

        summaryRow.font = { bold: true, size: 10 };
        summaryRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF3F4F6' }
        };
    }

    /**
     * Adiciona linha de leito
     */
    private addLeitoRow(sheet: any, leito: Leito): void {
        const paciente = leito.paciente;

        const row = sheet.addRow([
            leito.numero,
            paciente?.nome || 'VAGO',
            paciente?.idade || '',
            paciente?.dataAdmissao || '',
            paciente?.horaAdmissao || '',
            paciente?.recurso || '',
            paciente?.suspeitaDiagnostica || '',
            paciente?.pendencias || ''
        ]);

        row.height = 20;
        row.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

        // Se vago, deixar em cinza claro
        if (!paciente) {
            row.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF9FAFB' }
            };
            row.font = { italic: true, color: { argb: 'FF9CA3AF' } };
        }

        // Adicionar bordas
        row.eachCell((cell: any) => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
            };
        });
    }

    /**
     * Converte cor hex para ARGB
     */
    private getColorArgb(hex: string): string {
        // Remove # se houver
        hex = hex.replace('#', '');

        // Mapeia cores específicas
        const colorMap: { [key: string]: string } = {
            'fee2e2': 'FFFEE2E2', // Sala Vermelha
            'fce7f3': 'FFFCE7F3', // Enfermaria Feminina
            'dbeafe': 'FFDBEAFE', // Enfermaria Masculina
            'f3f4f6': 'FFF3F4F6'  // Extras/Corredor
        };

        return colorMap[hex.toLowerCase()] || `FF${hex}`;
    }

    /**
     * Retorna data formatada para nome do arquivo
     */
    private getFormattedDate(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');

        return `${year}${month}${day}_${hours}${minutes}`;
    }
}
