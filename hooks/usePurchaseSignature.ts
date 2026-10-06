'use client';
import { useEffect, useRef, useState } from 'react';
import { getPurchaseSignature, PurchaseSignature, savePurchaseSignature, SignedPurchaseCar, validPurchaseSignature } from '@/utils/purchase-signature';

export function usePurchaseSignature(car: SignedPurchaseCar | null) {
    const [signature, setSignature] = useState<PurchaseSignature | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const savingRef = useRef(false);
    const carId = car?.id;
    const activeCarId = useRef(carId);
    activeCarId.current = carId;

    useEffect(() => {
        let cancelled = false;
        setSignature(null);
        setError(null);
        setLoading(true);
        if (carId === undefined)
            return () => {
                cancelled = true;
            };
        getPurchaseSignature(carId)
            .then((data) => {
                if (!cancelled) setSignature(data);
            })
            .catch((failure: unknown) => {
                console.error('Error loading purchase signature:', failure);
                if (!cancelled) setError(failure instanceof Error ? failure.message : 'Failed to load purchase signature');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [carId]);

    const save = async (dataUrl: string) => {
        if (!car) throw new Error('Purchase data is required to sign');
        if (savingRef.current) throw new Error('A signature save is already in progress');
        savingRef.current = true;
        setSaving(true);
        try {
            const saved = await savePurchaseSignature(car, dataUrl);
            if (String(activeCarId.current) === String(car.id)) {
                setSignature(saved);
                setError(null);
            }
        } catch (failure) {
            console.error('Error saving purchase signature:', failure);
            if (String(activeCarId.current) === String(car.id)) setError(failure instanceof Error ? failure.message : 'Failed to save purchase signature');
            throw failure;
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    };

    return { signatureUrl: car && validPurchaseSignature(signature, car) ? signature?.seller_signature_url : null, loading, saving, error, save };
}
