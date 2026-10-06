import supabase from '@/lib/supabase';
import { uploadFile, getPublicUrlFromPath } from '@/utils/file-upload';
import { PurchaseParty, validatePurchaseCarId, resolvePurchaseSeller } from '@/utils/purchase-billing';

export interface PurchaseSignature {
    car_id: number | string;
    seller_id: number | string;
    seller_type: 'provider' | 'customer';
    seller_signature_url: string;
    signed_by_name: string;
    signed_at: string;
}

export interface SignedPurchaseCar {
    id: number | string;
    source_type?: string | null;
    providers?: PurchaseParty | null;
    customers?: PurchaseParty | null;
}

export async function getPurchaseSignature(carId: string | number): Promise<PurchaseSignature | null> {
    validatePurchaseCarId(carId);
    const { data, error } = await supabase.from('purchase_signatures').select('*').eq('car_id', carId).returns<PurchaseSignature[]>().maybeSingle();
    if (error) throw new Error('Failed to load purchase signature: ' + error.message);
    return data;
}

export function validPurchaseSignature(signature: PurchaseSignature | null, car: SignedPurchaseCar): boolean {
    const seller = resolvePurchaseSeller(car);
    const sellerType = seller === car.providers ? 'provider' : 'customer';
    return !!signature?.seller_signature_url && !!seller && String(signature.car_id) === String(car.id) && String(signature.seller_id) === String(seller.id) && signature.seller_type === sellerType;
}

export async function savePurchaseSignature(car: SignedPurchaseCar, signatureDataUrl: string): Promise<PurchaseSignature> {
    validatePurchaseCarId(car.id);
    const seller = resolvePurchaseSeller(car);
    if (!seller) throw new Error('Seller details are required to sign a purchase');
    if (!signatureDataUrl.startsWith('data:image/png;base64,')) throw new Error('A PNG signature is required');
    const response = await fetch(signatureDataUrl);
    if (!response.ok) throw new Error('Failed to read purchase signature image');
    const blob = await response.blob();
    if (!blob.size || blob.type !== 'image/png') throw new Error('The purchase signature image is empty or invalid');
    const file = new File([blob], 'purchase-seller-signature.png', { type: 'image/png' });
    const upload = await uploadFile(file, 'cars', String(car.id));
    if (!upload.success || !upload.url) throw new Error(upload.error || 'Failed to upload purchase signature');
    const signature: PurchaseSignature = {
        car_id: car.id,
        seller_id: seller.id,
        seller_type: seller === car.providers ? 'provider' : 'customer',
        seller_signature_url: getPublicUrlFromPath(upload.url),
        signed_by_name: seller.name,
        signed_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('purchase_signatures').upsert(signature, { onConflict: 'car_id' });
    if (error) throw new Error('Failed to save purchase signature: ' + error.message);
    return signature;
}
