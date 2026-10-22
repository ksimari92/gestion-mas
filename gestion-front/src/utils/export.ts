import { Expense } from '../types';
import { CATEGORY_LABELS, SOURCE_LABELS } from '../constants/expenses';

const COLUMNS: { header: string; value: (expense: Expense) => string | number }[] = [
    { header: 'Fecha', value: (e) => e.expense_date },
    { header: 'Proyecto', value: (e) => e.project_name ?? '' },
    { header: 'Etapa', value: (e) => e.stage_name ?? '' },
    { header: 'Categoría', value: (e) => CATEGORY_LABELS[e.category] ?? e.category },
    { header: 'Descripción', value: (e) => e.description },
    { header: 'Detalle', value: (e) => e.detail ?? '' },
    { header: 'Proveedor', value: (e) => e.supplier ?? '' },
    { header: 'Cantidad', value: (e) => e.quantity ?? '' },
    { header: 'Unidad', value: (e) => e.unit ?? '' },
    { header: 'Precio unitario', value: (e) => e.unit_cost ?? '' },
    { header: 'Total', value: (e) => e.amount },
    { header: 'Origen', value: (e) => SOURCE_LABELS[e.payment_source] ?? e.payment_source },
    { header: 'Comprobante Nº', value: (e) => e.invoice_number ?? '' },
    { header: 'Registró', value: (e) => e.registered_by },
];

const escapeCell = (value: string | number) => {
    const text = String(value ?? '');
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * Exporta la planilla a CSV con separador `;` y BOM, que es lo que Excel
 * en español abre sin pedir configuración de importación.
 */
export const exportExpensesToCsv = (expenses: Expense[], filename: string) => {
    const header = COLUMNS.map((c) => c.header).join(';');
    const rows = expenses.map((expense) =>
        COLUMNS.map((column) => escapeCell(column.value(expense))).join(';')
    );
    const total = expenses.reduce((acc, e) => acc + e.amount, 0);
    const totalRow = COLUMNS.map((c) => (c.header === 'Total' ? total : c.header === 'Descripción' ? 'TOTAL' : '')).join(';');

    const csv = ['﻿' + header, ...rows, totalRow].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
