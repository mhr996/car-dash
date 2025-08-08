import { generatePDFFromElement } from '../pdf-generator';
import { BillData, PDFOptions } from './types';
import { getTranslationFunction, formatCurrency, formatDate, createTempContainer, getBaseHTML, generateDocumentInfoSection, generateSignatureSection } from './shared';

// Define bill payment interface for fetched data
interface BillPayment {
    id: string | number;
    payment_type: 'cash' | 'visa' | 'bank_transfer' | 'check';
    amount: number;
    visa_installments?: number;
    visa_card_type?: string;
    visa_last_four?: string;
    approval_number?: string;
    bank_name?: string;
    bank_branch?: string;
    transfer_amount?: number;
    transfer_bank_name?: string;
    transfer_branch?: string;
    transfer_account_number?: string;
    transfer_branch_number?: string;
    transfer_number?: string;
    transfer_holder_name?: string;
    check_bank_name?: string;
    check_branch?: string;
    check_branch_number?: string;
    check_account_number?: string;
    check_number?: string;
    check_holder_name?: string;
    created_at?: string;
}

export const generateTaxInvoiceReceiptPDF = async (billData: BillData, options: PDFOptions = {}): Promise<void> => {
    const { filename = `tax-invoice-receipt-${billData.id}.pdf`, language = 'he' } = options;

    console.log('=== Tax Invoice & Receipt PDF Generation ===');
    console.log('Bill ID:', billData.id);
    console.log('billData:', billData);

    try {
        // Fetch bill payments from database
        let billPayments: BillPayment[] = [];
        try {
            const supabase = (await import('../../lib/supabase.js')).default;
            const { data: paymentsData, error } = await supabase.from('bill_payments').select('*').eq('bill_id', billData.id).order('created_at', { ascending: true });

            if (error) {
                console.warn('Failed to fetch bill payments:', error.message);
            } else if (paymentsData) {
                billPayments = paymentsData;
                console.log('Fetched bill payments:', billPayments);
            }
        } catch (dbError) {
            console.warn('Error connecting to database for bill payments:', dbError);
        }

        const tempContainer = createTempContainer('temp-tax-invoice-receipt-container');
        const t = getTranslationFunction(language);

        // Calculate financial data
        const carBuyPrice = billData.deal?.car?.buy_price || 0;
        const carSalePrice = billData.deal?.car?.sale_price || 0;
        const commission = billData.commission || 0;
        const loss = carBuyPrice > carSalePrice ? carBuyPrice - carSalePrice : 0;
        const preTaxTotal = billData.total || 0;
        const taxAmount = billData.tax_amount || 0;
        const totalWithTax = billData.total_with_tax || 0;

        // Calculate payment data from fetched bill_payments or fallback to legacy fields
        let paidAmount = 0;
        let paymentRows = '';

        if (billPayments && billPayments.length > 0) {
            // Use fetched bill_payments data
            paidAmount = billPayments.reduce((sum, payment) => sum + payment.amount, 0);

            paymentRows = billPayments
                .map((payment) => {
                    let paymentDetails = '';

                    switch (payment.payment_type) {
                        case 'visa':
                            paymentDetails = [
                                payment.visa_card_type && `${t('cardType')}: ${payment.visa_card_type}`,
                                payment.visa_last_four && `${t('lastFourDigits')}: ${payment.visa_last_four}`,
                                payment.approval_number && `${t('approvalCode')}: ${payment.approval_number}`,
                                payment.visa_installments && `${t('installments')}: ${payment.visa_installments}`,
                            ]
                                .filter(Boolean)
                                .join(' | ');
                            break;
                        case 'bank_transfer':
                            paymentDetails = [
                                payment.bank_name && `${t('bankName')}: ${payment.bank_name}`,
                                payment.bank_branch && `${t('branchName')}: ${payment.bank_branch}`,
                                payment.transfer_account_number && `${t('accountNumber')}: ${payment.transfer_account_number}`,
                                payment.transfer_number && `${t('transferNumber')}: ${payment.transfer_number}`,
                                payment.transfer_holder_name && `${t('accountHolder')}: ${payment.transfer_holder_name}`,
                            ]
                                .filter(Boolean)
                                .join(' | ');
                            break;
                        case 'check':
                            paymentDetails = [
                                payment.check_bank_name && `${t('bankName')}: ${payment.check_bank_name}`,
                                payment.check_branch && `${t('branchName')}: ${payment.check_branch}`,
                                payment.check_number && `${t('checkNumber')}: ${payment.check_number}`,
                                payment.check_holder_name && `${t('accountHolder')}: ${payment.check_holder_name}`,
                            ]
                                .filter(Boolean)
                                .join(' | ');
                            break;
                        case 'cash':
                        default:
                            paymentDetails = t('cashPayment');
                            break;
                    }

                    return `
                    <tr>
                        <td>${t(`payment_${payment.payment_type}`) || payment.payment_type}</td>
                        <td>${formatCurrency(payment.amount || 0)}</td>
                        <td>${formatDate(payment.created_at || billData.created_at)}</td>
                        <td>${paymentDetails || '-'}</td>
                    </tr>
                `;
                })
                .join('');
        } else {
            // Fallback to legacy payment fields
            paidAmount = (billData.cash_amount || 0) + (billData.visa_amount || 0) + (billData.bank_amount || 0) + (billData.check_amount || 0);

            // Create rows for non-zero legacy payments
            const legacyPayments = [
                { type: 'cash', amount: billData.cash_amount, details: t('cashPayment') },
                { type: 'visa', amount: billData.visa_amount, details: t('payment_visa') },
                { type: 'bank_transfer', amount: billData.bank_amount, details: `${t('bankName')}: ${billData.bank_name || ''} | ${t('branchName')}: ${billData.bank_branch || ''}` },
                { type: 'check', amount: billData.check_amount, details: t('payment_check') },
            ].filter((p) => p.amount && p.amount > 0);

            paymentRows = legacyPayments
                .map(
                    (payment) => `
                <tr>
                    <td>${t(`payment_${payment.type}`) || payment.type}</td>
                    <td>${formatCurrency(payment.amount || 0)}</td>
                    <td>${formatDate(billData.created_at)}</td>
                    <td>${payment.details}</td>
                </tr>
            `,
                )
                .join('');
        }

        const remainingAmount = totalWithTax - paidAmount;

        // Car details
        const carInfo = billData.deal?.car ? `${billData.deal.car.make || ''} ${billData.deal.car.model || ''} ${billData.deal.car.year || ''}`.trim() : billData.car_details || t('notAvailable');

        const documentInfoSection = generateDocumentInfoSection(t, billData);

        // Tax Invoice Section
        const carDetailsTable = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>${t('carDetails')}</th>
                            <th>${t('buyPrice')}</th>
                            <th>${t('salePrice')}</th>
                            <th>${t('commission')}</th>
                            ${loss > 0 ? `<th>${t('loss')}</th>` : ''}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${carInfo}</td>
                            <td>${formatCurrency(carBuyPrice)}</td>
                            <td>${formatCurrency(carSalePrice)}</td>
                            <td>${formatCurrency(totalWithTax)}</td>
                            ${loss > 0 ? `<td>${formatCurrency(loss)}</td>` : ''}
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        const financialSummary = `
            <div class="financial-summary">
                <h3>${t('financialSummary')}</h3>
                <div class="summary-content">
                    <div class="summary-item">
                        <span>${t('preTaxTotal')}:</span>
                        <span>${formatCurrency(preTaxTotal)}</span>
                    </div>
                    <div class="summary-item">
                        <span>${t('taxAmount')} (18%):</span>
                        <span>${formatCurrency(taxAmount)}</span>
                    </div>
                    <div class="summary-item">
                        <span>${t('totalWithTax')}:</span>
                        <span>${formatCurrency(totalWithTax)}</span>
                    </div>
                </div>
            </div>
        `;

        // Receipt Section - Payments Table
        const paymentsTable = `
            <div class="financial-summary" style="margin-top: 30px;">
                <h3>${t('paymentDetails')}</h3>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>${t('paymentMethod')}</th>
                            <th>${t('amount')}</th>
                            <th>${t('paymentDate')}</th>
                            <th>${t('additionalDetails')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paymentRows}
                    </tbody>
                </table>
            </div>
        `;

        const paymentSummarySection = `
            <div class="financial-summary">
                <h3>${t('receiptDetails')}</h3>
                <div class="summary-content">
                    <div class="summary-item">
                        <span>${t('totalAmount')}:</span>
                        <span>${formatCurrency(totalWithTax)}</span>
                    </div>
                    <div class="summary-item">
                        <span>${t('paidAmount')}:</span>
                        <span>${formatCurrency(paidAmount)}</span>
                    </div>
                    ${
                        remainingAmount > 0
                            ? `
                    <div class="summary-item">
                        <span>${t('remainingAmount')}:</span>
                        <span>${formatCurrency(remainingAmount)}</span>
                    </div>
                    `
                            : ''
                    }
                </div>
            </div>
        `;

        const signatureSection = generateSignatureSection(t);

        const content = `
            ${documentInfoSection}
            ${carDetailsTable}
            ${financialSummary}
            ${paymentsTable}
            ${paymentSummarySection}
            ${signatureSection}
        `;

        const billHTML = await getBaseHTML(language).then((html) => html.replace('{{DOCUMENT_TITLE}}', 'فاتورة ضريبية وإيصال - Tax Invoice & Receipt').replace('{{CONTENT}}', content));

        tempContainer.innerHTML = billHTML;
        document.body.appendChild(tempContainer);

        console.log('Generating PDF for tax invoice & receipt...');
        await generatePDFFromElement('temp-tax-invoice-receipt-container', {
            filename,
            orientation: 'portrait',
            ...options,
        });

        document.body.removeChild(tempContainer);
        console.log(`Tax invoice & receipt PDF generated: ${filename}`);
    } catch (error) {
        console.error('Error generating tax invoice & receipt PDF:', error);
        throw error;
    }
};
