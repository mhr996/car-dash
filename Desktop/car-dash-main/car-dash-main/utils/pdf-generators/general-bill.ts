import { generatePDFFromElement } from '../pdf-generator';
import { BillData, PDFOptions } from './types';
import { getTranslationFunction, formatCurrency, formatDate, createTempContainer, getBaseHTML } from './shared';

export const generateGeneralBillPDF = async (billData: BillData, options: PDFOptions = {}): Promise<void> => {
    const { filename = `general-bill-${billData.id}.pdf`, language = 'he' } = options;

    console.log('=== General Bill PDF Generation ===');
    console.log('Bill ID:', billData.id);
    console.log('Amount:', billData.bill_amount);
    console.log('Description:', billData.bill_description);

    try {
        const tempContainer = createTempContainer('temp-general-bill-container');
        const t = getTranslationFunction(language);

        const content = `
            <div style="margin: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px;">
                    <div>
                        <h2 style="color: #1a2941; font-size: 24px; font-weight: bold; margin-bottom: 10px;">
                            ${t('generalBill')}
                        </h2>
                        <p style="color: #666; font-size: 14px;">
                            ${t('billNumber')}: ${billData.id}
                        </p>
                        <p style="color: #666; font-size: 14px;">
                            ${t('date')}: ${formatDate(new Date().toISOString(), language)}
                        </p>
                    </div>
                </div>

                <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
                    <h3 style="color: #1a2941; font-size: 18px; margin-bottom: 15px; text-align: center;">
                        ${t('billDetails')}
                    </h3>
                    <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="margin-bottom: 15px;">
                            <strong style="color: #1a2941;">${t('description')}:</strong>
                            <span style="margin-left: 10px; color: #333;">${billData.bill_description || t('noDescription')}</span>
                        </div>
                        <div style="margin-bottom: 15px;">
                            <strong style="color: #1a2941;">${t('amount')}:</strong>
                            <span style="margin-left: 10px; color: #333; font-size: 18px; font-weight: bold;">
                                ${formatCurrency(billData.bill_amount || 0)}
                            </span>
                        </div>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: end; border-top: 2px solid #1a2941; padding-top: 20px;">
                    <div>
                        <div style="font-size: 14px; color: #666;">
                            ${t('totalAmount')}
                        </div>
                        <div style="font-size: 24px; color: #1a2941; font-weight: bold;">
                            ${formatCurrency(billData.bill_amount || 0)}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 14px; color: #666;">
                            ${t('dateLabel')}: ${formatDate(new Date().toISOString(), language)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        const billHTML = await getBaseHTML(language).then((html) => html.replace('{{DOCUMENT_TITLE}}', 'فاتورة - Invoice').replace('{{CONTENT}}', content));

        tempContainer.innerHTML = billHTML;
        document.body.appendChild(tempContainer);

        await generatePDFFromElement('temp-general-bill-container', {
            filename,
            orientation: 'portrait',
            ...options,
        });

        document.body.removeChild(tempContainer);
    } catch (error) {
        console.error('Error generating general bill PDF:', error);
        throw new Error('Failed to generate general bill PDF');
    }
};
