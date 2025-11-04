import { CarContract } from '@/types/contract';

interface PDFGeneratorOptions {
    filename?: string;
    language?: 'en' | 'ar' | 'he';
    format?: 'A4' | 'Letter';
    orientation?: 'portrait' | 'landscape';
}

export class ContractPDFGenerator {
    /**
     * Generate PDF from contract data using server-side Puppeteer
     */
    static async generateFromContract(contract: CarContract, options: PDFGeneratorOptions = {}): Promise<void> {
        const { filename = `contract-${contract.carPlateNumber}-${new Date().toISOString().split('T')[0]}.pdf`, language = 'en', format = 'A4', orientation = 'portrait' } = options;

        try {
            // Generate the contract HTML
            const contractHtml = await this.generateContractHTML(contract, language);

            // Call API to generate PDF
            const response = await fetch('/api/generate-contract-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contractHtml,
                    filename,
                    options: {
                        format,
                        orientation,
                        printBackground: true,
                        margins: {
                            top: '8mm',
                            right: '8mm',
                            bottom: '8mm',
                            left: '8mm',
                        },
                    },
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                let userFriendlyMessage = 'Failed to generate PDF';

                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.details && errorData.details.includes('Could not find Chrome')) {
                        userFriendlyMessage = 'PDF generation service is not available. Chrome browser is not installed on the server. Please contact the administrator.';
                    } else if (errorData.details) {
                        userFriendlyMessage = `PDF generation failed: ${errorData.details}`;
                    }
                } catch (e) {
                    // Error text is not JSON, use as is
                    if (errorText.includes('Chrome')) {
                        userFriendlyMessage = 'PDF generation service is not available. Chrome browser is not installed on the server. Please contact the administrator.';
                    } else {
                        userFriendlyMessage = `PDF generation failed: ${errorText}`;
                    }
                }

                throw new Error(userFriendlyMessage);
            }

            // Download the generated PDF
            const pdfBlob = await response.blob();
            this.downloadPDF(pdfBlob, filename);
        } catch (error) {
            console.error('Contract PDF generation failed:', error);
            throw error;
        }
    }

    /**
     * Download PDF blob to user's device
     */
    private static downloadPDF(pdfBlob: Blob, filename: string): void {
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Generate contract HTML for server-side PDF generation
     */
    private static async generateContractHTML(contract: CarContract, language: string): Promise<string> {
        // Get the template based on language
        let templateName: string;

        switch (language) {
            case 'ae':
                templateName = 'arabic';
                break;
            case 'he':
                templateName = 'hebrew';
                break;
            case 'en':
            default:
                templateName = 'english';
                break;
        }

        // Return a simple HTML structure that the server can render
        // The server will handle the actual template rendering
        return JSON.stringify({
            contract,
            template: templateName,
            language,
        });
    }
}
