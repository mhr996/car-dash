import { generatePDFFromElement } from '../pdf-generator';
import { BillData, PDFOptions } from './types';
import { getTranslationFunction, formatCurrency, formatDate, createTempContainer, getBaseHTML, generateDocumentInfoSection, generateSignatureSection } from './shared';

export const generateTaxInvoicePDF = async (billData: BillData, options: PDFOptions = {}): Promise<void> => {
    const { filename = `tax-invoice-${billData.id}.pdf`, language = 'he' } = options;


    console.log('billData:', billData);

    try {
        const tempContainer = createTempContainer('temp-tax-invoice-container');
        const t = getTranslationFunction(language);

        // Calculate financial data
        const carBuyPrice = billData.deal?.car?.buy_price || 0;
        const carSalePrice = billData.deal?.car?.sale_price || 0;
        const commission = billData.commission || 0;
        const loss = billData.deal?.loss_amount || 0;
        const preTaxTotal = billData.total || 0;
        const taxAmount = billData.tax_amount || 0;
        const totalWithTax = billData.total_with_tax || 0;

        // Car details
        const carInfo = billData.deal?.car ? `${billData.deal.car.make || ''} ${billData.deal.car.model || ''} ${billData.deal.car.year || ''}`.trim() : billData.car_details || t('notAvailable');

        const documentInfoSection = generateDocumentInfoSection(t, billData);

        const customTRStyle = `
          display: flex;
          justify-content: space-between;
          align-items: center;
        `;

        const carDetailsTable = `
            <div class="table-container">
                <table>
                    <thead> 
                        <tr style="${customTRStyle}">
                            <th>${t('label')}</th>
                            <th>${t('value')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="${customTRStyle}">
                            <td>${t('carDetails')}</td>
                            <td style="direction: ltr;">${carInfo}</td>
                        </tr>
                        <tr style="${customTRStyle}">
                            <td>${t('buyPrice')}</td>
                            <td>${formatCurrency(carBuyPrice)}</td>
                        </tr>
                        <tr style="${customTRStyle}">
                            <td>${t('salePrice')}</td>
                            <td>${formatCurrency(carSalePrice)}</td>
                        </tr>
                          ${
                              loss > 0
                                  ? `<tr style="${customTRStyle}">
                                    <td>${t('loss')}</td>
                                    <td>${formatCurrency(loss)}</td>
                                  </tr>`
                                  : ''
                          }
                        <tr style="${customTRStyle}">
                            <td>${t('commission')}</td>
                            <td>${formatCurrency(totalWithTax)}</td>
                        </tr> 
                      
                        <tr style="${customTRStyle}">
                            <td>${t('preTaxTotal')}</td>
                            <td>${formatCurrency(preTaxTotal)}</td>
                        </tr>
                        <tr style="${customTRStyle}">
                            <td>${t('taxAmount')} (18%)</td>
                            <td>${formatCurrency(taxAmount)}</td>
                        </tr>
                        <tr style="${customTRStyle}">
                            <td style="font-weight: bold;">${t('totalWithTax')}</td>
                            <td style="font-weight: bold;">${formatCurrency(totalWithTax)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        const signatureSection = generateSignatureSection(t);

        const content = `
            ${documentInfoSection}
            ${carDetailsTable}
            ${signatureSection}
        `;

        const billHTML = await getBaseHTML(language).then((html) => html.replace('{{DOCUMENT_TITLE}}', 'فاتورة ضريبية - Tax Invoice').replace('{{CONTENT}}', content));

        tempContainer.innerHTML = billHTML;
        document.body.appendChild(tempContainer);

        console.log('Generating PDF for tax invoice...');
        await generatePDFFromElement('temp-tax-invoice-container', {
            filename,
            orientation: 'portrait',
            ...options,
        });

        document.body.removeChild(tempContainer);
        console.log(`Tax invoice PDF generated: ${filename}`);
    } catch (error) {
        console.error('Error generating tax invoice PDF:', error);
        throw error;
    }
};
