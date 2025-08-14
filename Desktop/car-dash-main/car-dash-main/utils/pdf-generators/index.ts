// Export all PDF generator types and utilities
export * from './types';
export * from './shared';

// Export individual PDF generators
export { generateGeneralBillPDF } from './general-bill';
export { generateTaxInvoicePDF } from './tax-invoice';
export { generateReceiptOnlyPDF } from './receipt-only';
export { generateTaxInvoiceReceiptPDF } from './tax-invoice-receipt';

// Main PDF generator function that routes to appropriate generator
import { BillData, PDFOptions, normalizeBillType } from './types';
import { generateGeneralBillPDF } from './general-bill';
import { generateTaxInvoicePDF } from './tax-invoice';
import { generateReceiptOnlyPDF } from './receipt-only';
import { generateTaxInvoiceReceiptPDF } from './tax-invoice-receipt';

/**
 * Main PDF generator function that routes to the appropriate generator based on bill type
 * @param billData - The bill data to generate PDF for
 * @param options - PDF generation options
 * @returns Promise<void>
 */
export const generateBillPDF = async (billData: BillData, options: PDFOptions = {}): Promise<void> => {
 

    // Normalize the bill type to handle various database formats
    const normalizedBillType = normalizeBillType(billData.bill_type);

    try {
        switch (normalizedBillType) {
            case 'general':
                await generateGeneralBillPDF(billData, options);
                break;

            case 'tax_invoice':
                await generateTaxInvoicePDF(billData, options);
                break;

            case 'receipt_only':
                await generateReceiptOnlyPDF(billData, options);
                break;

            case 'tax_invoice_receipt':
                await generateTaxInvoiceReceiptPDF(billData, options);
                break;

            default:
                throw new Error(`Unsupported bill type: ${billData.bill_type}`);
        }

        console.log(`Successfully generated PDF for bill type: ${billData.bill_type}`);
    } catch (error) {
        console.error(`Error generating PDF for bill type ${billData.bill_type}:`, error);
        throw error;
    }
};
