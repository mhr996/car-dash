import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Re-export the new modular PDF generators
export { generateBillPDF, generateGeneralBillPDF, generateTaxInvoicePDF, generateReceiptOnlyPDF, generateTaxInvoiceReceiptPDF, type BillData, type PDFOptions } from './pdf-generators';

// Re-export with alias for backward compatibility
export { generateReceiptOnlyPDF as generateReceiptPDF } from './pdf-generators';

// Legacy interface for backward compatibility
interface LegacyPDFOptions {
    filename?: string;
    orientation?: 'portrait' | 'landscape';
    format?: 'a4' | 'letter';
    language?: 'en' | 'he' | 'ar';
}

/**
 * Generate PDF from HTML element
 * @param elementId - The ID of the HTML element to convert to PDF
 * @param options - PDF generation options
 * @returns Promise<void>
 */
export const generatePDFFromElement = async (elementId: string, options: LegacyPDFOptions = {}): Promise<void> => {
    const { filename = 'document.pdf', orientation = 'portrait', format = 'a4' } = options;

    try {
        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error(`Element with ID '${elementId}' not found`);
        }

        // Show element temporarily if hidden
        const originalDisplay = element.style.display;
        const originalVisibility = element.style.visibility;
        element.style.display = 'block';
        element.style.visibility = 'visible';

        // Apply print styles before generating canvas
        const printStyle = document.createElement('style');
        printStyle.textContent = `
            #${elementId} input[type="checkbox"] {
                margin-top: 25px !important;
            }
            .pdf-header {
                width: 100%;
                padding: 32px 40px;
                margin-bottom: 40px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #eaeaea;
            }
            .pdf-header-left {
                display: flex;
                align-items: center;
                gap: 24px;
            }
            .pdf-header-right {
                text-align: right;
                font-size: 12px;
                color: #666;
            }
            .pdf-logo {
                width: 80px;
                height: 80px;
                object-fit: contain;
            }
            .company-info h1 {
                margin: 0 0 8px 0;
                font-size: 28px;
                font-weight: bold;
                color: #1f2937;
            }
            .company-info p {
                margin: 4px 0;
                font-size: 14px;
                color: #666;
            }
            .pdf-content {
                padding: 0 40px 40px 40px;
            }
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 40px;
                margin-bottom: 40px;
            }
            .info-section h3 {
                margin: 0 0 16px 0;
                font-size: 18px;
                font-weight: 600;
                color: #1f2937;
                border-bottom: 2px solid #3b82f6;
                padding-bottom: 8px;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #f3f4f6;
            }
            .info-row:last-child {
                border-bottom: none;
            }
            .info-label {
                font-weight: 500;
                color: #374151;
                min-width: 120px;
            }
            .info-value {
                color: #1f2937;
                text-align: right;
                flex: 1;
            }
            .financial-table {
                width: 100%;
                border-collapse: collapse;
                margin: 24px 0;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                overflow: hidden;
            }
            .financial-table th {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                padding: 16px;
                text-align: right;
                font-weight: 600;
                font-size: 16px;
            }
            .financial-table td {
                padding: 16px;
                text-align: right;
                border-bottom: 1px solid #e5e7eb;
                font-size: 15px;
            }
            .financial-table tr:last-child td {
                border-bottom: none;
            }
            .financial-table tr:nth-child(even) {
                background-color: #f9fafb;
            }
            .total-row {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
                color: white;
                font-weight: bold;
                font-size: 16px;
            }
            .signature-section {
                margin-top: 60px;
                padding-top: 40px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
            }
            .signature-line {
                border-bottom: 2px solid #374151;
                width: 200px;
                margin-bottom: 8px;
                text-align: center;
                padding-bottom: 4px;
            }
        `;
        document.head.appendChild(printStyle);

        // Generate canvas with higher quality settings
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: element.offsetWidth,
            height: element.offsetHeight,
        });

        // Create PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation,
            unit: 'mm',
            format,
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 0;

        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

        // Save the PDF
        pdf.save(filename);

        // Restore original styles
        element.style.display = originalDisplay;
        element.style.visibility = originalVisibility;
        document.head.removeChild(printStyle);
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw new Error('Failed to generate PDF from element');
    }
};

/**
 * Generate PDF from order data using a receipt template
 * @param orderData - The order data to generate PDF for
 * @param options - PDF generation options
 * @returns Promise<void>
 */
export const generateOrderReceiptPDF = async (orderData: any, options: LegacyPDFOptions = {}): Promise<void> => {
    const { filename = `order-${orderData.id}-receipt.pdf` } = options;

    try {
        // Create a temporary container for the receipt
        const tempContainer = document.createElement('div');
        tempContainer.id = 'temp-receipt-container';
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '-9999px';
        tempContainer.style.width = '600px';
        tempContainer.style.padding = '40px';
        tempContainer.style.backgroundColor = '#ffffff';
        tempContainer.style.fontFamily = 'Arial, sans-serif';

        // Create receipt HTML
        const receiptHTML = `
            <div style="max-width: 600px; margin: 0 auto; padding: 40px; background: white;">
                <div style="text-align: center; margin-bottom: 40px;">
                    <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Order Receipt</p>
                </div>
                
                <div style="border: 2px solid #eee; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                    <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #333;">Order Details</h2>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div><strong>Order ID:</strong> ${orderData.id}</div>
                        <div><strong>Date:</strong> ${new Date(orderData.created_at).toLocaleDateString('en-GB', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                        })}</div>
                        <div><strong>Customer:</strong> ${orderData.customer_name}</div>
                        <div><strong>Status:</strong> ${orderData.status}</div>
                    </div>
                </div>
                
                <div style="border: 2px solid #eee; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                    <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #333;">Items</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid #eee;">
                                <th style="text-align: left; padding: 10px; font-weight: bold;">Item</th>
                                <th style="text-align: right; padding: 10px; font-weight: bold;">Quantity</th>
                                <th style="text-align: right; padding: 10px; font-weight: bold;">Price</th>
                                <th style="text-align: right; padding: 10px; font-weight: bold;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(orderData.items || [])
                                .map(
                                    (item: any) => `
                                <tr style="border-bottom: 1px solid #f0f0f0;">
                                    <td style="padding: 10px;">${item.name}</td>
                                    <td style="padding: 10px; text-align: right;">${item.quantity}</td>
                                    <td style="padding: 10px; text-align: right;">$${item.price.toFixed(2)}</td>
                                    <td style="padding: 10px; text-align: right;">$${(item.quantity * item.price).toFixed(2)}</td>
                                </tr>
                            `,
                                )
                                .join('')}
                        </tbody>
                    </table>
                </div>
                
                <div style="text-align: right; margin-bottom: 40px;">
                    <div style="font-size: 18px; font-weight: bold; color: #333;">
                        Total: $${orderData.total || '0.00'}
                    </div>
                </div>
                
                <div style="border-top: 2px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 12px;">
                    <p>Thank you for your business!</p>
                    <p>Generated on ${new Date().toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                    })}</p>
                </div>
            </div>
        `;

        tempContainer.innerHTML = receiptHTML;
        document.body.appendChild(tempContainer);

        // Generate PDF from the temporary container
        await generatePDFFromElement('temp-receipt-container', {
            filename,
            ...options,
        });

        // Clean up
        document.body.removeChild(tempContainer);
    } catch (error) {
        console.error('Error generating order receipt PDF:', error);
        throw new Error('Failed to generate order receipt PDF');
    }
};

/**
 * Print element directly (browser print dialog)
 * @param elementId - The ID of the HTML element to print
 */
export const printElement = (elementId: string): void => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with ID '${elementId}' not found`);
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        console.error('Could not open print window');
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                @media print {
                    body { margin: 0; }
                }
            </style>
        </head>
        <body>
            ${element.outerHTML}
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.print();
    printWindow.close();
};
