import React, { useEffect, useState } from 'react';
import { CarContract } from '@/types/contract';
import { getCompanyInfo, CompanyInfo } from '@/lib/company-info';

interface ContractProps {
    contract: CarContract;
}

const EnglishContractTemplate: React.FC<ContractProps> = ({ contract }) => {
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

    useEffect(() => {
        const loadCompanyInfo = async () => {
            try {
                const info = await getCompanyInfo();
                setCompanyInfo(info);
                console.log('Company info loaded:', info);
            } catch (error) {
                console.error('Failed to load company info:', error);
            }
        };
        loadCompanyInfo();
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'ILS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div id="contract-template" className="bg-white w-full max-w-none avoid-break-inside" style={{ direction: 'ltr' }}>
            {/* Modern Colorful Header */}
            <div className="relative overflow-hidden w-full">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700"></div>

                {/* Header Content */}
                <div className="relative px-8 py-6 w-full">
                    <div className="flex items-center justify-between w-full">
                        {/* Company Logo and Info */}
                        <div className="flex items-center gap-6 text-white">
                            {companyInfo?.logo_url && (
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                    <img
                                        src={companyInfo.logo_url}
                                        alt="Company Logo"
                                        className="w-16 h-16 object-contain"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                        }}
                                    />
                                </div>
                            )}
                            <div className="text-left">
                                <h1 className="text-2xl font-bold mb-1">{companyInfo?.name || 'Car Dealership'}</h1>
                                <div className="space-y-1 text-sm opacity-90">
                                    {companyInfo?.address && (
                                        <p className="flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                            </svg>
                                            <span>{companyInfo.address}</span>
                                        </p>
                                    )}
                                    {companyInfo?.phone && (
                                        <p className="flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                            </svg>
                                            <span>{companyInfo.phone}</span>
                                        </p>
                                    )}
                                    {companyInfo?.tax_number && (
                                        <p className="flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                                                <path
                                                    fillRule="evenodd"
                                                    d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            <span>Tax ID: {companyInfo.tax_number}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Contract Title and Date */}
                        <div className="text-white text-right">
                            <h2 className="text-xl font-bold mb-2">Vehicle Purchase Agreement</h2>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                                <p className="text-sm font-medium">Contract Date</p>
                                <p className="text-lg font-bold">{formatDate(contract.dealDate)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contract Content */}
            <div className="p-8 space-y-6 w-full">
                {/* Parties Information */}
                <div className="grid grid-cols-2 gap-6 w-full">
                    {/* Seller */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                        <h2 className="font-bold mb-4 text-xl text-green-700 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                            </svg>
                            Seller
                        </h2>
                        <div className="space-y-2 text-sm">
                            <p>
                                <span className="font-semibold text-green-700">Company:</span> {contract.sellerName}
                            </p>
                            <p>
                                <span className="font-semibold text-green-700">Tax Number:</span> {contract.sellerTaxNumber}
                            </p>
                            <p>
                                <span className="font-semibold text-green-700">Address:</span> {contract.sellerAddress}
                            </p>
                            <p>
                                <span className="font-semibold text-green-700">Phone:</span> {contract.sellerPhone}
                            </p>
                        </div>
                    </div>

                    {/* Buyer */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                        <h2 className="font-bold mb-4 text-xl text-blue-700 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            Buyer
                        </h2>
                        <div className="space-y-2 text-sm">
                            <p>
                                <span className="font-semibold text-blue-700">Name:</span> {contract.buyerName}
                            </p>
                            <p>
                                <span className="font-semibold text-blue-700">ID:</span> {contract.buyerId}
                            </p>
                            <p>
                                <span className="font-semibold text-blue-700">Address:</span> {contract.buyerAddress}
                            </p>
                            <p>
                                <span className="font-semibold text-blue-700">Phone:</span> {contract.buyerPhone}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Vehicle Information */}
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-6 border border-purple-200">
                    <h2 className="font-bold mb-4 text-xl text-purple-700 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                                clipRule="evenodd"
                            />
                        </svg>
                        Vehicle Information
                    </h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <p>
                            <span className="font-semibold text-purple-700">Make:</span> {contract.carMake}
                        </p>
                        <p>
                            <span className="font-semibold text-purple-700">Model:</span> {contract.carModel}
                        </p>
                        <p>
                            <span className="font-semibold text-purple-700">Year:</span> {contract.carYear}
                        </p>
                        <p>
                            <span className="font-semibold text-purple-700">Type:</span> {contract.carType}
                        </p>
                        <p>
                            <span className="font-semibold text-purple-700">Plate Number:</span> {contract.carPlateNumber}
                        </p>
                        <p>
                            <span className="font-semibold text-purple-700">Kilometers:</span> {contract.carKilometers.toLocaleString()}
                        </p>
                        {contract.carVin && (
                            <p>
                                <span className="font-semibold text-purple-700">VIN:</span> {contract.carVin}
                            </p>
                        )}
                        {contract.carEngineNumber && (
                            <p>
                                <span className="font-semibold text-purple-700">Engine Number:</span> {contract.carEngineNumber}
                            </p>
                        )}
                    </div>
                </div>

                {/* Trade-in Information (if applicable) */}
                {contract.tradeInCar && (
                    <div className="bg-gradient-to-br from-cyan-50 to-sky-50 rounded-lg p-6 border border-cyan-200">
                        <h2 className="font-bold mb-4 text-lg text-cyan-700">Trade-in Vehicle Information</h2>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <p>
                                <span className="font-semibold text-cyan-700">Type:</span> {contract.tradeInCar.type}
                            </p>
                            <p>
                                <span className="font-semibold text-cyan-700">Plate Number:</span> {contract.tradeInCar.plateNumber}
                            </p>
                            <p>
                                <span className="font-semibold text-cyan-700">Year:</span> {contract.tradeInCar.year}
                            </p>
                            <p>
                                <span className="font-semibold text-cyan-700">Estimated Value:</span> {formatCurrency(contract.tradeInCar.estimatedValue)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Payment Information */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-6 border border-emerald-200">
                    <h2 className="font-bold mb-4 text-xl text-emerald-700 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4z" />
                            <path d="M14 6a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h10zM4 8a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                        </svg>
                        Payment Details
                    </h2>
                    <div className="space-y-4">
                        <p className="text-lg font-bold text-emerald-700 bg-white rounded-lg p-4 border-2 border-emerald-300 text-center">Total Amount: {formatCurrency(contract.dealAmount)}</p>

                        {contract.totalAmount !== undefined && contract.totalAmount !== null && contract.paymentMethod && (
                            <div className="bg-white rounded-lg p-4 border border-emerald-200">
                                <p className="mb-2">
                                    <span className="font-semibold text-emerald-700">Payment Method:</span> {contract.paymentMethod}
                                </p>
                                {contract.paidAmount !== undefined && contract.paidAmount !== null && (
                                    <p className="mb-2">
                                        <span className="font-semibold text-emerald-700">Amount Paid:</span> {formatCurrency(contract.paidAmount)}
                                    </p>
                                )}
                                {contract.remainingAmount !== undefined && contract.remainingAmount !== null && contract.remainingAmount > 0 && (
                                    <p className="mb-2">
                                        <span className="font-semibold text-emerald-700">Remaining Balance:</span> {formatCurrency(contract.remainingAmount)}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Terms and Conditions */}
                <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-6 border border-red-200">
                    <h2 className="font-bold mb-4 text-xl text-red-700 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1z"
                                clipRule="evenodd"
                            />
                        </svg>
                        Terms and Conditions
                    </h2>
                    <div className="space-y-3 text-sm">
                        <div className="bg-white rounded-lg p-3 border border-red-200">• The seller guarantees that the vehicle is free of any liens or encumbrances.</div>
                        <div className="bg-white rounded-lg p-3 border border-red-200">• The vehicle is sold "as is" with no warranties expressed or implied.</div>
                        <div className="bg-white rounded-lg p-3 border border-red-200">• The seller agrees to transfer ownership within {contract.ownershipTransferDays} days.</div>
                        <div className="bg-white rounded-lg p-3 border border-red-200">• The buyer has inspected the vehicle and agrees to its current condition.</div>
                        <div className="bg-white rounded-lg p-3 border border-red-200">• This agreement is binding upon both parties once signed.</div>
                    </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-6 pt-8 w-full">
                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-6 border border-gray-200 text-center">
                        <h3 className="font-bold mb-4 text-gray-700">Seller's Signature</h3>
                        <div className="border-b-2 border-gray-300 h-16 mb-4"></div>
                        <p className="text-sm text-gray-600">Date: {formatDate(contract.dealDate)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-6 border border-gray-200 text-center">
                        <h3 className="font-bold mb-4 text-gray-700">Buyer's Signature</h3>
                        <div className="border-b-2 border-gray-300 h-16 mb-4"></div>
                        <p className="text-sm text-gray-600">Date: {formatDate(contract.dealDate)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnglishContractTemplate;
