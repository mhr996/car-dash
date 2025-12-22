'use client';
import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import IconX from '@/components/icon/icon-x';
import IconCheck from '@/components/icon/icon-check';
import IconRefresh from '@/components/icon/icon-refresh';
import { getTranslation } from '@/i18n';

interface SignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (signatureDataUrl: string) => void;
    title?: string;
}

const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose, onSave, title }) => {
    const { t } = getTranslation();
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [isEmpty, setIsEmpty] = useState(true);

    if (!isOpen) return null;

    const clearSignature = () => {
        sigCanvas.current?.clear();
        setIsEmpty(true);
    };

    const handleSave = () => {
        if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
            const dataUrl = sigCanvas.current.toDataURL('image/png');
            onSave(dataUrl);
            clearSignature();
            onClose();
        }
    };

    const handleSignatureEnd = () => {
        if (sigCanvas.current) {
            setIsEmpty(sigCanvas.current.isEmpty());
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}></div>

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-semibold">{title || t('customer_signature')}</h3>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                            <IconX className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Signature Canvas */}
                    <div className="p-6">
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-white">
                            <SignatureCanvas
                                ref={sigCanvas}
                                canvasProps={{
                                    className: 'w-full h-64 cursor-crosshair',
                                }}
                                backgroundColor="transparent"
                                onEnd={handleSignatureEnd}
                            />
                        </div>
                        <p className="text-sm text-gray-500 mt-3 text-center">{t('signature_instructions')}</p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 gap-3">
                        <button type="button" onClick={clearSignature} className="btn btn-outline-danger flex items-center gap-2">
                            <IconRefresh className="w-4 h-4" />
                            {t('clear')}
                        </button>

                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="btn btn-outline-secondary">
                                {t('cancel')}
                            </button>
                            <button type="button" onClick={handleSave} disabled={isEmpty} className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                <IconCheck className="w-4 h-4" />
                                {t('save_signature')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SignatureModal;
