import { NextRequest, NextResponse } from 'next/server';
import { PDFService } from '@/utils/pdf-service';
import { CarContract } from '@/types/contract';

export async function POST(request: NextRequest) {
    try {
        const { contractHtml, filename = 'contract.pdf', options = {} } = await request.json();

        if (!contractHtml) {
            return NextResponse.json({ error: 'Contract HTML is required' }, { status: 400 });
        }

        let htmlContent: string;

        // Check if contractHtml is a JSON string (new format) or HTML (old format)
        try {
            const parsedData = JSON.parse(contractHtml);

            if (parsedData.contract && parsedData.template) {
                // New format: generate HTML from template
                htmlContent = await generateContractHTML(parsedData.contract, parsedData.template);
            } else {
                throw new Error('Invalid data format');
            }
        } catch (parseError) {
            // Old format: assume it's already HTML
            htmlContent = contractHtml;
        }

        // Generate PDF using Puppeteer
        const pdfService = PDFService.getInstance();
        const pdfBuffer = await pdfService.generateContractPDF({
            contractHtml: htmlContent,
            filename,
            ...options,
        });

        // Return PDF as response
        return new NextResponse(Buffer.from(pdfBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': pdfBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error('PDF generation error:', error);
        return NextResponse.json({ error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}

/**
 * Generate HTML from contract template on server-side
 */
async function generateContractHTML(contract: CarContract, template: string): Promise<string> {
    // Import company info function
    const { getCompanyInfo } = await import('@/lib/company-info');

    try {
        const companyInfo = await getCompanyInfo(true); // Use service role for API routes

        // Generate HTML based on template
        switch (template) {
            case 'english':
                return generateEnglishContractHTML(contract, companyInfo);
            case 'arabic':
                return generateArabicContractHTML(contract, companyInfo);
            case 'hebrew':
                return generateHebrewContractHTML(contract, companyInfo);
            default:
                return generateEnglishContractHTML(contract, companyInfo);
        }
    } catch (error) {
        console.warn('Failed to load company info, using defaults:', error);
        const defaultCompanyInfo = {
            name: 'Car Dealership',
            address: null,
            phone: null,
            tax_number: null,
            logo_url: null,
        };

        switch (template) {
            case 'english':
                return generateEnglishContractHTML(contract, defaultCompanyInfo);
            case 'arabic':
                return generateArabicContractHTML(contract, defaultCompanyInfo);
            case 'hebrew':
                return generateHebrewContractHTML(contract, defaultCompanyInfo);
            default:
                return generateEnglishContractHTML(contract, defaultCompanyInfo);
        }
    }
}

/**
 * Generate English contract HTML
 */
function generateEnglishContractHTML(contract: CarContract, companyInfo: any): string {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'ILS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    };

    // Function to get localized deal type
    const getDealTypeLabel = (dealType: string): string => {
        const dealTypeLabels: { [key: string]: string } = {
            new_sale: 'New Sale',
            used_sale: 'Used Sale',
            new_used_sale: 'New/Used Sale',
            new_used_sale_tax_inclusive: 'New/Used Sale Tax Inclusive for Dealers',
            exchange: 'Exchange',
            intermediary: 'Intermediary',
            financing_assistance_intermediary: 'Financing Assistance Intermediary',
            company_commission: 'Company Commission',
            normal: 'Sale',
            'trade-in': 'Exchange Deal',
        };
        return dealTypeLabels[dealType] || dealType;
    };

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vehicle Sale Agreement</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
            // Signal when Tailwind is loaded
            window.tailwindReady = false;
            document.addEventListener('DOMContentLoaded', () => {
                // Wait for Tailwind to be applied
                setTimeout(() => {
                    window.tailwindReady = true;
                }, 500);
            });
        </script>
        <style>
            @page { size: A4; margin: 8mm; }
            body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.2; }
            .avoid-break-inside { page-break-inside: avoid; }
            .compact-section { margin-bottom: 8px; }
            .compact-header { padding: 12px 16px; }
            .compact-content { padding: 12px; }
            h1 { font-size: 18px; }
            h2 { font-size: 14px; }
            h3 { font-size: 12px; }
            .text-sm { font-size: 10px; }
            .text-xs { font-size: 9px; }
        </style>
    </head>
    <body>
        <div class="bg-white w-full max-w-none avoid-break-inside" style="direction: ltr">
            <!-- Modern Colorful Header -->
            <div class="relative overflow-hidden w-full">
                <!-- Background Gradient -->
                <div class="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700"></div>

                <!-- Header Content -->
                <div class="relative compact-header w-full">
                    <div class="flex items-center justify-between w-full">
                        <!-- Company Logo and Info -->
                        <div class="flex items-center gap-3 text-white">
                            ${
                                companyInfo?.logo_url
                                    ? `
                                <div class="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
                                    <img src="${companyInfo.logo_url}" alt="Company Logo" class="w-12 h-12 object-contain" />
                                </div>
                            `
                                    : ''
                            }
                            <div class="text-left">
                                <h1 class="text-xl font-bold mb-0.5">${companyInfo?.name || 'Car Dealership'}</h1>
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

                        <!-- Contract Title and Date -->
                        <div class="text-white text-right">
                            <h2 class="text-base font-bold mb-0.5">Vehicle Purchase Agreement</h2>
                            <p class="text-xs font-medium text-white/80 mb-1">${getDealTypeLabel(contract.dealType)}</p>
                            <div class="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20">
                                <p class="text-xs font-medium">Contract Date</p>
                                <p class="text-sm font-bold">${formatDate(contract.dealDate)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Contract Content -->
            <div class="compact-content space-y-2 w-full">
                <!-- Parties Information -->
                ${
                    contract.isIntermediaryDeal
                        ? `
                    <!-- Intermediary Deal - Three Parties -->
                    <div class="space-y-2 w-full compact-section">
                        <!-- Company/Intermediary -->
                        <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-3 border border-indigo-200">
                            <h2 class="font-bold mb-1.5 text-sm text-indigo-700 flex items-center gap-1.5">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Intermediary/Company
                            </h2>
                            <div class="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                                <p><span class="font-semibold text-indigo-700">Company:</span> ${contract.companyName}</p>
                                <p><span class="font-semibold text-indigo-700">Tax Number:</span> ${contract.companyTaxNumber}</p>
                                <p><span class="font-semibold text-indigo-700">Address:</span> ${contract.companyAddress}</p>
                                <p><span class="font-semibold text-indigo-700">Phone:</span> ${contract.companyPhone}</p>
                            </div>
                        </div>
                        
                        <!-- Seller and Buyer -->
                        <div class="grid grid-cols-2 gap-3 w-full">
                            <!-- Seller -->
                            <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                                <h2 class="font-bold mb-1.5 text-sm text-green-700 flex items-center gap-1.5">
                                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                    </svg>
                                    Seller
                                </h2>
                                <div class="space-y-0.5 text-xs">
                                    <p><span class="font-semibold text-green-700">Name:</span> ${contract.actualSeller?.name || contract.sellerName}</p>
                                    <p><span class="font-semibold text-green-700">ID:</span> ${contract.actualSeller?.id || 'N/A'}</p>
                                    <p><span class="font-semibold text-green-700">Address:</span> ${contract.actualSeller?.address || 'N/A'}</p>
                                    <p><span class="font-semibold text-green-700">Phone:</span> ${contract.actualSeller?.phone || 'N/A'}</p>
                                </div>
                            </div>

                            <!-- Buyer -->
                            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                                <h2 class="font-bold mb-1.5 text-sm text-blue-700 flex items-center gap-1.5">
                                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                                    </svg>
                                    Buyer
                                </h2>
                                <div class="space-y-0.5 text-xs">
                                    <p><span class="font-semibold text-blue-700">Name:</span> ${contract.actualBuyer?.name || contract.buyerName}</p>
                                    <p><span class="font-semibold text-blue-700">ID:</span> ${contract.actualBuyer?.id || contract.buyerId}</p>
                                    <p><span class="font-semibold text-blue-700">Address:</span> ${contract.actualBuyer?.address || contract.buyerAddress}</p>
                                    <p><span class="font-semibold text-blue-700">Phone:</span> ${contract.actualBuyer?.phone || contract.buyerPhone}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `
                        : `
                    <!-- Regular Deal - Two Parties -->
                    <div class="grid grid-cols-2 gap-3 w-full compact-section">
                        <!-- Seller -->
                        <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                            <h2 class="font-bold mb-1.5 text-sm text-green-700 flex items-center gap-1.5">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                </svg>
                                Seller
                            </h2>
                            <div class="space-y-1 text-xs">
                                <p><span class="font-semibold text-green-700">Company:</span> ${contract.sellerName}</p>
                                <p><span class="font-semibold text-green-700">Tax Number:</span> ${contract.sellerTaxNumber}</p>
                                <p><span class="font-semibold text-green-700">Address:</span> ${contract.sellerAddress}</p>
                                <p><span class="font-semibold text-green-700">Phone:</span> ${contract.sellerPhone}</p>
                            </div>
                        </div>

                        <!-- Buyer -->
                        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                            <h2 class="font-bold mb-1.5 text-sm text-blue-700 flex items-center gap-1.5">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                                </svg>
                                Buyer
                            </h2>
                            <div class="space-y-0.5 text-xs">
                                <p><span class="font-semibold text-blue-700">Name:</span> ${contract.buyerName}</p>
                                <p><span class="font-semibold text-blue-700">ID:</span> ${contract.buyerId}</p>
                                <p><span class="font-semibold text-blue-700">Address:</span> ${contract.buyerAddress}</p>
                                <p><span class="font-semibold text-blue-700">Phone:</span> ${contract.buyerPhone}</p>
                            </div>
                        </div>
                    </div>
                `
                }

                <!-- Vehicle Information -->
                ${
                    contract.dealType === 'trade-in'
                        ? `
                    <!-- Exchange Deal - Two Vehicles Side by Side -->
                    <div class="grid grid-cols-2 gap-3">
                        <!-- Car Being Sold (Primary Vehicle) -->
                        <div class="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-3 border border-purple-200 compact-section">
                            <h2 class="font-bold mb-1.5 text-sm text-purple-700 flex items-center gap-1.5">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                                </svg>
                                Vehicle Being Sold
                            </h2>
                            <div class="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs">
                                <p><span class="font-semibold text-purple-700">Make:</span> ${contract.carMake}</p>
                                <p><span class="font-semibold text-purple-700">Model:</span> ${contract.carModel}</p>
                                <p><span class="font-semibold text-purple-700">Year:</span> ${contract.carYear}</p>
                                <p><span class="font-semibold text-purple-700">Type:</span> ${contract.carType}</p>
                                <p><span class="font-semibold text-purple-700">Plate:</span> ${contract.carPlateNumber}</p>
                                <p><span class="font-semibold text-purple-700">KM:</span> ${contract.carKilometers.toLocaleString()}</p>
                                ${contract.carVin ? `<p><span class="font-semibold text-purple-700">VIN:</span> ${contract.carVin}</p>` : ''}
                                ${contract.carEngineNumber ? `<p><span class="font-semibold text-purple-700">Engine:</span> ${contract.carEngineNumber}</p>` : ''}
                            </div>
                        </div>

                        <!-- Trade-in Vehicle (Car Received from Client) -->
                        ${
                            contract.tradeInCar
                                ? `
                            <div class="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200 compact-section">
                                <h2 class="font-bold mb-2 text-lg text-orange-700 flex items-center gap-2">
                                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                                    </svg>
                                    Trade-in Vehicle
                                </h2>
                                <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                    <p><span class="font-semibold text-orange-700">Make:</span> ${contract.tradeInCar.make}</p>
                                    <p><span class="font-semibold text-orange-700">Model:</span> ${contract.tradeInCar.model}</p>
                                    <p><span class="font-semibold text-orange-700">Type:</span> ${contract.tradeInCar.type}</p>
                                    <p><span class="font-semibold text-orange-700">Year:</span> ${contract.tradeInCar.year}</p>
                                    <p><span class="font-semibold text-orange-700">Plate:</span> ${contract.tradeInCar.plateNumber}</p>
                                    <p><span class="font-semibold text-orange-700">KM:</span> ${contract.tradeInCar.kilometers.toLocaleString()}</p>
                                </div>
                            </div>
                        `
                                : ''
                        }
                    </div>
                `
                        : `
                    <!-- Single Vehicle Information (Non-Exchange Deal) -->
                    <div class="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200 compact-section">
                        <h2 class="font-bold mb-2 text-lg text-purple-700 flex items-center gap-2">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                            </svg>
                            Vehicle Information
                        </h2>
                        <div class="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                            <p><span class="font-semibold text-purple-700">Make:</span> ${contract.carMake}</p>
                            <p><span class="font-semibold text-purple-700">Model:</span> ${contract.carModel}</p>
                            <p><span class="font-semibold text-purple-700">Year:</span> ${contract.carYear}</p>
                            <p><span class="font-semibold text-purple-700">Type:</span> ${contract.carType}</p>
                            <p><span class="font-semibold text-purple-700">Plate:</span> ${contract.carPlateNumber}</p>
                            <p><span class="font-semibold text-purple-700">KM:</span> ${contract.carKilometers.toLocaleString()}</p>
                            ${contract.carVin ? `<p><span class="font-semibold text-purple-700">VIN:</span> ${contract.carVin}</p>` : ''}
                            ${contract.carEngineNumber ? `<p><span class="font-semibold text-purple-700">Engine:</span> ${contract.carEngineNumber}</p>` : ''}
                        </div>
                    </div>
                `
                }

                <!-- Payment Information -->
                <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200 compact-section">
                    <div class="grid grid-cols-2 gap-4 items-start">
                        <!-- Payment Details Header -->
                        <div>
                            <h2 class="font-bold text-lg text-emerald-700 flex items-center gap-2">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4z" />
                                    <path d="M14 6a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h10zM4 8a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                                </svg>
                                
                                ${contract.dealType === 'trade-in' ? '<span>Exchange Details</span>' : '<span>Payment Details</span>'}
                            </h2>
                        </div>
                        
                        <!-- Total Amount -->
                        <div>
                            <p class="text-base font-bold text-emerald-700 bg-white rounded-lg p-2 border-2 border-emerald-300 text-center">Total: ${formatCurrency(contract.dealAmount)}</p>
                        </div>
                    </div>
                    
                    ${
                        contract.dealType === 'trade-in' && contract.tradeInCar
                            ? `
                    <!-- Exchange Deal Breakdown - Compact -->
                    <div class="mt-2 bg-white rounded-lg p-1.5 border border-emerald-200">
                        <p class="text-xs"><span class="font-semibold text-gray-600">Trade-in:</span> <span class="text-emerald-700">${formatCurrency(contract.tradeInCar.estimatedValue)}</span>${
                            contract.additionalCustomerAmount && contract.additionalCustomerAmount > 0
                                ? `<p><span class="font-semibold text-gray-600">Additional from Customer:</span> <span class="text-blue-600">${formatCurrency(contract.additionalCustomerAmount)}</span></p>`
                                : ''
                        }${
                            contract.additionalCompanyAmount && contract.additionalCompanyAmount > 0
                                ? `<p><span class="font-semibold text-gray-600">Additional from Company:</span> <span class="text-orange-600">${formatCurrency(contract.additionalCompanyAmount)}</span></p>`
                                : ''
                        }</p>
                    </div>
                    `
                            : ''
                    }
                    
                    <div class="mt-3 space-y-2">
                        ${
                            contract.paymentMethods && contract.paymentMethods.length > 0
                                ? `
                            <div class="bg-white rounded-lg p-1.5 border border-emerald-200">
                                <p class="text-xs"><span class="font-semibold text-emerald-700">Payment Methods:</span> <span class="flex-wrap gap-1.5 inline-flex">
                                    ${contract.paymentMethods
                                        .filter((method) => method.selected)
                                        .map((method) => {
                                            const methodLabels = {
                                                cash: 'Cash',
                                                visa: 'Credit Card',
                                                bank_transfer: 'Bank Transfer',
                                                check: 'Check',
                                            };

                                            return `<span class="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border text-xs">${methodLabels[method.type] || method.type}</span>`;
                                        })
                                        .join(' ')}</span></p>
                            </div>
                        `
                                : ''
                        }
                        
                        ${
                            contract.paymentNotes
                                ? `
                            <div class="bg-white rounded-lg p-2 border border-emerald-200">
                                <h3 class="font-semibold text-emerald-700 mb-1 text-sm">Notes:</h3>
                                <p class="text-xs text-gray-700 whitespace-pre-wrap">${contract.paymentNotes}</p>
                            </div>
                        `
                                : ''
                        }
                    </div>
                </div>

                <!-- Terms and Conditions -->
                <div class="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-3 border border-red-200 compact-section">
                    <h2 class="font-bold mb-1.5 text-sm text-red-700 flex items-center gap-1.5">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1z" clip-rule="evenodd" />
                        </svg>
                        Terms and Conditions
                    </h2>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div class="space-y-0.5">
                            <!-- Original Terms -->
                            <div class="bg-white rounded p-1.5 border border-red-200">• Vehicle sold "as is" with no warranties</div>
                            <div class="bg-white rounded p-1.5 border border-red-200">• Ownership transfer within ${contract.ownershipTransferDays} days</div>
                            <div class="bg-white rounded p-1.5 border border-red-200">• Agreement binding upon both parties once signed</div>
                            <!-- New Terms -->
                            <div class="bg-white rounded p-1.5 border border-red-200">• Vehicle possession transfers to buyer on (${formatDate(contract.dealDate)}) and parties agree that from transfer date, vehicle belongs to buyer exclusively, even if formal ownership transfer hasn't been completed at DMV</div>
                            <div class="bg-white rounded p-1.5 border border-red-200">• Seller commits to bear all parking, traffic fines or other payments related to vehicle use until delivery date</div>
                        </div>
                        <div class="space-y-0.5">
                            <div class="bg-white rounded p-1.5 border border-red-200">• Parties agree that ownership transfer expenses will be borne by the buyer</div>
                            <div class="bg-white rounded p-1.5 border border-red-200">• Party breaching this contract materially shall pay other party 2000 NIS as predetermined compensation without proof of damage</div>
                            <div class="bg-white rounded p-1.5 border border-red-200">• Parties agree that Auto Market purchases vehicles from both organized suppliers and private clients and has no knowledge of depreciation or insurance history, buyer must verify this information</div>
                            <div class="bg-white rounded p-1.5 border border-red-200">• Buyer declares having inspected the vehicle's external, internal and mechanical condition and found it in good working order to their satisfaction</div>
                        </div>
                    </div>
                </div>

                <!-- Signatures -->
                <div class="${contract.isIntermediaryDeal ? 'grid grid-cols-3 gap-2 pt-2' : 'grid grid-cols-2 gap-3 pt-2'} w-full">
                    ${
                        contract.isIntermediaryDeal
                            ? `
                    <!-- Company Signature -->
                    <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-2 border border-indigo-200 text-center">
                        <h3 class="font-bold mb-1 text-indigo-700 text-xs">Company</h3>
                        ${
                            contract.companySignatureUrl
                                ? `<div class="flex items-center justify-center h-8 mb-1">
                            <img src="${contract.companySignatureUrl}" alt="Company Signature" class="max-h-8 max-w-full object-contain" />
                        </div>`
                                : `<div class="border-b-2 border-indigo-300 h-6 mb-1"></div>`
                        }
                        <p class="text-xs text-indigo-600">Date: ${formatDate(contract.dealDate)}</p>
                    </div>
                    <!-- Seller Signature -->
                    <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2 border border-green-200 text-center">
                        <h3 class="font-bold mb-1 text-green-700 text-xs">Seller</h3>
                        <div class="border-b-2 border-green-300 h-6 mb-1"></div>
                        <p class="text-xs text-green-600">Date: ${formatDate(contract.dealDate)}</p>
                    </div>
                    <!-- Buyer Signature -->
                    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2 border border-blue-200 text-center">
                        <h3 class="font-bold mb-1 text-blue-700 text-xs">Buyer</h3>
                        ${
                            contract.customerSignatureUrl
                                ? `<div class="flex items-center justify-center h-12 mb-1">
                            <img src="${contract.customerSignatureUrl}" alt="Customer Signature" class="max-h-12 max-w-full object-contain" />
                        </div>`
                                : `<div class="border-b-2 border-blue-300 h-6 mb-1"></div>`
                        }
                        <p class="text-xs text-blue-600">Date: ${formatDate(contract.dealDate)}</p>
                    </div>
                    `
                            : `
                    <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-3 border border-gray-200 text-center">
                        <h3 class="font-bold mb-2 text-gray-700 text-sm">Seller's Signature</h3>
                        ${
                            contract.companySignatureUrl
                                ? `<div class="flex items-center justify-center h-12 mb-2">
                            <img src="${contract.companySignatureUrl}" alt="Company Signature" class="max-h-12 max-w-full object-contain" />
                        </div>`
                                : `<div class="border-b-2 border-gray-300 h-8 mb-2"></div>`
                        }
                        <p class="text-xs text-gray-600">Date: ${formatDate(contract.dealDate)}</p>
                    </div>
                    <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-3 border border-gray-200 text-center">
                        <h3 class="font-bold mb-2 text-gray-700 text-sm">Buyer's Signature</h3>
                        ${
                            contract.customerSignatureUrl
                                ? `<div class="flex items-center justify-center h-12 mb-2">
                            <img src="${contract.customerSignatureUrl}" alt="Customer Signature" class="max-h-12 max-w-full object-contain" />
                        </div>`
                                : `<div class="border-b-2 border-gray-300 h-8 mb-2"></div>`
                        }
                        <p class="text-xs text-gray-600">Date: ${formatDate(contract.dealDate)}</p>
                    </div>
                    `
                    }
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

/**
 * Generate Arabic contract HTML
 */
function generateArabicContractHTML(contract: CarContract, companyInfo: any): string {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ar-SA', {
            style: 'currency',
            currency: 'ILS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    };

    // Function to get localized deal type in Arabic
    const getDealTypeLabel = (dealType: string): string => {
        const dealTypeLabels: { [key: string]: string } = {
            new_sale: 'صفقة بيع جديد',
            used_sale: 'صفقة بيع مستعمل',
            new_used_sale: 'صفقة بيع جديد/مستعمل',
            new_used_sale_tax_inclusive: 'صفقة بيع جديد/مستعمل شاملة الضريبة للتجار',
            exchange: 'صفقة تبديل',
            intermediary: 'صفقة وسيط',
            financing_assistance_intermediary: 'صفقة وسيط مساعدة للتمويل',
            company_commission: 'صفقة عمولة من الشركات',
            normal: 'صفقة بيع',
            'trade-in': 'صفقة تبديل',
        };
        return dealTypeLabels[dealType] || dealType;
    };

    return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>اتفاقية بيع مركبة</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap" rel="stylesheet">
        <style>
            @page { size: A4; margin: 8mm; }
            body { font-family: 'Almarai', 'Arial', 'Tahoma', sans-serif; font-size: 13px; line-height: 1.3; }
            .avoid-break-inside { page-break-inside: avoid; }
            .section-title {
                text-align: right !important;
                display: flex;
                flex-direction: row-reverse;
            }
            .compact-section { margin-bottom: 12px; }
            .compact-header { padding: 16px 24px; }
            .compact-content { padding: 20px; }
        </style>
    </head>
    <body>
        <div class="bg-white w-full max-w-none avoid-break-inside" style="direction: rtl">
            <!-- Modern Colorful Header -->
            <div class="relative overflow-hidden w-full">
                <!-- Background Gradient -->
                <div class="absolute inset-0 bg-gradient-to-l from-blue-700 to-indigo-700"></div>

                <!-- Header Content -->
                <div class="relative compact-header w-full">
                    <div class="flex items-center justify-between w-full">
                        <!-- Company Logo and Info (moved to right for RTL) -->
                        <div class="flex items-center gap-4 text-white">

                          ${
                              companyInfo?.logo_url
                                  ? `
                                <div class="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
                                    <img src="${companyInfo.logo_url}" alt="شعار الشركة" class="w-12 h-12 object-contain" />
                                </div>
                            `
                                  : ''
                          }

                            <div class="text-right">
                                <h1 class="text-xl font-bold mb-1">${companyInfo?.name || 'معرض السيارات'}</h1>
                                <div class="space-y-0.5 text-xs opacity-90">
                                    ${
                                        companyInfo?.address
                                            ? `
                                        <p class="flex flex-row-reverse items-center gap-1 justify-end">
                                            <span>${companyInfo.address}</span>
                                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                                            </svg>
                                        </p>
                                    `
                                            : ''
                                    }
                                    ${
                                        companyInfo?.phone
                                            ? `
                                        <p class="flex flex-row-reverse items-center gap-1 justify-end">
                                            <span>${companyInfo.phone}</span>
                                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                            </svg>
                                        </p>
                                    `
                                            : ''
                                    }
                                    ${
                                        companyInfo?.tax_number
                                            ? `
                                        <p class="flex flex-row-reverse items-center gap-1 justify-end">
                                            <span>رقم الضريبة: ${companyInfo.tax_number}</span>
                                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                                                <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd" />
                                            </svg>
                                        </p>
                                    `
                                            : ''
                                    }
                                </div>
                            </div>
                          
                        </div>

                        <!-- Contract Title and Date (moved to left for RTL) -->
                        <div class="text-white text-left">
                            <h2 class="text-lg font-bold mb-1">اتفاقية بيع مركبة</h2>
                            <p class="text-sm font-medium text-white/80 mb-2">${getDealTypeLabel(contract.dealType)}</p>
                            <div class="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20">
                                <p class="text-xs font-medium">تاريخ العقد</p>
                                <p class="text-sm font-bold">${formatDate(contract.dealDate)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Contract Content -->
            <div class="compact-content space-y-3 w-full">
                <!-- Parties Information -->
                ${
                    contract.isIntermediaryDeal
                        ? `
                    <!-- Intermediary Deal - Three Parties -->
                    <div class="space-y-3 w-full compact-section">
                        <!-- Company/Intermediary -->
                        <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
                            <h2 class="font-bold mb-2 text-lg text-indigo-700 flex items-center gap-2 justify-end section-title">
                                <span>الوسيط/الشركة</span>
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </h2>
                            <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-right">
                                <p><span class="font-semibold text-indigo-700">الشركة:</span> ${contract.companyName}</p>
                                <p><span class="font-semibold text-indigo-700">رقم الضريبة:</span> ${contract.companyTaxNumber}</p>
                                <p><span class="font-semibold text-indigo-700">العنوان:</span> ${contract.companyAddress}</p>
                                <p><span class="font-semibold text-indigo-700">الهاتف:</span> ${contract.companyPhone}</p>
                            </div>
                        </div>
                        
                        <!-- Seller and Buyer -->
                        <div class="grid grid-cols-2 gap-4 w-full">
                            <!-- Buyer -->
                            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                                <h2 class="font-bold mb-2 text-lg text-blue-700 flex items-center gap-2 justify-end section-title">
                                    <span>المشتري</span>
                                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                                    </svg>
                                </h2>
                                <div class="space-y-1 text-xs text-right">
                                    <p><span class="font-semibold text-blue-700">الاسم:</span> ${contract.actualBuyer?.name || contract.buyerName}</p>
                                    <p><span class="font-semibold text-blue-700">الهوية:</span> ${contract.actualBuyer?.id || contract.buyerId}</p>
                                    <p><span class="font-semibold text-blue-700">العنوان:</span> ${contract.actualBuyer?.address || contract.buyerAddress}</p>
                                    <p><span class="font-semibold text-blue-700">الهاتف:</span> ${contract.actualBuyer?.phone || contract.buyerPhone}</p>
                                </div>
                            </div>

                            <!-- Seller -->
                            <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                                <h2 class="font-bold mb-2 text-lg text-green-700 flex items-center gap-2 justify-end section-title">
                                    <span>البائع</span>
                                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                    </svg>
                                </h2>
                                <div class="space-y-1 text-xs text-right">
                                    <p><span class="font-semibold text-green-700">الاسم:</span> ${contract.actualSeller?.name || contract.sellerName}</p>
                                    <p><span class="font-semibold text-green-700">الهوية:</span> ${contract.actualSeller?.id || 'غير متوفر'}</p>
                                    <p><span class="font-semibold text-green-700">العنوان:</span> ${contract.actualSeller?.address || 'غير متوفر'}</p>
                                    <p><span class="font-semibold text-green-700">الهاتف:</span> ${contract.actualSeller?.phone || 'غير متوفر'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `
                        : `
                    <!-- Regular Deal - Two Parties -->
                    <div class="grid grid-cols-2 gap-4 w-full">
                        <!-- Buyer -->
                        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                            <h2 class="font-bold mb-2 text-lg text-blue-700 flex items-center gap-2 justify-end section-title">
                                <span>المشتري</span>
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                                </svg>
                            </h2>
                            <div class="space-y-1 text-xs text-right">
                                <p><span class="font-semibold text-blue-700">الاسم:</span> ${contract.buyerName}</p>
                                <p><span class="font-semibold text-blue-700">الهوية:</span> ${contract.buyerId}</p>
                                <p><span class="font-semibold text-blue-700">العنوان:</span> ${contract.buyerAddress}</p>
                                <p><span class="font-semibold text-blue-700">الهاتف:</span> ${contract.buyerPhone}</p>
                            </div>
                        </div>

                        <!-- Seller -->
                        <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                            <h2 class="font-bold mb-2 text-lg text-green-700 flex items-center gap-2 justify-end section-title">
                                <span>البائع</span>
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                </svg>
                            </h2>
                            <div class="space-y-1 text-xs text-right">
                                <p><span class="font-semibold text-green-700">الشركة:</span> ${contract.sellerName}</p>
                                <p><span class="font-semibold text-green-700">رقم الضريبة:</span> ${contract.sellerTaxNumber}</p>
                                <p><span class="font-semibold text-green-700">العنوان:</span> ${contract.sellerAddress}</p>
                                <p><span class="font-semibold text-green-700">الهاتف:</span> ${contract.sellerPhone}</p>
                            </div>
                        </div>
                    </div>
                `
                }

                <!-- Vehicle Information -->
                ${
                    contract.dealType === 'trade-in'
                        ? `
                    <!-- Exchange Deal - Two Vehicles Side by Side -->
                    <div class="grid grid-cols-2 gap-4">
                        <!-- Car Being Sold (Primary Vehicle) -->
                        <div class="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
                            <h2 class="font-bold mb-2 text-lg text-purple-700 flex items-center gap-2 justify-end section-title">
                                <span>المركبة المباعة</span>
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                            </h2>
                            <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-right">
                                <p><span class="font-semibold text-purple-700">الماركة:</span> ${contract.carMake}</p>
                                <p><span class="font-semibold text-purple-700">الموديل:</span> ${contract.carModel}</p>
                                <p><span class="font-semibold text-purple-700">السنة:</span> ${contract.carYear}</p>
                                <p><span class="font-semibold text-purple-700">النوع:</span> ${contract.carType}</p>
                                <p><span class="font-semibold text-purple-700">رقم اللوحة:</span> ${contract.carPlateNumber}</p>
                                <p><span class="font-semibold text-purple-700">الكيلومترات:</span> ${contract.carKilometers.toLocaleString('en-US')}</p>
                                ${contract.carVin ? `<p><span class="font-semibold text-purple-700">رقم الهيكل:</span> ${contract.carVin}</p>` : ''}
                                ${contract.carEngineNumber ? `<p><span class="font-semibold text-purple-700">رقم المحرك:</span> ${contract.carEngineNumber}</p>` : ''}
                            </div>
                        </div>

                        <!-- Trade-in Vehicle (Car Received from Client) -->
                        ${
                            contract.tradeInCar
                                ? `
                            <div class="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200">
                                <h2 class="font-bold mb-2 text-lg text-orange-700 flex items-center gap-2 justify-end section-title">
                                    <span>المركبة المستلمة من العميل</span>
                                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                                    </svg>
                                </h2>
                                <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-right">
                                    <p><span class="font-semibold text-orange-700">الماركة:</span> ${contract.tradeInCar.make}</p>
                                    <p><span class="font-semibold text-orange-700">الموديل:</span> ${contract.tradeInCar.model}</p>
                                    <p><span class="font-semibold text-orange-700">النوع:</span> ${contract.tradeInCar.type}</p>
                                    <p><span class="font-semibold text-orange-700">السنة:</span> ${contract.tradeInCar.year}</p>
                                    <p><span class="font-semibold text-orange-700">رقم اللوحة:</span> ${contract.tradeInCar.plateNumber}</p>
                                    <p><span class="font-semibold text-orange-700">الكيلومترات:</span> ${contract.tradeInCar.kilometers.toLocaleString('en-US')}</p>
                                </div>
                            </div>
                        `
                                : ''
                        }
                    </div>
                `
                        : `
                    <!-- Single Vehicle Information (Non-Exchange Deal) -->
                    <div class="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
                        <h2 class="font-bold mb-2 text-lg text-purple-700 flex items-center gap-2 justify-end section-title">
                            <span>معلومات المركبة</span>
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                        </h2>
                        <div class="grid grid-cols-3 gap-x-3 gap-y-1 text-xs text-right">
                            <p><span class="font-semibold text-purple-700">الماركة:</span> ${contract.carMake}</p>
                            <p><span class="font-semibold text-purple-700">الموديل:</span> ${contract.carModel}</p>
                            <p><span class="font-semibold text-purple-700">السنة:</span> ${contract.carYear}</p>
                            <p><span class="font-semibold text-purple-700">النوع:</span> ${contract.carType}</p>
                            <p><span class="font-semibold text-purple-700">رقم اللوحة:</span> ${contract.carPlateNumber}</p>
                            <p><span class="font-semibold text-purple-700">الكيلومترات:</span> ${contract.carKilometers.toLocaleString('en-US')}</p>
                            ${contract.carVin ? `<p><span class="font-semibold text-purple-700">رقم الهيكل:</span> ${contract.carVin}</p>` : ''}
                            ${contract.carEngineNumber ? `<p><span class="font-semibold text-purple-700">رقم المحرك:</span> ${contract.carEngineNumber}</p>` : ''}
                        </div>
                    </div>
                `
                }

                <!-- Payment Information -->
                <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
                    <div class="grid grid-cols-2 gap-4 items-start">
                        <!-- Payment Details Header and Total Amount -->
                        <div class="space-y-3">
                            <h2 class="font-bold text-lg text-emerald-700 flex items-center gap-2 justify-end section-title">
                              ${contract.dealType === 'trade-in' ? '<span>تفاصيل التبديل</span>' : '<span>تفاصيل الدفع</span>'}
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4z" />
                                    <path d="M14 6a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h10zM4 8a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                                </svg>
                            </h2>
                        </div>
                        
                        <!-- Total Amount -->
                        <div>
                            <p class="text-base font-bold text-emerald-700 bg-white rounded-lg p-3 border-2 border-emerald-300 text-center">المبلغ الإجمالي: ${formatCurrency(contract.dealAmount)}</p>
                        </div>
                    </div>
                    
                    ${
                        contract.dealType === 'trade-in' && contract.tradeInCar
                            ? `
                    <!-- Exchange Deal Breakdown - Compact -->
                    <div class="mt-2 bg-white rounded-lg p-1.5 border border-emerald-200">
                        <p class="text-xs text-right"><span class="font-semibold text-gray-600">قيمة التبديل:</span> <span class="text-emerald-700">${formatCurrency(contract.tradeInCar.estimatedValue)}</span>${
                            contract.additionalCustomerAmount && contract.additionalCustomerAmount > 0
                                ? `<p><span class="font-semibold text-gray-600">المبلغ الإضافي من الزبون:</span> <span class="text-blue-600">${formatCurrency(contract.additionalCustomerAmount)}</span></p>`
                                : ''
                        }${
                            contract.additionalCompanyAmount && contract.additionalCompanyAmount > 0
                                ? `<p><span class="font-semibold text-gray-600">المبلغ الإضافي من الشركة:</span> <span class="text-orange-600">${formatCurrency(contract.additionalCompanyAmount)}</span></p>`
                                : ''
                        }</p>
                    </div>
                    `
                            : ''
                    }
                    
                    <div class="mt-3 space-y-2">
                        ${
                            contract.paymentMethods && contract.paymentMethods.length > 0
                                ? `
                            <div class="bg-white rounded-lg p-1.5 border border-emerald-200">
                                <p class="text-xs text-right"><span class="font-semibold text-emerald-700">طرق الدفع:</span> <span class="flex-wrap gap-1.5 inline-flex">
                                    ${contract.paymentMethods
                                        .filter((method) => method.selected)
                                        .map((method) => {
                                            const methodLabels = {
                                                cash: 'دفع نقدي',
                                                visa: 'بطاقة ائتمان (فيزا)',
                                                bank_transfer: 'تحويل بنكي',
                                                check: 'دفع بشيك',
                                            };

                                            return `<span class="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border">${methodLabels[method.type] || method.type}</span>`;
                                        })
                                        .join(' ')}</span></p>
                            </div>
                        `
                                : ''
                        }
                        
                        ${
                            contract.paymentNotes
                                ? `
                            <div class="bg-white rounded-lg p-4 border border-emerald-200">
                                <h3 class="font-semibold text-emerald-700 mb-2 text-right">ملاحظات الدفع:</h3>
                                <p class="text-sm text-gray-700 whitespace-pre-wrap text-right">${contract.paymentNotes}</p>
                            </div>
                        `
                                : ''
                        }
                    </div>
                </div>

                <!-- Terms and Conditions -->
                <div class="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-4 border border-red-200">
                    <h2 class="font-bold mb-2 text-lg text-red-700 flex items-center gap-2 justify-end section-title">
                        <span>الشروط والأحكام</span>
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1z" clip-rule="evenodd" />
                        </svg>
                    </h2>
                    <div class="grid grid-cols-2 gap-4 text-xs text-right">
                        <div class="space-y-2">
                            <!-- Original Terms -->
                            <div class="bg-white rounded p-2 border border-red-200">• يضمن البائع أن المركبة خالية من أي رهون أو أعباء</div>
                            <div class="bg-white rounded p-2 border border-red-200">• تباع المركبة "كما هي" دون أي ضمانات صريحة أو ضمنية</div>
                            <div class="bg-white rounded p-2 border border-red-200">• يوافق البائع على نقل الملكية خلال ${contract.ownershipTransferDays} أيام</div>
                            <!-- New Terms -->
                            <div class="bg-white rounded p-2 border border-red-200">• تنتقل حيازة المركبة إلى المشتري في (${formatDate(contract.dealDate)}) ويتفق الطرفان على أنه من تاريخ نقل الحيازة ستكون المركبة ملك المشتري حصرياً، حتى لو لم يتم نقل الملكية الرسمي في دائرة النقل</div>
                            <div class="bg-white rounded p-2 border border-red-200">• يلتزم البائع بتحمل جميع مخالفات الوقوف أو المرور أو أي مدفوعات أخرى متعلقة باستخدام المركبة حتى تاريخ التسليم</div>
                        </div>
                        <div class="space-y-2">
                            <div class="bg-white rounded p-2 border border-red-200">• يتفق الطرفان على أن تكاليف نقل الملكية يتحملها المشتري</div>
                            <div class="bg-white rounded p-2 border border-red-200">• الطرف المخل إخلالاً جوهرياً بالعقد يدفع للطرف الآخر مبلغ 2000 شيكل كتعويض ثابت ومتفق عليه مسبقاً دون إثبات ضرر</div>
                            <div class="bg-white rounded p-2 border border-red-200">• متفق بين الطرفين أن أوتو شوق تشتري المركبات من موردين منظمين ومن عملاء خاصين وأنه لا علم لها بانخفاض القيمة أو التاريخ التأميني وأن على المشتري فحص هذه البيانات</div>
                            <div class="bg-white rounded p-2 border border-red-200">• يقر المشتري أنه فحص المركبة وحالتها الخارجية والداخلية والميكانيكية ووجدها في حالة جيدة ومرضية له</div>
                        </div>
                    </div>
                </div>

                <!-- Signatures -->
                <div class="${contract.isIntermediaryDeal ? 'grid grid-cols-3 gap-3 pt-2' : 'grid grid-cols-2 gap-4 pt-4'} w-full">
                    ${
                        contract.isIntermediaryDeal
                            ? `
                    <!-- Company Signature -->
                    <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-2 border border-indigo-200 text-center">
                        <h3 class="font-bold mb-1 text-indigo-700 text-xs">الشركة</h3>
                        ${
                            contract.companySignatureUrl
                                ? `<div class="flex items-center justify-center h-8 mb-1">
                            <img src="${contract.companySignatureUrl}" alt="Company Signature" class="max-h-8 max-w-full object-contain" />
                        </div>`
                                : `<div class="border-b-2 border-indigo-300 h-6 mb-1"></div>`
                        }
                        <p class="text-xs text-indigo-600">التاريخ: ${formatDate(contract.dealDate)}</p>
                    </div>
                    <!-- Seller Signature -->
                    <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2 border border-green-200 text-center">
                        <h3 class="font-bold mb-1 text-green-700 text-xs">البائع</h3>
                        <div class="border-b-2 border-green-300 h-6 mb-1"></div>
                        <p class="text-xs text-green-600">التاريخ: ${formatDate(contract.dealDate)}</p>
                    </div>
                    <!-- Buyer Signature -->
                    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2 border border-blue-200 text-center">
                        <h3 class="font-bold mb-1 text-blue-700 text-xs">المشتري</h3>
                        ${
                            contract.customerSignatureUrl
                                ? `<div class="flex items-center justify-center h-12 mb-1">
                            <img src="${contract.customerSignatureUrl}" alt="Customer Signature" class="max-h-12 max-w-full object-contain" />
                        </div>`
                                : `<div class="border-b-2 border-blue-300 h-6 mb-1"></div>`
                        }
                        <p class="text-xs text-blue-600">التاريخ: ${formatDate(contract.dealDate)}</p>
                    </div>
                    `
                            : `
                    <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-3 border border-gray-200 text-center">
                        <h3 class="font-bold mb-2 text-gray-700 text-sm">توقيع المشتري</h3>
                        ${
                            contract.customerSignatureUrl
                                ? `<div class="flex items-center justify-center h-12 mb-2">
                            <img src="${contract.customerSignatureUrl}" alt="Customer Signature" class="max-h-12 max-w-full object-contain" />
                        </div>`
                                : `<div class="border-b-2 border-gray-300 h-8 mb-2"></div>`
                        }
                        <p class="text-xs text-gray-600">التاريخ: ${formatDate(contract.dealDate)}</p>
                    </div>
                    <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-3 border border-gray-200 text-center">
                        <h3 class="font-bold mb-2 text-gray-700 text-sm">توقيع البائع</h3>
                        ${
                            contract.companySignatureUrl
                                ? `<div class="flex items-center justify-center h-12 mb-2">
                            <img src="${contract.companySignatureUrl}" alt="Company Signature" class="max-h-12 max-w-full object-contain" />
                        </div>`
                                : `<div class="border-b-2 border-gray-300 h-8 mb-2"></div>`
                        }
                        <p class="text-xs text-gray-600">التاريخ: ${formatDate(contract.dealDate)}</p>
                    </div>
                    `
                    }
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

/**
 * Generate Hebrew contract HTML
 */
function generateHebrewContractHTML(contract: CarContract, companyInfo: any): string {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('he-IL', {
            style: 'currency',
            currency: 'ILS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    };

    // Function to get localized deal type in Hebrew
    const getDealTypeLabel = (dealType: string): string => {
        const dealTypeLabels: { [key: string]: string } = {
            new_sale: 'עסקת מכר רכב חדש',
            used_sale: 'עסקת מכר רכב יד שנייה',
            new_used_sale: 'מכירה חדש/יד שנייה',
            new_used_sale_tax_inclusive: 'מכירה חדש/יד שנייה כולל מס לסוחרים',
            exchange: 'החלפה',
            intermediary: 'תיווך',
            financing_assistance_intermediary: 'תיווך סיוע מימון',
            company_commission: 'עמלת חברות',
            normal: 'מכירה',
            'trade-in': 'החלפה',
        };
        return dealTypeLabels[dealType] || dealType;
    };

    return `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>הסכם מכירת רכב</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @page { size: A4; margin: 8mm; }
            body { font-family: 'Arial', 'Tahoma', sans-serif; font-size: 13px; line-height: 1.3; }
            .avoid-break-inside { page-break-inside: avoid; }
            .section-title {
                text-align: right !important;
                display: flex;
                flex-direction: row-reverse;
            }
            .compact-section { margin-bottom: 12px; }
            .compact-header { padding: 16px 24px; }
            .compact-content { padding: 20px; }
        </style>
    </head>
    <body>
        <div class="bg-white w-full max-w-none avoid-break-inside" style="direction: rtl">
            <!-- Modern Colorful Header -->
            <div class="relative overflow-hidden w-full">
                <!-- Background Gradient -->
                <div class="absolute inset-0 bg-gradient-to-l from-blue-700 to-indigo-700"></div>

                <!-- Header Content -->
                <div class="relative px-8 py-6 w-full">
                    <div class="flex items-center justify-between w-full">
                        <!-- Company Logo and Info (moved to right for RTL) -->
                        <div class="flex items-center gap-6 text-white">

                          ${
                              companyInfo?.logo_url
                                  ? `
                                <div class="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                    <img src="${companyInfo.logo_url}" alt="לוגו החברה" class="w-16 h-16 object-contain" />
                                </div>
                            `
                                  : ''
                          }

                            <div class="text-right">
                                <h1 class="text-2xl font-bold mb-1">${companyInfo?.name || 'סוכנות רכב'}</h1>
                                <div class="space-y-1 text-sm opacity-90">
                                    ${
                                        companyInfo?.address
                                            ? `
                                        <p class="flex flex-row-reverse items-center gap-2 justify-end">
                                            <span>${companyInfo.address}</span>
                                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                                            </svg>
                                        </p>
                                    `
                                            : ''
                                    }
                                    ${
                                        companyInfo?.phone
                                            ? `
                                        <p class="flex flex-row-reverse items-center gap-2 justify-end">
                                            <span>${companyInfo.phone}</span>
                                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                            </svg>
                                        </p>
                                    `
                                            : ''
                                    }
                                    ${
                                        companyInfo?.tax_number
                                            ? `
                                        <p class="flex flex-row-reverse items-center gap-2 justify-end">
                                            <span>מס׳ עוסק: ${companyInfo.tax_number}</span>
                                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                                                <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd" />
                                            </svg>
                                        </p>
                                    `
                                            : ''
                                    }
                                </div>
                            </div>
                          
                        </div>

                        <!-- Contract Title and Date (moved to left for RTL) -->
                        <div class="text-white text-left">
                            <h2 class="text-xl font-bold mb-2">הסכם רכישת רכב</h2>
                            <p class="text-sm font-medium text-white/80 mb-2">${getDealTypeLabel(contract.dealType)}</p>
                            <div class="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                                <p class="text-sm font-medium">תאריך החוזה</p>
                                <p class="text-lg font-bold">${formatDate(contract.dealDate)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Contract Content -->
            <div class="compact-content space-y-3 w-full">
                <!-- Parties Information -->
                ${
                    contract.dealType === 'intermediary'
                        ? `
                        <!-- Three-party layout for intermediary deals -->
                        <div class="compact-section">
                            <div class="grid grid-cols-3 gap-3 w-full">
                                <!-- Company (Intermediary) -->
                                <div class="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
                                    <h2 class="font-bold mb-3 text-lg text-purple-700 flex items-center gap-2 justify-end section-title">
                                        <span>חברה (מתווך)</span>
                                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zM14 6a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h10z" />
                                        </svg>
                                    </h2>
                                    <div class="space-y-1 text-xs text-right">
                                        <p><span class="font-semibold text-purple-700">חברה:</span> ${contract.companyName}</p>
                                        <p><span class="font-semibold text-purple-700">מס׳ עוסק:</span> ${contract.companyTaxNumber}</p>
                                        <p><span class="font-semibold text-purple-700">כתובת:</span> ${contract.companyAddress}</p>
                                        <p><span class="font-semibold text-purple-700">טלפון:</span> ${contract.companyPhone}</p>
                                    </div>
                                </div>

                                <!-- Actual Seller -->
                                <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                                    <h2 class="font-bold mb-3 text-lg text-green-700 flex items-center gap-2 justify-end section-title">
                                        <span>המוכר בפועל</span>
                                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                        </svg>
                                    </h2>
                                    <div class="space-y-1 text-xs text-right">
                                        <p><span class="font-semibold text-green-700">שם:</span> ${contract.actualSeller?.name || 'לא צוין'}</p>
                                        <p><span class="font-semibold text-green-700">ת.ז.:</span> ${contract.actualSeller?.id || 'לא צוין'}</p>
                                        <p><span class="font-semibold text-green-700">כתובת:</span> ${contract.actualSeller?.address || 'לא צוין'}</p>
                                        <p><span class="font-semibold text-green-700">טלפון:</span> ${contract.actualSeller?.phone || 'לא צוין'}</p>
                                    </div>
                                </div>

                                <!-- Buyer -->
                                <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                                    <h2 class="font-bold mb-3 text-lg text-blue-700 flex items-center gap-2 justify-end section-title">
                                        <span>קונה</span>
                                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                                        </svg>
                                    </h2>
                                    <div class="space-y-1 text-xs text-right">
                                        <p><span class="font-semibold text-blue-700">שם:</span> ${contract.buyerName}</p>
                                        <p><span class="font-semibold text-blue-700">ת.ז.:</span> ${contract.buyerId}</p>
                                        <p><span class="font-semibold text-blue-700">כתובת:</span> ${contract.buyerAddress}</p>
                                        <p><span class="font-semibold text-blue-700">טלפון:</span> ${contract.buyerPhone}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        `
                        : `
                        <!-- Two-party layout for regular deals -->
                        <div class="compact-section">
                            <div class="grid grid-cols-2 gap-4 w-full">
                                <!-- Buyer -->
                                <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                                    <h2 class="font-bold mb-3 text-lg text-blue-700 flex items-center gap-2 justify-end section-title">
                                        <span>קונה</span>
                                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                                        </svg>
                                    </h2>
                                    <div class="space-y-1 text-xs text-right">
                                        <p><span class="font-semibold text-blue-700">שם:</span> ${contract.buyerName}</p>
                                        <p><span class="font-semibold text-blue-700">ת.ז.:</span> ${contract.buyerId}</p>
                                        <p><span class="font-semibold text-blue-700">כתובת:</span> ${contract.buyerAddress}</p>
                                        <p><span class="font-semibold text-blue-700">טלפון:</span> ${contract.buyerPhone}</p>
                                    </div>
                                </div>

                                <!-- Seller -->
                                <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                                    <h2 class="font-bold mb-3 text-lg text-green-700 flex items-center gap-2 justify-end section-title">
                                        <span>מוכר</span>
                                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                        </svg>
                                    </h2>
                                    <div class="space-y-1 text-xs text-right">
                                        <p><span class="font-semibold text-green-700">חברה:</span> ${contract.sellerName}</p>
                                        <p><span class="font-semibold text-green-700">מס׳ עוסק:</span> ${contract.sellerTaxNumber}</p>
                                        <p><span class="font-semibold text-green-700">כתובת:</span> ${contract.sellerAddress}</p>
                                        <p><span class="font-semibold text-green-700">טלפון:</span> ${contract.sellerPhone}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        `
                }

                <!-- Vehicle Information -->
                <div class="compact-section">
                ${
                    contract.dealType === 'trade-in'
                        ? `
                    <!-- Exchange Deal - Two Vehicles Side by Side -->
                    <div class="grid grid-cols-2 gap-4">
                        <!-- Car Being Sold (Primary Vehicle) -->
                        <div class="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
                            <h2 class="font-bold mb-3 text-lg text-purple-700 flex items-center gap-2 justify-end section-title">
                                <span>הרכב הנמכר</span>
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                            </h2>
                            <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-right">
                                <p><span class="font-semibold text-purple-700">יצרן:</span> ${contract.carMake}</p>
                                <p><span class="font-semibold text-purple-700">דגם:</span> ${contract.carModel}</p>
                                <p><span class="font-semibold text-purple-700">שנה:</span> ${contract.carYear}</p>
                                <p><span class="font-semibold text-purple-700">סוג:</span> ${contract.carType}</p>
                                <p><span class="font-semibold text-purple-700">מס׳ רישוי:</span> ${contract.carPlateNumber}</p>
                                <p><span class="font-semibold text-purple-700">קילומטרז׳:</span> ${contract.carKilometers.toLocaleString('en-US')}</p>
                                ${contract.carVin ? `<p><span class="font-semibold text-purple-700">מס׳ שלדה:</span> ${contract.carVin}</p>` : ''}
                                ${contract.carEngineNumber ? `<p><span class="font-semibold text-purple-700">מס׳ מנוע:</span> ${contract.carEngineNumber}</p>` : ''}
                            </div>
                        </div>

                        <!-- Trade-in Vehicle (Car Received from Client) -->
                        ${
                            contract.tradeInCar
                                ? `
                            <div class="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200">
                                <h2 class="font-bold mb-3 text-lg text-orange-700 flex items-center gap-2 justify-end section-title">
                                    <span>הרכב המתקבל מהלקוח</span>
                                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                                    </svg>
                                </h2>
                                <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-right">
                                    <p><span class="font-semibold text-orange-700">יצרן:</span> ${contract.tradeInCar.make}</p>
                                    <p><span class="font-semibold text-orange-700">דגם:</span> ${contract.tradeInCar.model}</p>
                                    <p><span class="font-semibold text-orange-700">סוג:</span> ${contract.tradeInCar.type}</p>
                                    <p><span class="font-semibold text-orange-700">שנה:</span> ${contract.tradeInCar.year}</p>
                                    <p><span class="font-semibold text-orange-700">מס׳ רישוי:</span> ${contract.tradeInCar.plateNumber}</p>
                                    <p><span class="font-semibold text-orange-700">קילומטרז׳:</span> ${contract.tradeInCar.kilometers.toLocaleString('en-US')}</p>
                                </div>
                            </div>
                        `
                                : ''
                        }
                    </div>
                `
                        : `
                    <!-- Single Vehicle Information (Non-Exchange Deal) -->
                    <div class="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
                        <h2 class="font-bold mb-3 text-lg text-purple-700 flex items-center gap-2 justify-end section-title">
                            <span>פרטי הרכב</span>
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                        </h2>
                        <div class="grid grid-cols-3 gap-x-3 gap-y-1 text-xs text-right">
                            <p><span class="font-semibold text-purple-700">יצרן:</span> ${contract.carMake}</p>
                            <p><span class="font-semibold text-purple-700">דגם:</span> ${contract.carModel}</p>
                            <p><span class="font-semibold text-purple-700">שנה:</span> ${contract.carYear}</p>
                            <p><span class="font-semibold text-purple-700">סוג:</span> ${contract.carType}</p>
                            <p><span class="font-semibold text-purple-700">מס׳ רישוי:</span> ${contract.carPlateNumber}</p>
                            <p><span class="font-semibold text-purple-700">קילומטרז׳:</span> ${contract.carKilometers.toLocaleString('en-US')}</p>
                            ${contract.carVin ? `<p><span class="font-semibold text-purple-700">מס׳ שלדה:</span> ${contract.carVin}</p>` : ''}
                            ${contract.carEngineNumber ? `<p><span class="font-semibold text-purple-700">מס׳ מנוע:</span> ${contract.carEngineNumber}</p>` : ''}
                        </div>
                    </div>
                `
                }
                </div>

                <!-- Payment Information -->
                <div class="compact-section">
                    <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
                        <div class="grid grid-cols-2 gap-4 items-start">
                            <!-- Payment Details Header -->
                            <div class="space-y-3">
                                <h2 class="font-bold text-lg text-emerald-700 flex items-center gap-2 justify-end section-title">
                                    ${contract.dealType === 'trade-in' ? '<span>פרטי החלפה</span>' : '<span>פרטי תשלום</span>'}
                                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4z" />
                                        <path d="M14 6a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h10zM4 8a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                                    </svg>
                                </h2>
                            </div>
                            
                            <!-- Total Amount -->
                            <div>
                                <p class="text-base font-bold text-emerald-700 bg-white rounded-lg p-3 border-2 border-emerald-300 text-center">סכום כולל: ${formatCurrency(contract.dealAmount)}</p>
                            </div>
                        </div>
                        
                        ${
                            contract.dealType === 'trade-in' && contract.tradeInCar
                                ? `
                        <!-- Exchange Deal Breakdown - Compact -->
                        <div class="mt-2 bg-white rounded-lg p-1.5 border border-emerald-200">
                            <p class="text-xs text-right"><span class="font-semibold text-gray-600">ערך החלפה:</span> <span class="text-emerald-700">${formatCurrency(contract.tradeInCar.estimatedValue)}</span>${
                                contract.additionalCustomerAmount && contract.additionalCustomerAmount > 0
                                    ? `<p><span class="font-semibold text-gray-600">סכום נוסף מהלקוח:</span> <span class="text-blue-600">${formatCurrency(contract.additionalCustomerAmount)}</span></p>`
                                    : ''
                            }${
                                contract.additionalCompanyAmount && contract.additionalCompanyAmount > 0
                                    ? `<p><span class="font-semibold text-gray-600">סכום נוסף מהחברה:</span> <span class="text-orange-600">${formatCurrency(contract.additionalCompanyAmount)}</span></p>`
                                    : ''
                            }</p>
                        </div>
                        `
                                : ''
                        }
                        
                        <div class="mt-3 space-y-2">
                        ${
                            contract.paymentMethods && contract.paymentMethods.length > 0
                                ? `
                            <div class="bg-white rounded-lg p-1.5 border border-emerald-200">
                                <p class="text-xs text-right"><span class="font-semibold text-emerald-700">אמצעי תשלום:</span> <span class="flex-wrap gap-1.5 inline-flex">
                                    ${contract.paymentMethods
                                        .filter((method) => method.selected)
                                        .map((method) => {
                                            const methodLabels = {
                                                cash: 'תשלום במזומן',
                                                visa: 'כרטיס אשראי (ויזה)',
                                                bank_transfer: 'העברה בנקאית',
                                                check: 'תשלום בצ׳ק',
                                            };

                                            return `<span class="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border">${methodLabels[method.type] || method.type}</span>`;
                                        })
                                        .join(' ')}</span></p>
                            </div>
                        `
                                : ''
                        }
                        
                        ${
                            contract.paymentNotes
                                ? `
                            <div class="bg-white rounded-lg p-3 border border-emerald-200">
                                <h3 class="font-semibold text-emerald-700 mb-1 text-right text-xs">הערות תשלום:</h3>
                                <p class="text-xs text-gray-700 whitespace-pre-wrap text-right">${contract.paymentNotes}</p>
                            </div>
                        `
                                : ''
                        }
                        </div>
                    </div>
                </div>

                <!-- Terms and Conditions -->
                <div class="compact-section">
                    <div class="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-4 border border-red-200">
                        <h2 class="font-bold mb-3 text-lg text-red-700 flex items-center gap-2 justify-end section-title">
                            <span>תנאים והגבלות</span>
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1z" clip-rule="evenodd" />
                            </svg>
                        </h2>
                        <div class="grid grid-cols-2 gap-4 text-xs text-right">
                            <div class="space-y-2">
                                <!-- Original Terms -->
                                <div class="bg-white rounded p-2 border border-red-200">• המוכר מבטיח כי הרכב נקי מכל שעבודים או החרמות</div>
                                <div class="bg-white rounded p-2 border border-red-200">• הרכב נמכר "כפי שהוא" ללא כל אחריות מפורשת או משתמעת</div>
                                <div class="bg-white rounded p-2 border border-red-200">• המוכר מסכים להעביר בעלות תוך ${contract.ownershipTransferDays} ימים</div>
                                <!-- New Terms -->
                                <div class="bg-white rounded p-2 border border-red-200">• החזקה ברכב תימסר לקונה (${formatDate(contract.dealDate)}) ומוסכם על הצדדים כי מיום העברת החזקה יהיה הרכב של הקונה ושלו בלבד, גם אם טרם הועברה הבעלות הפורמלית במשרד התחבורה ו/או משרד הרישוי</div>
                                <div class="bg-white rounded p-2 border border-red-200">• המוכר מתחייב לשאת בכל קנס בגין חניה או תעבורה או כל תשלום אחר הקשור לשימוש בכלי הרכב, עד מועד המסירה</div>
                            </div>
                            <div class="space-y-2">
                                <div class="bg-white rounded p-2 border border-red-200">• הצדדים מסכימים כי הוצאות העברת הבעלות יחולו על הקונה</div>
                                <div class="bg-white rounded p-2 border border-red-200">• צד המפר הפרה יסודית את החוזה ישלם לצד מנגד סך של 2000 ש"ח, כפיצוי קבוע ומוסכם מראש, ללא הוכחת נזק</div>
                                <div class="bg-white rounded p-2 border border-red-200">• מוסכם בין הצדדים כי אוטו שוק רוכשת כלי רכב הן מספקי רכב מסודרים והן מלקוחות פרטיים וכי לא ידוע לה על הורדת ערך או עבר ביטוחי בעניינים וכי מחובת הרוכש לבדוק נתונים אלה</div>
                                <div class="bg-white rounded p-2 border border-red-200">• הקונה מצהיר כי בדק את הרכב, את מצבו החיצוני, הפנימי והמכני, ומצא כי הרכב במצב תקין וטוב לשביעת רצונו</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Signatures -->
                <div class="${contract.isIntermediaryDeal ? 'grid grid-cols-3 gap-3 pt-2' : 'grid grid-cols-2 gap-4 pt-4'} w-full">
                    ${
                        contract.isIntermediaryDeal
                            ? `
                    <!-- Company Signature -->
                    <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-2 border border-indigo-200 text-center">
                        <h3 class="font-bold mb-1 text-indigo-700 text-xs">חברה</h3>
                        ${
                            contract.companySignatureUrl
                                ? `<div class="flex items-center justify-center h-8 mb-1">
                            <img src="${contract.companySignatureUrl}" alt="Company Signature" class="max-h-8 max-w-full object-contain" />
                        </div>`
                                : `<div class="border-b-2 border-indigo-300 h-6 mb-1"></div>`
                        }
                        <p class="text-xs text-indigo-600">תאריך: ${formatDate(contract.dealDate)}</p>
                    </div>
                    <!-- Seller Signature -->
                    <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2 border border-green-200 text-center">
                        <h3 class="font-bold mb-1 text-green-700 text-xs">מוכר</h3>
                        <div class="border-b-2 border-green-300 h-6 mb-1"></div>
                        <p class="text-xs text-green-600">תאריך: ${formatDate(contract.dealDate)}</p>
                    </div>
                    <!-- Buyer Signature -->
                    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2 border border-blue-200 text-center">
                        <h3 class="font-bold mb-1 text-blue-700 text-xs">קונה</h3>
                        ${
                            contract.customerSignatureUrl
                                ? `<div class="flex items-center justify-center h-12 mb-1">
                            <img src="${contract.customerSignatureUrl}" alt="Customer Signature" class="max-h-12 max-w-full object-contain" />
                        </div>`
                                : `<div class="border-b-2 border-blue-300 h-6 mb-1"></div>`
                        }
                        <p class="text-xs text-blue-600">תאריך: ${formatDate(contract.dealDate)}</p>
                    </div>
                    `
                            : `
                    <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-3 border border-gray-200 text-center">
                        <h3 class="font-bold mb-2 text-gray-700 text-sm">חתימת קונה</h3>
                        ${
                            contract.customerSignatureUrl
                                ? `<div class="flex items-center justify-center h-12 mb-2">
                            <img src="${contract.customerSignatureUrl}" alt="Customer Signature" class="max-h-12 max-w-full object-contain" />
                        </div>`
                                : `<div class="border-b-2 border-gray-300 h-8 mb-2"></div>`
                        }
                        <p class="text-xs text-gray-600">תאריך: ${formatDate(contract.dealDate)}</p>
                    </div>
                    <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-3 border border-gray-200 text-center">
                        <h3 class="font-bold mb-2 text-gray-700 text-sm">חתימת מוכר</h3>
                        ${
                            contract.companySignatureUrl
                                ? `<div class="flex items-center justify-center h-12 mb-2">
                            <img src="${contract.companySignatureUrl}" alt="Company Signature" class="max-h-12 max-w-full object-contain" />
                        </div>`
                                : `<div class="border-b-2 border-gray-300 h-8 mb-2"></div>`
                        }
                        <p class="text-xs text-gray-600">תאריך: ${formatDate(contract.dealDate)}</p>
                    </div>
                    `
                    }
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}
