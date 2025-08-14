export interface CarContract {
    // Deal Info
    dealType: 'normal' | 'trade-in';
    dealDate: string;

    // Seller Info (Provider)
    sellerName: string;
    sellerTaxNumber: string;
    sellerAddress: string;
    sellerPhone: string;

    // Buyer Info (Customer)
    buyerName: string;
    buyerId: string;
    buyerAddress: string;
    buyerPhone: string;

    // Car Info
    carType: string;
    carMake: string;
    carModel: string;
    carYear: number;
    carBuyPrice?: number; // Optional - only used in car purchase contracts
    carPlateNumber: string;
    carVin: string;
    carEngineNumber: string;
    carKilometers: number;

    // Trade-in Car Info (optional)
    tradeInCar?: {
        type: string;
        plateNumber: string;
        year: number;
        estimatedValue: number;
    };

    // Deal Amount (from deal.amount - always available)
    dealAmount: number;

    // Payment Info (optional - for deals with bills)
    totalAmount?: number;
    paymentMethod?: 'cash' | 'bank_transfer' | 'check' | 'other';
    paymentDetails?: string; // For check numbers or other details
    paidAmount?: number;
    remainingAmount?: number;
    remainingPaymentDate?: string;

    // Additional Terms
    ownershipTransferDays: number;
}

export interface ContractTemplateProps {
    contract: CarContract;
    onGenerate?: () => void;
    language?: string;
}
