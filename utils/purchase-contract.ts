import { CompanyInfo } from '@/lib/company-info';
import { CarContract } from '@/types/contract';
import { PurchaseParty, resolvePurchaseSeller } from '@/utils/purchase-billing';

interface PurchaseContractCar {
    id: string | number;
    created_at: string;
    source_type?: string | null;
    providers?: PurchaseParty | null;
    customers?: PurchaseParty | null;
    type?: string;
    brand: string;
    title: string;
    year: number;
    buy_price: number;
    car_number?: string;
    kilometers: number;
}

export function createPurchaseContractData(car: PurchaseContractCar, company: CompanyInfo, sellerSignatureUrl?: string | null): CarContract {
    const seller = resolvePurchaseSeller(car);
    if (!seller) throw new Error('Seller details are required to generate a purchase contract');
    return {
        dealType: 'normal',
        dealDate: new Date(car.created_at).toISOString().split('T')[0],
        companyName: company.name,
        companyTaxNumber: company.tax_number || '',
        companyAddress: company.address || '',
        companyPhone: company.phone || '',
        sellerName: seller.name,
        sellerTaxNumber: seller.id_number?.toString() || '',
        sellerAddress: seller.address || '',
        sellerPhone: seller.phone || '',
        buyerName: company.name,
        buyerId: company.tax_number || '',
        buyerAddress: company.address || '',
        buyerPhone: company.phone || '',
        carType: car.type || 'Vehicle',
        carMake: car.brand,
        carModel: car.title,
        carYear: car.year,
        carBuyPrice: car.buy_price,
        carPlateNumber: car.car_number || `CAR-${String(car.id).slice(-6).toUpperCase()}`,
        carVin: '',
        carEngineNumber: '',
        carKilometers: car.kilometers,
        dealAmount: car.buy_price,
        ownershipTransferDays: 30,
        companySignatureUrl: company.signature_url,
        customerSignatureUrl: sellerSignatureUrl || undefined,
    };
}
