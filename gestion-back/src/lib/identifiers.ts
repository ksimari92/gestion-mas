/**
 * Validación de identificadores fiscales y sanitarios argentinos.
 *
 * Esta lógica está duplicada en gestion-front/src/utils/identifiers.ts para
 * dar feedback inmediato al tipear; el backend es la fuente de verdad y
 * revalida siempre. Si cambia una, cambiar la otra.
 */

/** Deja sólo los dígitos: el usuario puede escribir con guiones o sin ellos. */
export const digitsOnly = (value: string) => value.replace(/\D/g, '');

/**
 * CUIT/CUIL: 11 dígitos con verificador módulo 11.
 * El estándar es cerrado, así que un CUIT que no valida es casi siempre un tipeo.
 */
export const isValidCuit = (value: string): boolean => {
    const digits = digitsOnly(value);
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false; // 00000000000 y similares

    const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, weight, i) => acc + weight * Number(digits[i]), 0);

    let checkDigit = 11 - (sum % 11);
    if (checkDigit === 11) checkDigit = 0;
    if (checkDigit === 10) return false;

    return checkDigit === Number(digits[10]);
};

/** Normaliza a `NN-NNNNNNNN-N`. Devuelve el original si no tiene 11 dígitos. */
export const formatCuit = (value: string): string => {
    const digits = digitsOnly(value);
    if (digits.length !== 11) return value.trim();
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
};

/**
 * RENSPA: `PP.DDD.T.EEEEE/OO` (provincia, departamento, titular,
 * establecimiento y orden). Se valida la forma, no la existencia: sólo SENASA
 * puede confirmar que el registro exista.
 */
const RENSPA_PATTERN = /^\d{2}\.\d{3}\.\d\.\d{5}(\/\d{2})?$/;

export const isValidRenspaFormat = (value: string): boolean => RENSPA_PATTERN.test(value.trim());

/** Arma el formato con puntos cuando llegan sólo los dígitos. */
export const formatRenspa = (value: string): string => {
    const trimmed = value.trim();
    if (RENSPA_PATTERN.test(trimmed)) return trimmed;

    const digits = digitsOnly(trimmed);
    if (digits.length === 11 || digits.length === 13) {
        const base = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 6)}.${digits.slice(6, 11)}`;
        return digits.length === 13 ? `${base}/${digits.slice(11, 13)}` : base;
    }
    return trimmed;
};
