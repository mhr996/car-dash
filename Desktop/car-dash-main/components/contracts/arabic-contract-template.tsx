import React from 'react';
import { CarContract } from '@/types/contract';
import { getTranslation } from '@/i18n';

interface ContractTemplateProps {
    contract: CarContract;
    language?: string;
}

const ArabicContractTemplate: React.FC<ContractTemplateProps> = ({ contract }) => {
    const { t } = getTranslation();

    // Format date to Arabic format (Gregorian calendar)
    const formatDate = (date: string) => {
        // ar-EG uses Gregorian calendar with Arabic numerals
        return (
            new Date(date).toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }) + ' م'
        ); // Add ميلادي suffix
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ar-SA', {
            style: 'currency',
            currency: 'ILS',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div id="contract-template" className="rtl p-8 text-right font-arabic" style={{ direction: 'rtl' }}>
            <h1 className="text-2xl font-bold mb-8 text-center">اتفاقية بيع مركبة</h1>

            <p className="mb-6">تم توقيع هذه الاتفاقية وإبرامها في يوم {formatDate(contract.dealDate)}</p>

            <div className="mb-8">
                <h2 className="font-bold mb-2">البائع:</h2>
                <p>اسم المعرض / الشركة: {contract.sellerName}</p>
                <p>رقم الملف الضريبي/السجل التجاري: {contract.sellerTaxNumber}</p>
                <p>العنوان: {contract.sellerAddress}</p>
                <p>رقم الهاتف: {contract.sellerPhone}</p>
            </div>

            <div className="mb-8">
                <h2 className="font-bold mb-2">المشتري:</h2>
                <p>الاسم الكامل: {contract.buyerName}</p>
                <p>رقم الهوية: {contract.buyerId}</p>
                <p>العنوان: {contract.buyerAddress}</p>
                <p>رقم الهاتف: {contract.buyerPhone}</p>
            </div>

            <div className="mb-8">
                <h2 className="font-bold mb-4">1. تفاصيل المركبة المباعة</h2>
                <p>نوع المركبة: {contract.carType}</p>
                <p>الشركة المصنعة: {contract.carMake}</p>
                <p>الطراز: {contract.carModel}</p>
                <p>سنة الصنع: {contract.carYear}</p>
                <p>رقم التسجيل (لوحة): {contract.carPlateNumber}</p>
                <p>رقم الهيكل: {contract.carVin}</p>
                <p>رقم المحرك: {contract.carEngineNumber}</p>
                <p>عدد الكيلومترات الحالي: {contract.carKilometers}</p>
            </div>

            <div className="mb-8">
                <h2 className="font-bold mb-4">2. طبيعة الصفقة</h2>
                <p>
                    {contract.dealType === 'normal'
                        ? 'بيع عادي'
                        : contract.dealType === 'trade-in'
                          ? 'صفقة استبدال'
                          : contract.dealType === 'intermediary'
                            ? 'وساطة'
                            : contract.dealType === 'new_used_sale' || contract.dealType === 'new_sale' || contract.dealType === 'used_sale'
                              ? 'بيع مركبة مستعملة'
                              : contract.dealType === 'new_used_sale_tax_inclusive'
                                ? 'بيع مركبة مستعملة (شامل الضريبة)'
                                : contract.dealType === 'financing_assistance_intermediary'
                                  ? 'وساطة تمويل'
                                  : contract.dealType === 'company_commission'
                                    ? 'عمولة شركة'
                                    : 'بيع عادي'}
                </p>

                {contract.dealType === 'trade-in' && contract.tradeInCar && (
                    <div className="mt-4">
                        <p>تفاصيل مركبة المشتري التي تم تسليمها كجزء من الصفقة:</p>
                        <p>نوع المركبة: {contract.tradeInCar.type}</p>
                        <p>رقم التسجيل: {contract.tradeInCar.plateNumber}</p>
                        <p>سنة الصنع: {contract.tradeInCar.year}</p>
                        <p>قيمة المركبة المقدّرة من قبل البائع: {formatCurrency(contract.tradeInCar.estimatedValue)}</p>
                    </div>
                )}
            </div>

            <div className="mb-8">
                <h2 className="font-bold mb-4">3. المقابل المالي</h2>
                <p>اتفق الطرفان على أن يدفع المشتري للبائع مبلغاً إجمالياً قدره:</p>
                <p className="font-bold my-2">{formatCurrency(contract.dealAmount)}</p>

                {contract.totalAmount !== undefined && contract.totalAmount !== null && contract.paymentMethod && (
                    <>
                        <div className="mt-4">
                            <p>
                                طريقة الدفع:{' '}
                                {contract.paymentMethod === 'cash'
                                    ? 'نقدًا'
                                    : contract.paymentMethod === 'bank_transfer'
                                      ? 'تحويل بنكي'
                                      : contract.paymentMethod === 'check'
                                        ? `شيك/شيكات${contract.paymentDetails ? ` – أرقام الشيكات: ${contract.paymentDetails}` : ''}`
                                        : contract.paymentMethod === 'other'
                                          ? `أخرى${contract.paymentDetails ? `: ${contract.paymentDetails}` : ''}`
                                          : ''}
                            </p>
                        </div>

                        {contract.paidAmount !== undefined && contract.paidAmount !== null && (
                            <div className="mt-4">
                                <p>المبلغ المدفوع عند توقيع الاتفاق: {formatCurrency(contract.paidAmount)}</p>
                                {contract.remainingAmount && contract.remainingAmount > 0 && (
                                    <p>
                                        المبلغ المتبقي: {formatCurrency(contract.remainingAmount)}
                                        {contract.remainingPaymentDate && ` حتى تاريخ ${formatDate(contract.remainingPaymentDate)}`}
                                    </p>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="mb-8">
                <h2 className="font-bold mb-4">4. شروط الاتفاق</h2>
                <div className="space-y-2" style={{ direction: 'rtl', textAlign: 'right' }}>
                    <div style={{ textAlign: 'right', direction: 'rtl' }}>• تُباع المركبة بحالتها الراهنة ("كما هي").</div>
                    <div style={{ textAlign: 'right', direction: 'rtl' }}>• يقرّ المشتري بأنه فحص المركبة وقادها، ولا يملك أي اعتراض على حالتها الفنية أو الشكلية.</div>
                    <div style={{ textAlign: 'right', direction: 'rtl' }}>• يلتزم البائع بنقل ملكية المركبة خلال {contract.ownershipTransferDays} أيام عمل.</div>
                    <div style={{ textAlign: 'right', direction: 'rtl' }}>• يكون المشتري مسؤولًا عن أي مخالفة أو غرامة أو رسوم أو أضرار بعد تاريخ التوقيع.</div>
                    <div style={{ textAlign: 'right', direction: 'rtl' }}>• في حال كانت المركبة محجوزة أو مرهونة – يلتزم البائع برفع الحجز أو الرهن قبل نقل الملكية.</div>
                    {contract.dealType === 'trade-in' && (
                        <div style={{ textAlign: 'right', direction: 'rtl' }}>
                            • في حال شملت الصفقة استبدال مركبة – يكون المشتري مسؤولاً عن حالة المركبة المسلّمة ويقرّ بأنه سلّمها بعد إفصاح كامل عن وضعها.
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-8">
                <h2 className="font-bold mb-4">5. الإقرارات</h2>
                <div className="space-y-2" style={{ direction: 'rtl', textAlign: 'right' }}>
                    <div style={{ textAlign: 'right', direction: 'rtl' }}>• يقر الطرفان بصحة جميع التفاصيل وموافقتهما على الاتفاق بكامل إرادتهما.</div>
                    <div style={{ textAlign: 'right', direction: 'rtl' }}>• يدرك الطرفان أن هذه الاتفاقية ملزمة قانونياً.</div>
                </div>
            </div>

            <div className="mt-12">
                <h2 className="font-bold mb-4">التواقيع</h2>
                <div className="flex justify-between">
                    <div>
                        <p>توقيع البائع: ______________________</p>
                        <p>التاريخ: {formatDate(contract.dealDate)}</p>
                    </div>
                    <div>
                        <p>توقيع المشتري: ______________________</p>
                        <p>التاريخ: {formatDate(contract.dealDate)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ArabicContractTemplate;
