import { Log } from '@/types';
import { getTranslation } from '@/i18n';
import { formatDate } from '@/utils/date-formatter';
import { getCompanyInfo } from '@/lib/company-info';

export class LogsPDFGenerator {
    static async generateFromLogs(logs: Log[], billsData: { [dealId: string]: any[] }): Promise<void> {
        try {
            const { t } = getTranslation();

            console.log(`Starting PDF export for ${logs.length} records`);

            // For very large datasets, process in batches to avoid memory issues
            if (logs.length > 1000) {
                await this.generateBatchedPDF(logs, billsData, t);
            } else {
                await this.generateSinglePDF(logs, billsData, t);
            }
        } catch (error) {
            console.error('PDF Error:', error);
            throw new Error('PDF export failed. Please try again.');
        }
    }

    private static async generateSinglePDF(logs: Log[], billsData: any, t: any): Promise<void> {
        // Fetch company info
        const companyInfo = await getCompanyInfo();

        // Generate HTML for all records
        const html = this.createContractHeaderHTML(logs, billsData, t, companyInfo);

        // Call API
        const response = await fetch('/api/generate-logs-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                html,
                filename: 'activity-logs.pdf',
                options: {
                    format: 'A4',
                    orientation: 'landscape',
                    margins: {
                        top: '15mm',
                        right: '10mm',
                        bottom: '15mm',
                        left: '10mm',
                    },
                    printBackground: true,
                },
            }),
        });

        if (!response.ok) {
            throw new Error('PDF generation failed');
        }

        // Download
        await this.downloadPDF(response);
    }

    private static async generateBatchedPDF(logs: Log[], billsData: any, t: any): Promise<void> {
        // For very large datasets, we could implement multiple PDF generation
        // For now, let's optimize the single PDF approach
        console.log('Large dataset detected, using optimized processing');
        await this.generateSinglePDF(logs, billsData, t);
    }

    private static async downloadPDF(response: Response): Promise<void> {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `activity-logs-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    private static createContractHeaderHTML(logs: Log[], billsData: any, t: any, companyInfo: any): string {
        const currentDate = new Date().toLocaleDateString();

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Activity Logs Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @page { 
            size: A4 landscape; 
            margin: 15mm 10mm; 
        }
        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body { 
            font-family: Arial, sans-serif; 
            font-size: 10px; 
            line-height: 1.3; 
            margin: 0;
            padding: 0;
            width: 100%;
        }
        .avoid-break-inside { page-break-inside: avoid; }
        .compact-section { margin-bottom: 12px; }
        .compact-header { padding: 16px 24px; }
        .compact-content { padding: 20px; }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 15px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        th, td { 
            border: 1px solid #e5e7eb; 
            padding: 4px 3px; 
            text-align: left; 
            vertical-align: top;
            word-wrap: break-word;
            font-size: 8px;
        }
        th { 
            background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
            color: white;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.025em;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        tr:nth-child(even) { 
            background: #f8fafc; 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .data-cell {
            white-space: normal;
            overflow: hidden;
            max-width: 90px;
            word-break: break-word;
        }
        .amount {
            font-weight: 600;
            color: #059669;
        }
        .status {
            padding: 2px 4px;
            border-radius: 3px;
            font-size: 7px;
            font-weight: 500;
            text-transform: uppercase;
            background-color: #e5e7eb;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .header-gradient {
            background: linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #8b5cf6 100%) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
    </style>
</head>
<body>
    <div class="bg-white w-full max-w-none avoid-break-inside" style="direction: ltr">

        <!-- Modern Colorful Header (Same as Deal Contract) -->
        <div class="relative overflow-hidden w-full">
            <!-- Background Gradient -->
            <div class="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600" style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #8b5cf6 100%); -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            </div>

            <!-- Header Content -->
            <div class="relative compact-header w-full">
                <div class="flex items-center justify-between w-full">
                    <!-- Company Logo and Info -->
                    <div class="flex items-center gap-4 text-white">
                        ${
                            companyInfo?.logo_url
                                ? `
                            <div class="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
                                <img src="${companyInfo.logo_url}" alt="Company Logo" class="w-20 h-20 object-contain" />
                            </div>
                        `
                                : ''
                        }
                        <div class="text-left">
                            <h1 class="text-xl font-bold mb-1">${companyInfo?.name || 'Car Dealership'}</h1>
                            <div class="space-y-0.5 text-xs opacity-90">
                                ${
                                    companyInfo?.address
                                        ? `
                                    <p class="flex items-center gap-1">
                                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                                        </svg>
                                        <span>${companyInfo.address}</span>
                                    </p>
                                `
                                        : ''
                                }
                                ${
                                    companyInfo?.phone
                                        ? `
                                    <p class="flex items-center gap-1">
                                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                        </svg>
                                        <span>${companyInfo.phone}</span>
                                    </p>
                                `
                                        : ''
                                }
                                ${
                                    companyInfo?.tax_number
                                        ? `
                                    <p class="flex items-center gap-1">
                                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                                            <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd" />
                                        </svg>
                                        <span>Tax ID: ${companyInfo.tax_number}</span>
                                    </p>
                                `
                                        : ''
                                }
                            </div>
                        </div>
                    </div>

                    <!-- Report Title and Date -->
                    <div class="text-right text-white">
                        <h2 class="text-2xl font-bold mb-1">${t('activity_logs')}</h2>
                        <div class="text-sm opacity-90">
                            <p>${t('generated_on')}: ${currentDate}</p>
                            <p>${t('total_records')}: ${logs.length} ${t('logs')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Content -->
        <div class="compact-content">
            <table>
                <thead>
                    <tr>
                        <th>${t('log_date')}</th>
                        <th>${t('car_model_details')}</th>
                        <th>${t('purchase_date')} / ${t('provider_name')} / ${t('purchase_price')}</th>
                        <th>${t('sale_date')} / ${t('buyer_name')} / ${t('sale_price')}</th>
                        <th>${t('commission')}</th>
                        <th>${t('deal_status')}</th>
                        <th>${t('deal_type')}</th>
                        <th>${t('payment_receipt_type')} / ${t('amount')}</th>
                        <th>${t('invoice_number')} / ${t('amount')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.generateLogTableRows(logs, billsData, t)}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;
    }

    private static generateLogTableRows(logs: Log[], billsData: any, t: any): string {
        return logs
            .map(
                (log) => `
            <tr>
                <td class="data-cell">${log.car?.created_at ? formatDate(log.car.created_at) : t('not_available')}</td>
                <td class="data-cell">${this.getCarModelDetails(log, t)}</td>
                <td class="data-cell">${this.getPurchaseInfo(log, t)}</td>
                <td class="data-cell">${this.getSaleInfo(log, t)}</td>
                <td class="data-cell amount">${this.getCommission(log, t)}</td>
                <td class="data-cell">${this.getDealStatus(log, t)}</td>
                <td class="data-cell">${this.getDealType(log, t)}</td>
                <td class="data-cell">${this.getPaymentReceiptInfo(log, t)}</td>
                <td class="data-cell">${this.getInvoiceInfo(log, billsData, t)}</td>
            </tr>
        `,
            )
            .join('');
    }

    private static getCarModelDetails(log: Log, t: any): string {
        if (!log.car) return t('not_available');

        const car = log.car;
        return `${car.brand} ${car.title}<br><span style="color: #6b7280; font-size: 8px;">${car.year} - ${car.car_number || t('no_car_number')}</span>`;
    }

    private static getPurchaseInfo(log: Log, t: any): string {
        if (!log.car) return t('not_available');

        const car = log.car;
        const provider = car.providers || car.provider_details;
        const providerName = provider?.name || t('not_available');
        const purchaseDate = car.purchase_date ? formatDate(car.purchase_date) : t('not_available');
        const purchasePrice = car.buy_price ? `₪${car.buy_price.toLocaleString()}` : t('not_available');

        return `${purchaseDate}<br><span style="color: #6b7280; font-size: 8px;">${providerName}<br>${purchasePrice}</span>`;
    }

    private static getSaleInfo(log: Log, t: any): string {
        if (!log.deal) return t('not_available');

        const deal = log.deal;
        const saleDate = deal.sale_date ? formatDate(deal.sale_date) : t('not_available');
        const buyerName = deal.customer_name || t('not_available');
        const salePrice = deal.selling_price ? `₪${deal.selling_price.toLocaleString()}` : t('not_available');

        return `${saleDate}<br><span style="color: #6b7280; font-size: 8px;">${buyerName}<br>${salePrice}</span>`;
    }

    private static getCommission(log: Log, t: any): string {
        if (!log.deal || !log.deal.amount) {
            return `<span style="color: #9ca3af;">${t('not_available')}</span>`;
        }
        return `₪${log.deal.amount.toLocaleString()}`;
    }

    private static getDealStatus(log: Log, t: any): string {
        if (!log.deal || !log.deal.status) {
            return `<span style="color: #9ca3af;">${t('not_available')}</span>`;
        }
        return `<span class="status">${t(`status_${log.deal.status}`)}</span>`;
    }

    private static getDealType(log: Log, t: any): string {
        if (!log.deal || !log.deal.deal_type) {
            return `<span style="color: #9ca3af;">${t('not_available')}</span>`;
        }
        return this.getLocalizedDealType(log.deal.deal_type, t);
    }

    private static getPaymentReceiptInfo(log: Log, t: any): string {
        if (!log.deal) return t('not_available');

        const deal = log.deal;
        let paymentInfo = '';

        // Payment type
        if (deal.payment_type) {
            const paymentType = this.getLocalizedPaymentType(deal.payment_type, t);
            paymentInfo += paymentType;
        }

        // Payment method
        if (deal.payment_method) {
            paymentInfo += paymentInfo ? `<br><span style="color: #6b7280; font-size: 8px;">${deal.payment_method}</span>` : deal.payment_method;
        }

        // Amount
        if (deal.amount) {
            paymentInfo += `<br><span style="color: #6b7280; font-size: 8px;">₪${deal.amount.toLocaleString()}</span>`;
        }

        return paymentInfo || t('not_available');
    }

    private static getInvoiceInfo(log: Log, billsData: any, t: any): string {
        if (!log.deal?.id || !billsData) return t('not_available');

        try {
            const bills = billsData[log.deal.id] || [];
            if (bills.length === 0) return t('no_bill_created');

            let invoiceInfo = '';
            bills.forEach((bill: any, index: number) => {
                if (index > 0) invoiceInfo += '<br>';
                invoiceInfo += `${bill.invoice_number || t('not_available')}`;
                if (bill.amount) {
                    invoiceInfo += `<br><span style="color: #6b7280; font-size: 8px;">₪${parseFloat(bill.amount).toLocaleString()}</span>`;
                }
            });

            return invoiceInfo;
        } catch {
            return t('not_available');
        }
    }

    private static getLocalizedDealType(dealType: string, t: any): string {
        const dealTypeMap: { [key: string]: string } = {
            normal: 'normal',
            exchange: 'exchange',
            intermediary: 'intermediary',
            trade_in: 'trade_in',
        };

        const translationKey = dealTypeMap[dealType];
        return translationKey ? t(translationKey) : dealType.replace('_', ' ');
    }

    private static getLocalizedPaymentType(paymentType: string, t: any): string {
        const paymentTypeMap: { [key: string]: string } = {
            cash: 'cash',
            visa: 'visa',
            bank_transfer: 'bank_transfer',
            transfer: 'transfer_description',
            check: 'check',
        };

        const translationKey = paymentTypeMap[paymentType];
        return translationKey ? t(translationKey) : t(paymentType) || paymentType.replace('_', ' ');
    }
}
