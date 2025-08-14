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
        return new NextResponse(pdfBuffer, {
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

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vehicle Purchase Agreement</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: Arial, sans-serif; }
            .avoid-break-inside { page-break-inside: avoid; }
        </style>
    </head>
    <body>
        <div class="bg-white w-full max-w-none avoid-break-inside" style="direction: ltr">
            <!-- Modern Colorful Header -->
            <div class="relative overflow-hidden w-full">
                <!-- Background Gradient -->
                <div class="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700"></div>

                <!-- Header Content -->
                <div class="relative px-8 py-6 w-full">
                    <div class="flex items-center justify-between w-full">
                        <!-- Company Logo and Info -->
                        <div class="flex items-center gap-6 text-white">
                            ${
                                companyInfo?.logo_url
                                    ? `
                                <div class="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                    <img src="${companyInfo.logo_url}" alt="Company Logo" class="w-16 h-16 object-contain" />
                                </div>
                            `
                                    : ''
                            }
                            <div class="text-left">
                                <h1 class="text-2xl font-bold mb-1">${companyInfo?.name || 'Car Dealership'}</h1>
                                <div class="space-y-1 text-sm opacity-90">
                                    ${
                                        companyInfo?.address
                                            ? `
                                        <p class="flex items-center gap-2">
                                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
                                        <p class="flex items-center gap-2">
                                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
                                        <p class="flex items-center gap-2">
                                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
                            <h2 class="text-xl font-bold mb-2">Vehicle Purchase Agreement</h2>
                            <div class="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                                <p class="text-sm font-medium">Contract Date</p>
                                <p class="text-lg font-bold">${formatDate(contract.dealDate)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Contract Content -->
            <div class="p-8 space-y-6 w-full">
                <!-- Parties Information -->
                <div class="grid grid-cols-2 gap-6 w-full">
                    <!-- Seller -->
                    <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                        <h2 class="font-bold mb-4 text-xl text-green-700 flex items-center gap-2">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                            </svg>
                            Seller
                        </h2>
                        <div class="space-y-2 text-sm">
                            <p><span class="font-semibold text-green-700">Company:</span> ${contract.sellerName}</p>
                            <p><span class="font-semibold text-green-700">Tax Number:</span> ${contract.sellerTaxNumber}</p>
                            <p><span class="font-semibold text-green-700">Address:</span> ${contract.sellerAddress}</p>
                            <p><span class="font-semibold text-green-700">Phone:</span> ${contract.sellerPhone}</p>
                        </div>
                    </div>

                    <!-- Buyer -->
                    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                        <h2 class="font-bold mb-4 text-xl text-blue-700 flex items-center gap-2">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                            </svg>
                            Buyer
                        </h2>
                        <div class="space-y-2 text-sm">
                            <p><span class="font-semibold text-blue-700">Name:</span> ${contract.buyerName}</p>
                            <p><span class="font-semibold text-blue-700">ID:</span> ${contract.buyerId}</p>
                            <p><span class="font-semibold text-blue-700">Address:</span> ${contract.buyerAddress}</p>
                            <p><span class="font-semibold text-blue-700">Phone:</span> ${contract.buyerPhone}</p>
                        </div>
                    </div>
                </div>

                <!-- Vehicle Information -->
                <div class="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-6 border border-purple-200">
                    <h2 class="font-bold mb-4 text-xl text-purple-700 flex items-center gap-2">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                        </svg>
                        Vehicle Information
                    </h2>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <p><span class="font-semibold text-purple-700">Make:</span> ${contract.carMake}</p>
                        <p><span class="font-semibold text-purple-700">Model:</span> ${contract.carModel}</p>
                        <p><span class="font-semibold text-purple-700">Year:</span> ${contract.carYear}</p>
                        <p><span class="font-semibold text-purple-700">Type:</span> ${contract.carType}</p>
                        <p><span class="font-semibold text-purple-700">Plate Number:</span> ${contract.carPlateNumber}</p>
                        <p><span class="font-semibold text-purple-700">Kilometers:</span> ${contract.carKilometers.toLocaleString()}</p>
                        ${contract.carVin ? `<p><span class="font-semibold text-purple-700">VIN:</span> ${contract.carVin}</p>` : ''}
                        ${contract.carEngineNumber ? `<p><span class="font-semibold text-purple-700">Engine Number:</span> ${contract.carEngineNumber}</p>` : ''}
                    </div>
                </div>

                <!-- Payment Information -->
                <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-6 border border-emerald-200">
                    <h2 class="font-bold mb-4 text-xl text-emerald-700 flex items-center gap-2">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4z" />
                            <path d="M14 6a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h10zM4 8a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                        </svg>
                        Payment Details
                    </h2>
                    <div class="space-y-4">
                        <p class="text-lg font-bold text-emerald-700 bg-white rounded-lg p-4 border-2 border-emerald-300 text-center">Total Amount: ${formatCurrency(contract.dealAmount)}</p>
                    </div>
                </div>

                <!-- Terms and Conditions -->
                <div class="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-6 border border-red-200">
                    <h2 class="font-bold mb-4 text-xl text-red-700 flex items-center gap-2">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1z" clip-rule="evenodd" />
                        </svg>
                        Terms and Conditions
                    </h2>
                    <div class="space-y-3 text-sm">
                        <div class="bg-white rounded-lg p-3 border border-red-200">• The seller guarantees that the vehicle is free of any liens or encumbrances.</div>
                        <div class="bg-white rounded-lg p-3 border border-red-200">• The vehicle is sold "as is" with no warranties expressed or implied.</div>
                        <div class="bg-white rounded-lg p-3 border border-red-200">• The seller agrees to transfer ownership within ${contract.ownershipTransferDays} days.</div>
                        <div class="bg-white rounded-lg p-3 border border-red-200">• The buyer has inspected the vehicle and agrees to its current condition.</div>
                        <div class="bg-white rounded-lg p-3 border border-red-200">• This agreement is binding upon both parties once signed.</div>
                    </div>
                </div>

                <!-- Signatures -->
                <div class="grid grid-cols-2 gap-6 pt-8 w-full">
                    <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-6 border border-gray-200 text-center">
                        <h3 class="font-bold mb-4 text-gray-700">Seller's Signature</h3>
                        <div class="border-b-2 border-gray-300 h-16 mb-4"></div>
                        <p class="text-sm text-gray-600">Date: ${formatDate(contract.dealDate)}</p>
                    </div>
                    <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-6 border border-gray-200 text-center">
                        <h3 class="font-bold mb-4 text-gray-700">Buyer's Signature</h3>
                        <div class="border-b-2 border-gray-300 h-16 mb-4"></div>
                        <p class="text-sm text-gray-600">Date: ${formatDate(contract.dealDate)}</p>
                    </div>
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

    return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>اتفاقية شراء مركبة</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap" rel="stylesheet">
        <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Almarai', 'Arial', 'Tahoma', sans-serif; }
            .avoid-break-inside { page-break-inside: avoid; }
            .section-title {
                text-align: right !important;
                display: flex;
                flex-direction: row-reverse;
            }
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
                                    <img src="${companyInfo.logo_url}" alt="شعار الشركة" class="w-16 h-16 object-contain" />
                                </div>
                            `
                                  : ''
                          }

                            <div class="text-right">
                                <h1 class="text-2xl font-bold mb-1">${companyInfo?.name || 'معرض السيارات'}</h1>
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
                                            <span>رقم الضريبة: ${companyInfo.tax_number}</span>
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
                            <h2 class="text-xl font-bold mb-2">اتفاقية شراء مركبة</h2>
                            <div class="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                                <p class="text-sm font-medium">تاريخ العقد</p>
                                <p class="text-lg font-bold">${formatDate(contract.dealDate)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Contract Content -->
            <div class="p-8 space-y-6 w-full">
                <!-- Parties Information -->
                <div class="grid grid-cols-2 gap-6 w-full">
                    <!-- Buyer -->
                    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                        <h2 class="font-bold mb-4 text-xl text-blue-700 flex items-center gap-2 justify-end section-title">
                            <span>المشتري</span>
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                            </svg>
                        </h2>
                        <div class="space-y-2 text-sm text-right">
                            <p><span class="font-semibold text-blue-700">الاسم:</span> ${contract.buyerName}</p>
                            <p><span class="font-semibold text-blue-700">الهوية:</span> ${contract.buyerId}</p>
                            <p><span class="font-semibold text-blue-700">العنوان:</span> ${contract.buyerAddress}</p>
                            <p><span class="font-semibold text-blue-700">الهاتف:</span> ${contract.buyerPhone}</p>
                        </div>
                    </div>

                    <!-- Seller -->
                    <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                        <h2 class="font-bold mb-4 text-xl text-green-700 flex items-center gap-2 justify-end section-title">
                            <span>البائع</span>
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                            </svg>
                        </h2>
                        <div class="space-y-2 text-sm text-right">
                            <p><span class="font-semibold text-green-700">الشركة:</span> ${contract.sellerName}</p>
                            <p><span class="font-semibold text-green-700">رقم الضريبة:</span> ${contract.sellerTaxNumber}</p>
                            <p><span class="font-semibold text-green-700">العنوان:</span> ${contract.sellerAddress}</p>
                            <p><span class="font-semibold text-green-700">الهاتف:</span> ${contract.sellerPhone}</p>
                        </div>
                    </div>
                </div>

                <!-- Vehicle Information -->
                <div class="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-6 border border-purple-200">
                    <h2 class="font-bold mb-4 text-xl text-purple-700 flex items-center gap-2 justify-end section-title">
                        <span>معلومات المركبة</span>
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                    </h2>
                    <div class="grid grid-cols-2 gap-4 text-sm text-right">
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

                <!-- Payment Information -->
                <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-6 border border-emerald-200">
                    <h2 class="font-bold mb-4 text-xl text-emerald-700 flex items-center gap-2 justify-end section-title">
                        <span>تفاصيل الدفع</span>
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4z" />
                            <path d="M14 6a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h10zM4 8a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                        </svg>
                    </h2>
                    <div class="space-y-4">
                        <p class="text-lg font-bold text-emerald-700 bg-white rounded-lg p-4 border-2 border-emerald-300 text-center">المبلغ الإجمالي: ${formatCurrency(contract.dealAmount)}</p>
                    </div>
                </div>

                <!-- Terms and Conditions -->
                <div class="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-6 border border-red-200">
                    <h2 class="font-bold mb-4 text-xl text-red-700 flex items-center gap-2 justify-end section-title">
                        <span>الشروط والأحكام</span>
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1z" clip-rule="evenodd" />
                        </svg>
                    </h2>
                    <div class="space-y-3 text-sm text-right">
                        <div class="bg-white rounded-lg p-3 border border-red-200">• يضمن البائع أن المركبة خالية من أي رهون أو أعباء.</div>
                        <div class="bg-white rounded-lg p-3 border border-red-200">• تباع المركبة "كما هي" دون أي ضمانات صريحة أو ضمنية.</div>
                        <div class="bg-white rounded-lg p-3 border border-red-200">• يوافق البائع على نقل الملكية خلال ${contract.ownershipTransferDays} أيام.</div>
                        <div class="bg-white rounded-lg p-3 border border-red-200">• قام المشتري بفحص المركبة ويوافق على حالتها الحالية.</div>
                        <div class="bg-white rounded-lg p-3 border border-red-200">• هذه الاتفاقية ملزمة لكلا الطرفين بمجرد التوقيع عليها.</div>
                    </div>
                </div>

                <!-- Signatures -->
                <div class="grid grid-cols-2 gap-6 pt-8 w-full">
                    <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-6 border border-gray-200 text-center">
                        <h3 class="font-bold mb-4 text-gray-700">توقيع المشتري</h3>
                        <div class="border-b-2 border-gray-300 h-16 mb-4"></div>
                        <p class="text-sm text-gray-600">التاريخ: ${formatDate(contract.dealDate)}</p>
                    </div>
                    <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-6 border border-gray-200 text-center">
                        <h3 class="font-bold mb-4 text-gray-700">توقيع البائع</h3>
                        <div class="border-b-2 border-gray-300 h-16 mb-4"></div>
                        <p class="text-sm text-gray-600">التاريخ: ${formatDate(contract.dealDate)}</p>
                    </div>
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

    return `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>הסכם רכישת רכב</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Arial', 'Tahoma', sans-serif; }
            .avoid-break-inside { page-break-inside: avoid; }
            .section-title {
                text-align: right !important;
                display: flex;
                flex-direction: row-reverse;
            }
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
                            <div class="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                                <p class="text-sm font-medium">תאריך החוזה</p>
                                <p class="text-lg font-bold">${formatDate(contract.dealDate)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Contract Content -->
            <div class="p-8 space-y-6 w-full">
                <!-- Parties Information -->
                <div class="grid grid-cols-2 gap-6 w-full">
                    <!-- Buyer -->
                    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                        <h2 class="font-bold mb-4 text-xl text-blue-700 flex items-center gap-2 justify-end section-title">
                            <span>קונה</span>
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                            </svg>
                        </h2>
                        <div class="space-y-2 text-sm text-right">
                            <p><span class="font-semibold text-blue-700">שם:</span> ${contract.buyerName}</p>
                            <p><span class="font-semibold text-blue-700">ת.ז.:</span> ${contract.buyerId}</p>
                            <p><span class="font-semibold text-blue-700">כתובת:</span> ${contract.buyerAddress}</p>
                            <p><span class="font-semibold text-blue-700">טלפון:</span> ${contract.buyerPhone}</p>
                        </div>
                    </div>

                    <!-- Seller -->
                    <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                        <h2 class="font-bold mb-4 text-xl text-green-700 flex items-center gap-2 justify-end section-title">
                            <span>מוכר</span>
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                            </svg>
                        </h2>
                        <div class="space-y-2 text-sm text-right">
                            <p><span class="font-semibold text-green-700">חברה:</span> ${contract.sellerName}</p>
                            <p><span class="font-semibold text-green-700">מס׳ עוסק:</span> ${contract.sellerTaxNumber}</p>
                            <p><span class="font-semibold text-green-700">כתובת:</span> ${contract.sellerAddress}</p>
                            <p><span class="font-semibold text-green-700">טלפון:</span> ${contract.sellerPhone}</p>
                        </div>
                    </div>
                </div>

                <!-- Vehicle Information -->
                <div class="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-6 border border-purple-200">
                    <h2 class="font-bold mb-4 text-xl text-purple-700 flex items-center gap-2 justify-end section-title">
                        <span>פרטי הרכב</span>
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                    </h2>
                    <div class="grid grid-cols-2 gap-4 text-sm text-right">
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

                <!-- Payment Information -->
                <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-6 border border-emerald-200">
                    <h2 class="font-bold mb-4 text-xl text-emerald-700 flex items-center gap-2 justify-end section-title">
                        <span>פרטי תשלום</span>
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4z" />
                            <path d="M14 6a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h10zM4 8a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                        </svg>
                    </h2>
                    <div class="space-y-4">
                        <p class="text-lg font-bold text-emerald-700 bg-white rounded-lg p-4 border-2 border-emerald-300 text-center">סכום כולל: ${formatCurrency(contract.dealAmount)}</p>
                    </div>
                </div>

                <!-- Terms and Conditions -->
                <div class="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-6 border border-red-200">
                    <h2 class="font-bold mb-4 text-xl text-red-700 flex items-center gap-2 justify-end section-title">
                        <span>תנאים והגבלות</span>
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1z" clip-rule="evenodd" />
                        </svg>
                    </h2>
                    <div class="space-y-3 text-sm text-right">
                        <div class="bg-white rounded-lg p-3 border border-red-200">• המוכר מבטיח כי הרכב נקי מכל שעבודים או החרמות.</div>
                        <div class="bg-white rounded-lg p-3 border border-red-200">• הרכב נמכר "כפי שהוא" ללא כל אחריות מפורשת או משתמעת.</div>
                        <div class="bg-white rounded-lg p-3 border border-red-200">• המוכר מסכים להעביר בעלות תוך ${contract.ownershipTransferDays} ימים.</div>
                        <div class="bg-white rounded-lg p-3 border border-red-200">• הקונה בדק את הרכב ומסכים למצבו הנוכחי.</div>
                        <div class="bg-white rounded-lg p-3 border border-red-200">• הסכם זה מחייב את שני הצדדים לאחר החתימה.</div>
                    </div>
                </div>

                <!-- Signatures -->
                <div class="grid grid-cols-2 gap-6 pt-8 w-full">
                    <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-6 border border-gray-200 text-center">
                        <h3 class="font-bold mb-4 text-gray-700">חתימת קונה</h3>
                        <div class="border-b-2 border-gray-300 h-16 mb-4"></div>
                        <p class="text-sm text-gray-600">תאריך: ${formatDate(contract.dealDate)}</p>
                    </div>
                    <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-6 border border-gray-200 text-center">
                        <h3 class="font-bold mb-4 text-gray-700">חתימת מוכר</h3>
                        <div class="border-b-2 border-gray-300 h-16 mb-4"></div>
                        <p class="text-sm text-gray-600">תאריך: ${formatDate(contract.dealDate)}</p>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}
