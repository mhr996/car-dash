/**
 * Format a number with thousands separators (commas)
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with thousands separators
 */
export const formatNumberWithCommas = (num: number | string | null | undefined, decimals: number = 2): string => {
    if (num === null || num === undefined || num === '') {
        return '0.00';
    }

    const numValue = typeof num === 'string' ? parseFloat(num) : num;

    if (isNaN(numValue)) {
        return '0.00';
    }

    return numValue.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
};

/**
 * Format a currency value with thousands separators and shekel sign
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export const formatCurrency = (num: number | string | null | undefined, decimals: number = 2): string => {
    return `₪${formatNumberWithCommas(num, decimals)}`;
};
