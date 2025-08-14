/**
 * Formats a date string or Date object to dd/mm/yyyy format
 */
export const formatDate = (dateInput: string | Date | null | undefined): string => {
    if (!dateInput) return '';

    try {
        const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        return date.toLocaleDateString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    } catch {
        return '';
    }
};

/**
 * Formats a date string or Date object to dd/mm/yyyy hh:mm format
 */
export const formatDateTime = (dateInput: string | Date | null | undefined): string => {
    if (!dateInput) return '';

    try {
        const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        return date.toLocaleDateString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '';
    }
};
