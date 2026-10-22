const currencyFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});

export const formatCurrency = (value: number | null | undefined) =>
    value == null ? '' : currencyFormatter.format(value);

/** Como formatCurrency pero sin el símbolo, para columnas de planilla. */
export const formatAmount = (value: number | null | undefined) =>
    value == null ? '' : numberFormatter.format(value);

export const formatNumber = (value: number | null | undefined) =>
    value == null ? '' : numberFormatter.format(value);

/** 'YYYY-MM-DD' → '15/08/26'. Compacto, para la grilla. */
export const formatDateShort = (value: string | null | undefined) => {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year.slice(2)}`;
};

/** 'YYYY-MM-DD' → '15 ago 2026'. Para vistas con más espacio. */
export const formatDateLong = (value: string | null | undefined) => {
    if (!value) return '';
    return new Date(`${value}T12:00:00`).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

export const todayISO = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

/**
 * Acepta lo que se tipea en una celda numérica: '1.200,50', '1200.50', '1200'.
 * Devuelve null si no hay número.
 */
export const parseNumberInput = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (trimmed === '') return null;

    let normalized = trimmed.replace(/\s/g, '').replace(/\$/g, '');
    const hasComma = normalized.includes(',');
    const hasDot = normalized.includes('.');

    if (hasComma && hasDot) {
        // Formato es-AR: el punto es separador de miles, la coma decimal.
        normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
        normalized = normalized.replace(',', '.');
    } else if (hasDot) {
        // Un punto con exactamente 3 dígitos detrás es separador de miles: '1.200'.
        const parts = normalized.split('.');
        if (parts.length > 2 || (parts[1] && parts[1].length === 3)) {
            normalized = normalized.replace(/\./g, '');
        }
    }

    const parsed = Number(normalized);
    return isNaN(parsed) ? null : parsed;
};

/**
 * Acepta fechas tipeadas como '15/8', '15/08/26', '15-08-2026' o ISO.
 * Devuelve 'YYYY-MM-DD' o null.
 */
export const parseDateInput = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (trimmed === '') return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    const parts = trimmed.split(/[/\-.]/).filter(Boolean);
    if (parts.length < 2) return null;

    const day = Number(parts[0]);
    const month = Number(parts[1]);
    let year = parts[2] ? Number(parts[2]) : new Date().getFullYear();

    if (parts[2] && parts[2].length <= 2) year = 2000 + year;
    if (!day || !month || day > 31 || month > 12) return null;

    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
