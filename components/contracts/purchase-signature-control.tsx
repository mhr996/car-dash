'use client';
import { useState } from 'react';
import type { usePurchaseSignature } from '@/hooks/usePurchaseSignature';
import { getTranslation } from '@/i18n';
import SignatureModal from '@/components/modals/signature-modal';
import IconPencil from '@/components/icon/icon-pencil';

interface Props {
    signature: ReturnType<typeof usePurchaseSignature>;
    canSign: boolean;
    onAlert: (message: string, type: 'success' | 'danger') => void;
}

export function PurchaseSignatureControl({ signature, canSign, onAlert }: Props) {
    const { t } = getTranslation();
    const [open, setOpen] = useState(false);
    return (
        <div className="flex flex-col gap-2">
            {signature.error && (
                <span role="alert" className="text-sm text-danger">
                    {t('error_loading_data')}: {signature.error}
                </span>
            )}
            {canSign && (
                <button type="button" className="btn btn-outline-primary gap-2" disabled={signature.loading || signature.saving} onClick={() => setOpen(true)}>
                    <IconPencil className="h-4 w-4" />
                    {signature.saving ? t('saving') : signature.signatureUrl ? t('update_signature') : t('sign_purchase')}
                </button>
            )}
            <SignatureModal
                isOpen={open}
                onClose={() => setOpen(false)}
                title={t('purchase_seller_signature')}
                onSave={async (dataUrl) => {
                    try {
                        await signature.save(dataUrl);
                        onAlert(t('deal_signed_successfully'), 'success');
                    } catch {
                        onAlert(t('error_saving_signature'), 'danger');
                    }
                }}
            />
        </div>
    );
}
