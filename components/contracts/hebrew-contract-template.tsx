import React from 'react';
import { CarContract } from '@/types/contract';
import { getTranslation } from '@/i18n';

interface ContractTemplateProps {
    contract: CarContract;
    language?: string;
}

const HebrewContractTemplate: React.FC<ContractTemplateProps> = ({ contract }) => {
    const { t } = getTranslation();

    // Format date to Hebrew format (Gregorian calendar)
    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('he-IL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('he-IL', {
            style: 'currency',
            currency: 'ILS',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div id="contract-template" className="ltr p-8 text-right font-hebrew" style={{ direction: 'rtl' }}>
            <h1 className="text-2xl font-bold mb-8 text-center">הסכם מכירת רכב</h1>

            <p className="mb-6">הסכם זה נחתם ונערך ביום {formatDate(contract.dealDate)}</p>

            <div className="mb-8">
                <h2 className="font-bold mb-2">המוכר:</h2>
                <p>שם העסק (מגרש הרכב): {contract.sellerName}</p>
                <p>מספר עוסק מורשה/ח.פ: {contract.sellerTaxNumber}</p>
                <p>כתובת: {contract.sellerAddress}</p>
                <p>טלפון: {contract.sellerPhone}</p>
            </div>

            <div className="mb-8">
                <h2 className="font-bold mb-2">הקונה:</h2>
                <p>שם מלא: {contract.buyerName}</p>
                <p>מספר ת.ז: {contract.buyerId}</p>
                <p>כתובת: {contract.buyerAddress}</p>
                <p>טלפון: {contract.buyerPhone}</p>
            </div>

            <div className="mb-8">
                <h2 className="font-bold mb-4">1. פרטי הרכב הנמכר</h2>
                <p>סוג הרכב: {contract.carType}</p>
                <p>יצרן: {contract.carMake}</p>
                <p>דגם: {contract.carModel}</p>
                <p>שנת ייצור: {contract.carYear}</p>
                <p>מספר רישוי: {contract.carPlateNumber}</p>
                <p>מספר שלדה: {contract.carVin}</p>
                <p>מספר מנוע: {contract.carEngineNumber}</p>
                <p>ק"מ נוכחי: {contract.carKilometers}</p>
            </div>

            <div className="mb-8">
                <h2 className="font-bold mb-4">2. מהות העסקה</h2>
                <p>
                    <label>
                        <span style={{ display: 'flex', alignItems: "center", gap: '5px', }}>
                            <input type="checkbox" checked={contract.dealType === 'normal'} readOnly /> מכירה רגילה
                        </span>
                    </label>
                </p>
                <p>
                    <label>
                        <span style={{ display: 'flex', alignItems: "center", gap: '5px', }}>
                            <input type="checkbox" checked={contract.dealType === 'trade-in'} readOnly /> עסקת טרייד אין / החלפה
                        </span>
                    </label>
                </p>

                {contract.dealType === 'trade-in' && contract.tradeInCar && (
                    <div className="mt-4">
                        <p>פרטי הרכב של הקונה שנמסר בתמורה:</p>
                        <p>סוג הרכב: {contract.tradeInCar.type}</p>
                        <p>מספר רישוי: {contract.tradeInCar.plateNumber}</p>
                        <p>שנת ייצור: {contract.tradeInCar.year}</p>
                        <p>שווי מוערך ע"י המוכר: {formatCurrency(contract.tradeInCar.estimatedValue)}</p>
                    </div>
                )}
            </div>

            <div className="mb-8">
                <h2 className="font-bold mb-4">3. תמורה</h2>
                <p>הצדדים מסכימים כי תמורת הרכב, ישלם הקונה למוכר את הסכום הכולל של:</p>
                <p className="font-bold my-2">{formatCurrency(contract.totalAmount)}</p>

                <div className="mt-4">
                    <p>צורת התשלום:</p>
                    <p>
                        <label>
                            <span style={{ display: 'flex', alignItems: "center", gap: '5px', }}>
                                <input type="checkbox" checked={contract.paymentMethod === 'cash'} readOnly /> מזומן
                            </span>
                        </label>
                    </p>
                    <p>
                        <label>
                            <span style={{ display: 'flex', alignItems: "center", gap: '5px', }}>
                                <input type="checkbox" checked={contract.paymentMethod === 'bank_transfer'} readOnly /> העברה בנקאית
                            </span>
                        </label>
                    </p>
                    <p>
                        <label>
                            <span style={{ display: 'flex', alignItems: "center", gap: '5px', }}>
                                <input type="checkbox" checked={contract.paymentMethod === 'check'} readOnly /> צ'ק/ים
                            </span>
                            {contract.paymentMethod === 'check' && contract.paymentDetails && <span> – מספרי הצ'קים: {contract.paymentDetails}</span>}
                        </label>
                    </p>
                    <p>
                        <label>
                            <span style={{ display: 'flex', alignItems: "center", gap: '5px', }}>
                                <input type="checkbox" checked={contract.paymentMethod === 'other'} readOnly /> אחר:
                            </span>
                            {contract.paymentMethod === 'other' && contract.paymentDetails && <span> {contract.paymentDetails}</span>}
                        </label>
                    </p>
                </div>

                <div className="mt-4">
                    <p>סכום ששולם במעמד החתימה: {formatCurrency(contract.paidAmount)}</p>
                    {contract.remainingAmount > 0 && (
                        <p>
                            יתרה לתשלום: {formatCurrency(contract.remainingAmount)}
                            {contract.remainingPaymentDate && ` עד תאריך ${formatDate(contract.remainingPaymentDate)}`}
                        </p>
                    )}
                </div>
            </div>

            <div className="mb-8">
                <h2 className="font-bold mb-4">4. תנאי העסקה</h2>
                <ul className="list-disc mr-6 space-y-2">
                    <li>הרכב נמכר במצבו הנוכחי ("כמות שהוא").</li>
                    <li>הקונה מצהיר כי בדק את הרכב, נסע בו, ואין לו טענות באשר למצבו המכני או החזותי.</li>
                    <li>המוכר מתחייב להעביר את בעלות הרכב תוך {contract.ownershipTransferDays} ימי עסקים.</li>
                    <li>הקונה יהיה אחראי על כל התחייבות/קנס/אגרה/נזק שיגיע לאחר מועד החתימה.</li>
                    <li>במידה והרכב נמצא תחת שעבוד או עיקול – המוכר מתחייב להסירו לפני העברת הבעלות.</li>
                    {contract.dealType === 'trade-in' && <li>במידה ועסקה זו כוללת טרייד אין – האחריות למצב הרכב שנמסר חלה על הקונה, והוא מצהיר כי מסר את הרכב למגרש לאחר גילוי מלא.</li>}
                </ul>
            </div>

            <div className="mb-8">
                <h2 className="font-bold mb-4">5. הצהרות</h2>
                <ul className="list-disc mr-6 space-y-2">
                    <li>הצדדים מאשרים שכל הפרטים נכונים ושהם חותמים על ההסכם מרצונם החופשי.</li>
                    <li>הצדדים מודעים כי הסכם זה מחייב מבחינה משפטית.</li>
                </ul>
            </div>

            <div className="mt-12">
                <h2 className="font-bold mb-4">חתימות</h2>
                <div className="flex justify-between">
                    <div>
                        <p>חתימת המוכר: ______________________</p>
                        <p>תאריך: {formatDate(contract.dealDate)}</p>
                    </div>
                    <div>
                        <p>חתימת הקונה: ______________________</p>
                        <p>תאריך: {formatDate(contract.dealDate)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HebrewContractTemplate;
