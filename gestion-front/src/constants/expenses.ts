import { ExpenseCategory, PaymentSource } from '../types';

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
    insumos: 'Insumos',
    logistica: 'Logística',
    servicios: 'Servicios',
    alquiler: 'Alquiler',
    mantenimiento: 'Mantenimiento',
    personal: 'Personal',
    impuestos: 'Impuestos',
    otro: 'Otro',
};

/** Etiqueta larga, para formularios donde hay espacio. */
export const CATEGORY_LONG_LABELS: Record<ExpenseCategory, string> = {
    insumos: 'Insumos / Materias primas',
    logistica: 'Logística / Flete',
    servicios: 'Servicios',
    alquiler: 'Alquiler',
    mantenimiento: 'Mantenimiento',
    personal: 'Personal',
    impuestos: 'Impuestos',
    otro: 'Otro',
};

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
    insumos: '🛍️',
    logistica: '🚛',
    servicios: '⚡',
    alquiler: '🏠',
    mantenimiento: '🔧',
    personal: '👷',
    impuestos: '📋',
    otro: '📦',
};

export const SOURCE_LABELS: Record<PaymentSource, string> = {
    caja_chica: 'Caja chica',
    banco: 'Banco',
    personal: 'Pago personal',
};

export const CATEGORY_OPTIONS = (Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((value) => ({
    value,
    label: CATEGORY_LABELS[value],
}));

export const SOURCE_OPTIONS = (Object.keys(SOURCE_LABELS) as PaymentSource[]).map((value) => ({
    value,
    label: SOURCE_LABELS[value],
}));

/** Unidades sugeridas en la planilla. El campo es libre: se puede escribir cualquiera. */
export const UNIT_SUGGESTIONS = ['kg', 'tn', 'lt', 'bolsa', 'unidad', 'ha', 'hora', 'jornal', 'viaje', 'mes'];

/** Valores con los que arranca una fila nueva en la planilla. */
export const DEFAULT_CATEGORY: ExpenseCategory = 'insumos';
export const DEFAULT_SOURCE: PaymentSource = 'caja_chica';

/** Paleta rotativa para distinguir etapas visualmente. */
export const STAGE_COLORS = [
    '#1B4332', '#D97706', '#0369A1', '#7C3AED',
    '#BE123C', '#0F766E', '#A16207', '#4338CA',
];

export const stageColor = (index: number) => STAGE_COLORS[index % STAGE_COLORS.length];
