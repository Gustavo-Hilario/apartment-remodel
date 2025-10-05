/**
 * Currency formatting utilities
 */

export function formatCurrency(value) {
    return `S/ ${Math.round(value).toLocaleString('es-PE')}`;
}

export function parseCurrency(formattedValue) {
    return parseFloat(formattedValue.replace(/[^\d.-]/g, '')) || 0;
}
