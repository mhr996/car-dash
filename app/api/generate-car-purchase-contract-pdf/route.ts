import { NextRequest, NextResponse } from 'next/server';
import { PDFService } from '@/utils/pdf-service';
import { CarContract } from '@/types/contract';

export async function POST(request: NextRequest) {
    try {
        const { contractHtml, filename = 'car-purchase-contract.pdf', options = {} } = await request.json();

        if (!contractHtml) {
            return NextResponse.json({ error: 'Contract HTML is required' }, { status: 400 });
        }

        let htmlContent: string;

        // Check if contractHtml is a JSON string (new format) or HTML (old format)
        try {
            const parsedData = JSON.parse(contractHtml);

            if (parsedData.contract && parsedData.template && parsedData.contractType === 'car-purchase') {
                // New format: generate HTML from car purchase template
                htmlContent = await generateCarPurchaseContractHTML(parsedData.contract, parsedData.template);
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
        console.error('Car purchase contract PDF generation error:', error);
        return NextResponse.json({ error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}

/**
 * Generate HTML from car purchase contract template on server-side
 */
async function generateCarPurchaseContractHTML(contract: CarContract, template: string): Promise<string> {
    // Import company info function
    const { getCompanyInfo } = await import('@/lib/company-info');

    try {
        const companyInfo = await getCompanyInfo(true); // Use service role for API routes

        // Generate HTML based on template
        switch (template) {
            case 'english':
                return generateEnglishCarPurchaseContractHTML(contract, companyInfo);
            case 'arabic':
                return generateArabicCarPurchaseContractHTML(contract, companyInfo);
            case 'hebrew':
                return generateHebrewCarPurchaseContractHTML(contract, companyInfo);
            default:
                return generateEnglishCarPurchaseContractHTML(contract, companyInfo);
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
                return generateEnglishCarPurchaseContractHTML(contract, defaultCompanyInfo);
            case 'arabic':
                return generateArabicCarPurchaseContractHTML(contract, defaultCompanyInfo);
            case 'hebrew':
                return generateHebrewCarPurchaseContractHTML(contract, defaultCompanyInfo);
            default:
                return generateEnglishCarPurchaseContractHTML(contract, defaultCompanyInfo);
        }
    }
}

/**
 * Generate English car purchase contract HTML
 * For car purchase contracts: seller = provider/customer, buyer = our company
 */
function generateEnglishCarPurchaseContractHTML(contract: CarContract, companyInfo: any): string {
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
        <title>Car Purchase Agreement</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @page { size: A4; margin: 8mm; }
            body { font-family: Arial, sans-serif; font-size: 11px; }
            .avoid-break-inside { page-break-inside: avoid; }
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
                <div class="relative px-6 py-4 w-full">
                    <div class="flex items-center justify-between w-full">
                        <!-- Company Logo and Info -->
                        <div class="flex items-center gap-4 text-white">
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
                            <h2 class="text-base font-bold mb-1">Car Purchase Agreement</h2>
                            <div class="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20">
                                <p class="text-xs font-medium">Contract Date</p>
                                <p class="text-sm font-bold">${formatDate(contract.dealDate)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Contract Content -->
            <div class="p-4 space-y-3 w-full">
                <!-- Parties Information -->
                <div class="grid grid-cols-2 gap-3 w-full">
                    <!-- Seller (Provider/Customer) -->
                    <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                        <h2 class="font-bold mb-2 text-sm text-green-700 flex items-center gap-1.5">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                            </svg>
                            Seller
                        </h2>
                        <div class="space-y-1 text-xs">
                            <p><span class="font-semibold text-green-700">Name:</span> ${contract.sellerName}</p>
                            <p><span class="font-semibold text-green-700">ID:</span> ${contract.sellerTaxNumber}</p>
                            <p><span class="font-semibold text-green-700">Phone:</span> ${contract.sellerPhone}</p>
                            <p><span class="font-semibold text-green-700">Address:</span> ${contract.sellerAddress}</p>
                        </div>
                    </div>

                    <!-- Buyer (Our Company) -->
                    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                        <h2 class="font-bold mb-2 text-sm text-blue-700 flex items-center gap-1.5">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                            </svg>
                            Buyer
                        </h2>
                        <div class="space-y-1 text-xs">
                            <p><span class="font-semibold text-blue-700">Company:</span> ${contract.buyerName}</p>
                            <p><span class="font-semibold text-blue-700">Tax Number:</span> ${contract.buyerId}</p>
                            <p><span class="font-semibold text-blue-700">Phone:</span> ${contract.buyerPhone}</p>
                            <p><span class="font-semibold text-blue-700">Address:</span> ${contract.buyerAddress}</p>
                        </div>
                    </div>
                </div>

                <!-- Vehicle Information -->
                <div class="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-3 border border-purple-200">
                    <h2 class="font-bold mb-2 text-sm text-purple-700 flex items-center gap-1.5">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                        </svg>
                        Vehicle Information
                    </h2>
                    <div class="grid grid-cols-2 gap-2 text-xs">
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
                <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-200">
                    <h2 class="font-bold mb-2 text-sm text-emerald-700 flex items-center gap-1.5">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4z" />
                            <path d="M14 6a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h10zM4 8a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                        </svg>
                        Purchase Details
                    </h2>
                    <p class="text-base font-bold text-emerald-700 bg-white rounded-lg p-2 border-2 border-emerald-300 text-center">Purchase Amount: ${formatCurrency(contract.carBuyPrice || contract.dealAmount)}</p>
                </div>

                <!-- Terms and Conditions -->
                <div class="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-3 border border-red-200">
                    <h2 class="font-bold mb-2 text-sm text-red-700 flex items-center gap-1.5">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1z" clip-rule="evenodd" />
                        </svg>
                        Terms and Conditions
                    </h2>
                    <div class="space-y-1 text-xs">
                        <div class="bg-white rounded p-2 border border-red-200">• The seller guarantees that the vehicle is free of any liens or encumbrances.</div>
                        <div class="bg-white rounded p-2 border border-red-200">• The vehicle is sold "as is" with no warranties expressed or implied.</div>
                        <div class="bg-white rounded p-2 border border-red-200">• The seller agrees to transfer ownership within ${contract.ownershipTransferDays} days.</div>
                        <div class="bg-white rounded p-2 border border-red-200">• The buyer has inspected the vehicle and agrees to its current condition.</div>
                        <div class="bg-white rounded p-2 border border-red-200">• This agreement is binding upon both parties once signed.</div>
                        <div class="bg-white rounded p-2 border border-red-200">• The buyer (company) purchases this vehicle for business purposes.</div>
                    </div>
                </div>

                <!-- Signatures -->
                <div class="grid grid-cols-2 gap-3 pt-3 w-full">
                    <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-3 border border-gray-200 text-center">
                        <h3 class="font-bold mb-2 text-xs text-gray-700">Seller's Signature</h3>
                        <div class="border-b-2 border-gray-300 mb-2 h-8"></div>
                        <p class="text-xs text-gray-600">Date: ______________</p>
                    </div>
                    <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-3 border border-gray-200 text-center">
                        <h3 class="font-bold mb-2 text-xs text-gray-700">Buyer's Signature</h3>
                        <div class="border-b-2 border-gray-300 mb-2 h-8"></div>
                        <p class="text-xs text-gray-600">Date: ______________</p>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>`;
}

/**
 * Generate Arabic car purchase contract HTML
 */
function generateArabicCarPurchaseContractHTML(contract: CarContract, companyInfo: any): string {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ar', {
            style: 'currency',
            currency: 'ILS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ar', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    };

    return `
    <!DOCTYPE html>
    <html lang="ar">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>عقد شراء سيارة</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap" rel="stylesheet">
     
        <style>
            @page { size: A4; margin: 8mm; }
            body { font-family: 'Almarai', sans-serif; font-size: 11px; }
            .avoid-break-inside { page-break-inside: avoid; }
            h1 { font-size: 18px; }
            h2 { font-size: 14px; }
            h3 { font-size: 12px; }
            .text-sm { font-size: 10px; }
            .text-xs { font-size: 9px; }
        </style>
    </head>
    <body>
        <div class="bg-white w-full max-w-none avoid-break-inside" style="direction: rtl">
            <!-- رأس الصفحة الحديث والملون -->
            <div class="relative overflow-hidden w-full">
                <!-- خلفية متدرجة -->
                <div class="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700"></div>

                <!-- محتوى الرأس -->
                <div class="relative px-6 py-4 w-full">
                    <div class="flex items-center justify-between w-full">
                        <!-- شعار الشركة والمعلومات -->
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
                                <h1 class="text-xl font-bold mb-0.5">${companyInfo?.name || 'معرض السيارات'}</h1>
                                <div class="space-y-0.5 text-xs opacity-90">
                                    ${
                                        companyInfo?.address
                                            ? `
                                        <p class="flex items-center gap-1.5">
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
                                        <p class="flex items-center gap-1.5">
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
                                        <p class="flex items-center gap-1.5">
                                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                                                <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd" />
                                            </svg>
                                            <span>الرقم الضريبي: ${companyInfo.tax_number}</span>
                                        </p>
                                    `
                                            : ''
                                    }
                                </div>
                            </div>
                        </div>

                        <!-- عنوان العقد والتاريخ -->
                        <div class="text-white text-left">
                            <h2 class="text-base font-bold mb-1">عقد شراء سيارة</h2>
                            <div class="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20">
                                <p class="text-xs font-medium">تاريخ العقد</p>
                                <p class="text-sm font-bold">${formatDate(contract.dealDate)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- محتوى العقد -->
            <div class="p-4 space-y-3 w-full">
                <!-- معلومات الأطراف -->
                <div class="grid grid-cols-2 gap-3 w-full">
                    <!-- البائع (المزود/العميل) -->
                    <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                        <h2 class="font-bold mb-2 text-sm text-green-700 flex items-center gap-1.5">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                            </svg>
                            البائع
                        </h2>
                        <div class="space-y-1 text-xs">
                            <p><span class="font-semibold text-green-700">الاسم:</span> ${contract.sellerName}</p>
                            <p><span class="font-semibold text-green-700">رقم الهوية:</span> ${contract.sellerTaxNumber}</p>
                            <p><span class="font-semibold text-green-700">الهاتف:</span> ${contract.sellerPhone}</p>
                            <p><span class="font-semibold text-green-700">العنوان:</span> ${contract.sellerAddress}</p>
                        </div>
                    </div>

                    <!-- المشتري (شركتنا) -->
                    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                        <h2 class="font-bold mb-2 text-sm text-blue-700 flex items-center gap-1.5">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                            </svg>
                            المشتري
                        </h2>
                        <div class="space-y-1 text-xs">
                            <p><span class="font-semibold text-blue-700">الشركة:</span> ${contract.buyerName}</p>
                            <p><span class="font-semibold text-blue-700">الرقم الضريبي:</span> ${contract.buyerId}</p>
                            <p><span class="font-semibold text-blue-700">الهاتف:</span> ${contract.buyerPhone}</p>
                            <p><span class="font-semibold text-blue-700">العنوان:</span> ${contract.buyerAddress}</p>
                        </div>
                    </div>
                </div>

                <!-- معلومات السيارة -->
                <div class="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-3 border border-purple-200">
                    <h2 class="font-bold mb-2 text-sm text-purple-700 flex items-center gap-1.5">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                        </svg>
                        معلومات السيارة
                    </h2>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <p><span class="font-semibold text-purple-700">الماركة:</span> ${contract.carMake}</p>
                        <p><span class="font-semibold text-purple-700">الموديل:</span> ${contract.carModel}</p>
                        <p><span class="font-semibold text-purple-700">السنة:</span> ${contract.carYear}</p>
                        <p><span class="font-semibold text-purple-700">النوع:</span> ${contract.carType}</p>
                        <p><span class="font-semibold text-purple-700">رقم اللوحة:</span> ${contract.carPlateNumber}</p>
                        <p><span class="font-semibold text-purple-700">الكيلومترات:</span> ${contract.carKilometers.toLocaleString()}</p>
                        ${contract.carVin ? `<p><span class="font-semibold text-purple-700">رقم الشاسيه:</span> ${contract.carVin}</p>` : ''}
                        ${contract.carEngineNumber ? `<p><span class="font-semibold text-purple-700">رقم المحرك:</span> ${contract.carEngineNumber}</p>` : ''}
                    </div>
                </div>

                <!-- معلومات الدفع -->
                <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-200">
                    <h2 class="font-bold mb-2 text-sm text-emerald-700 flex items-center gap-1.5">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4z" />
                            <path d="M14 6a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h10zM4 8a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                        </svg>
                        تفاصيل الشراء
                    </h2>
                    <p class="text-base font-bold text-emerald-700 bg-white rounded-lg p-2 border-2 border-emerald-300 text-center">مبلغ الشراء: ${formatCurrency(contract.dealAmount)}</p>
                </div>

                <!-- الشروط والأحكام -->
                <div class="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-3 border border-red-200">
                    <h2 class="font-bold mb-2 text-sm text-red-700 flex items-center gap-1.5">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1z" clip-rule="evenodd" />
                        </svg>
                        الشروط والأحكام
                    </h2>
                    <div class="space-y-1 text-xs">
                        <div class="bg-white rounded p-2 border border-red-200">• يضمن البائع أن السيارة خالية من أي رهونات أو التزامات.</div>
                        <div class="bg-white rounded p-2 border border-red-200">• السيارة تباع "كما هي" بدون أي ضمانات صريحة أو ضمنية.</div>
                        <div class="bg-white rounded p-2 border border-red-200">• يوافق البائع على نقل الملكية خلال ${contract.ownershipTransferDays} يوماً.</div>
                        <div class="bg-white rounded p-2 border border-red-200">• المشتري قد فحص السيارة ويوافق على حالتها الحالية.</div>
                        <div class="bg-white rounded p-2 border border-red-200">• هذا الاتفاق ملزم لكلا الطرفين بمجرد التوقيع.</div>
                        <div class="bg-white rounded p-2 border border-red-200">• المشتري (الشركة) يشتري هذه السيارة لأغراض تجارية.</div>
                    </div>
                </div>

                <!-- التوقيعات -->
                <div class="grid grid-cols-2 gap-3 pt-3 w-full">
                    <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-3 border border-gray-200 text-center">
                        <h3 class="font-bold mb-2 text-xs text-gray-700">توقيع البائع</h3>
                        <div class="border-b-2 border-gray-300 mb-2 h-8"></div>
                        <p class="text-xs text-gray-600">التاريخ: ______________</p>
                    </div>
                    <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-3 border border-gray-200 text-center">
                        <h3 class="font-bold mb-2 text-xs text-gray-700">توقيع المشتري</h3>
                        <div class="border-b-2 border-gray-300 mb-2 h-8"></div>
                        <p class="text-xs text-gray-600">التاريخ: ______________</p>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>`;
}

/**
 * Generate Hebrew car purchase contract HTML
 */
/**
 * Generate Hebrew car purchase contract HTML
 */
function generateHebrewCarPurchaseContractHTML(contract: CarContract, companyInfo: any): string {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('he-IL', {
            style: 'currency',
            currency: 'ILS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('he-IL', {
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
            @page { size: A4; margin: 8mm; }
            body { font-family: Arial, sans-serif; font-size: 11px; }
            .avoid-break-inside { page-break-inside: avoid; }
            h1 { font-size: 18px; }
            h2 { font-size: 14px; }
            h3 { font-size: 12px; }
            .text-sm { font-size: 10px; }
            .text-xs { font-size: 9px; }
        </style>
    </head>
    <body>
        <div class="bg-white w-full max-w-none avoid-break-inside" style="direction: rtl">
            <!-- Modern Colorful Header -->
            <div class="relative overflow-hidden w-full">
                <!-- Background Gradient -->
                <div class="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700"></div>

                <!-- Header Content -->
                <div class="relative px-6 py-4 w-full">
                    <div class="flex items-center justify-between w-full">
                        <!-- Company Logo and Info -->
                        <div class="flex items-center gap-4 text-white">
                            ${
                                companyInfo?.logo_url
                                    ? `
                                <div class="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
                                    <img src="${companyInfo.logo_url}" alt="לוגו החברה" class="w-12 h-12 object-contain" />
                                </div>
                            `
                                    : ''
                            }
                            <div class="text-right">
                                <h1 class="text-xl font-bold mb-0.5">${companyInfo?.name || 'מסחר רכב'}</h1>
                                <div class="space-y-0.5 text-xs opacity-90">
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
                                            <span>ח.פ: ${companyInfo.tax_number}</span>
                                        </p>
                                    `
                                            : ''
                                    }
                                </div>
                            </div>
                        </div>

                        <!-- Contract Title and Date -->
                        <div class="text-white text-left">
                            <h2 class="text-base font-bold mb-1">הסכם רכישת רכב</h2>
                            <div class="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20">
                                <p class="text-xs font-medium">תאריך החוזה</p>
                                <p class="text-sm font-bold">${formatDate(contract.dealDate)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Contract Content -->
            <div class="p-4 space-y-3 w-full">
                <!-- Parties Information -->
                <div class="grid grid-cols-2 gap-3 w-full">
                    <!-- Seller (Provider/Customer) -->
                    <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                        <h2 class="font-bold mb-2 text-sm text-green-700 flex items-center gap-1.5">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                            </svg>
                            מוכר
                        </h2>
                        <div class="space-y-1 text-xs">
                            <p><span class="font-semibold text-green-700">שם:</span> ${contract.sellerName}</p>
                            <p><span class="font-semibold text-green-700">ת.ז:</span> ${contract.sellerTaxNumber}</p>
                            <p><span class="font-semibold text-green-700">טלפון:</span> ${contract.sellerPhone}</p>
                            <p><span class="font-semibold text-green-700">כתובת:</span> ${contract.sellerAddress}</p>
                        </div>
                    </div>

                    <!-- Buyer (Our Company) -->
                    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                        <h2 class="font-bold mb-2 text-sm text-blue-700 flex items-center gap-1.5">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                            </svg>
                            קונה
                        </h2>
                        <div class="space-y-1 text-xs">
                            <p><span class="font-semibold text-blue-700">חברה:</span> ${contract.buyerName}</p>
                            <p><span class="font-semibold text-blue-700">ח.פ:</span> ${contract.buyerId}</p>
                            <p><span class="font-semibold text-blue-700">טלפון:</span> ${contract.buyerPhone}</p>
                            <p><span class="font-semibold text-blue-700">כתובת:</span> ${contract.buyerAddress}</p>
                        </div>
                    </div>
                </div>

                <!-- Vehicle Information -->
                <div class="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-3 border border-purple-200">
                    <h2 class="font-bold mb-2 text-sm text-purple-700 flex items-center gap-1.5">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                        </svg>
                        פרטי הרכב
                    </h2>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <p><span class="font-semibold text-purple-700">יצרן:</span> ${contract.carMake}</p>
                        <p><span class="font-semibold text-purple-700">דגם:</span> ${contract.carModel}</p>
                        <p><span class="font-semibold text-purple-700">שנה:</span> ${contract.carYear}</p>
                        <p><span class="font-semibold text-purple-700">סוג:</span> ${contract.carType}</p>
                        <p><span class="font-semibold text-purple-700">מספר רישוי:</span> ${contract.carPlateNumber}</p>
                        <p><span class="font-semibold text-purple-700">קילומטרים:</span> ${contract.carKilometers.toLocaleString()}</p>
                        ${contract.carVin ? `<p><span class="font-semibold text-purple-700">מספר שילדה:</span> ${contract.carVin}</p>` : ''}
                        ${contract.carEngineNumber ? `<p><span class="font-semibold text-purple-700">מספר מנוע:</span> ${contract.carEngineNumber}</p>` : ''}
                    </div>
                </div>

                <!-- Payment Information -->
                <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-200">
                    <h2 class="font-bold mb-2 text-sm text-emerald-700 flex items-center gap-1.5">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4z" />
                            <path d="M14 6a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h10zM4 8a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                        </svg>
                        פרטי רכישה
                    </h2>
                    <p class="text-base font-bold text-emerald-700 bg-white rounded-lg p-2 border-2 border-emerald-300 text-center">סכום הרכישה: ${formatCurrency(contract.carBuyPrice || contract.dealAmount)}</p>
                </div>

                <!-- Terms and Conditions -->
                <div class="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-3 border border-red-200">
                    <h2 class="font-bold mb-2 text-sm text-red-700 flex items-center gap-1.5">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1z" clip-rule="evenodd" />
                        </svg>
                        תנאים והגבלות
                    </h2>
                    <div class="space-y-1 text-xs">
                        <div class="bg-white rounded p-2 border border-red-200">• המוכר מתחייב שהרכב נקי משעבוד או עיקול כלשהו.</div>
                        <div class="bg-white rounded p-2 border border-red-200">• הרכב נמכר "כמות שהוא" ללא כל אחריות, מפורשת או משתמעת.</div>
                        <div class="bg-white rounded p-2 border border-red-200">• המוכר מתחייב להעביר את הבעלות תוך ${contract.ownershipTransferDays} ימים.</div>
                        <div class="bg-white rounded p-2 border border-red-200">• הקונה בדק את הרכב ומסכים למצבו הנוכחי.</div>
                        <div class="bg-white rounded p-2 border border-red-200">• הסכם זה מחייב את שני הצדדים לאחר החתימה.</div>
                        <div class="bg-white rounded p-2 border border-red-200">• הקונה (החברה) רוכש רכב זה למטרות עסקיות.</div>
                    </div>
                </div>

                <!-- Signatures -->
                <div class="grid grid-cols-2 gap-3 pt-3 w-full">
                    <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-3 border border-gray-200 text-center">
                        <h3 class="font-bold mb-2 text-xs text-gray-700">חתימת המוכר</h3>
                        <div class="border-b-2 border-gray-300 mb-2 h-8"></div>
                        <p class="text-xs text-gray-600">תאריך: ______________</p>
                    </div>
                    <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-3 border border-gray-200 text-center">
                        <h3 class="font-bold mb-2 text-xs text-gray-700">חתימת הקונה</h3>
                        <div class="border-b-2 border-gray-300 mb-2 h-8"></div>
                        <p class="text-xs text-gray-600">תאריך: ______________</p>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>`;
}
