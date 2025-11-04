'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconCalendar from '@/components/icon/icon-calendar';
import IconUser from '@/components/icon/icon-user';
import IconBox from '@/components/icon/icon-box';
import IconDocument from '@/components/icon/icon-document';
import IconPhone from '@/components/icon/icon-phone';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconCreditCard from '@/components/icon/icon-credit-card';
import supabase from '@/lib/supabase';
import { getTranslation } from '@/i18n';
import Link from 'next/link';
import Image from 'next/image';
import { CarContract } from '@/types/contract';
import { CarPurchaseContractPDFGenerator } from '@/utils/car-purchase-contract-pdf-generator';
import { getCompanyInfo, CompanyInfo } from '@/lib/company-info';

interface Car {
    id: string;
    created_at: string;
    title: string;
    year: number;
    status: string;
    type?: string;
    market_price: number;
    buy_price: number;
    sale_price: number;
    kilometers: number;
    provider: string;
    source_type?: 'provider' | 'customer';
    source_customer_id?: string;
    brand: string;
    desc?: string;
    features?: Array<{ label: string; value: string }>;
    images: string[];
    contract_image?: string;
    car_number?: string;
    colors?: Array<{
        color: string;
        images: string[];
    }>;
    providers?: {
        id: string;
        name: string;
        address: string;
        phone: string;
    };
    customers?: {
        id: string;
        name: string;
        phone: string;
        age: number;
        id_number?: string;
    };
}

const CarDealPreview = () => {
    const { t } = getTranslation();
    const params = useParams();
    const router = useRouter();
    const [car, setCar] = useState<Car | null>(null);
    const [loading, setLoading] = useState(true);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [contractImageUrl, setContractImageUrl] = useState<string>('');
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [generatingContract, setGeneratingContract] = useState(false);
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchCar = async () => {
            if (!params?.id) return;

            try {
                const { data, error } = await supabase.from('cars').select('*, providers(id, name, address, phone), customers(id, name, phone, age, id_number)').eq('id', params.id).single();

                if (error) {
                    console.error('Error fetching car:', error);
                    return;
                }

                setCar(data);

                // Get image URLs from Supabase storage
                if (data.images && data.images.length > 0) {
                    const urls = await Promise.all(
                        data.images.map(async (imagePath: string) => {
                            const { data: urlData } = supabase.storage.from('cars').getPublicUrl(imagePath);
                            return urlData.publicUrl;
                        }),
                    );
                    setImageUrls(urls);
                }

                // Get contract image URL if it exists
                if (data.contract_image) {
                    const { data: urlData } = supabase.storage.from('cars').getPublicUrl(data.contract_image);
                    setContractImageUrl(urlData.publicUrl);
                }
            } catch (error) {
                console.error('Error in fetchCar:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCar();
    }, [params?.id]);

    useEffect(() => {
        const loadCompanyInfo = async () => {
            const info = await getCompanyInfo();
            setCompanyInfo(info);
        };
        loadCompanyInfo();
    }, []);

    const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!car) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="text-lg text-gray-600 mb-4">{t('car_not_found')}</p>
                <Link href="/purchases-deals" className="btn btn-primary">
                    {t('back_to_purchases_deals')}
                </Link>
            </div>
        );
    }

    return (
        <div>
            {/* Alert */}
            {alert.visible && (
                <div className="mb-4">
                    <div className={`alert alert-${alert.type === 'success' ? 'success' : 'danger'} flex items-center`}>
                        <span className="ltr:pr-2 rtl:pl-2">{alert.message}</span>
                        <button type="button" className="ltr:ml-auto rtl:mr-auto hover:opacity-80" onClick={() => setAlert({ ...alert, visible: false })}>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path opacity="0.5" d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" fill="currentColor" />
                                <path d="M11.9343 8.06571L8.06571 11.9343M8.06571 8.06571L11.9343 11.9343" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => router.back()} className="btn btn-outline-primary gap-2">
                        <IconArrowLeft className="w-4 h-4" />
                        {t('back')}
                    </button>

                    {companyInfo && (
                        <div className="flex gap-2">
                            <button
                                className="btn btn-success gap-2"
                                disabled={generatingContract}
                                onClick={async () => {
                                    if (!car) return;

                                    setGeneratingContract(true);
                                    try {
                                        const sourceEntity = car.source_type === 'provider' ? car.providers : car.customers;

                                        const contractData: CarContract = {
                                            dealType: 'normal',
                                            dealDate: new Date(car.created_at).toISOString().split('T')[0],
                                            companyName: companyInfo.name,
                                            companyTaxNumber: companyInfo.tax_number || '',
                                            companyAddress: companyInfo.address || '',
                                            companyPhone: companyInfo.phone || '',
                                            sellerName: sourceEntity?.name || 'N/A',
                                            sellerTaxNumber: car.customers?.id_number?.toString() || '',
                                            sellerAddress: car.providers?.address || '',
                                            sellerPhone: sourceEntity?.phone || '',
                                            buyerName: companyInfo.name,
                                            buyerId: companyInfo.tax_number || '',
                                            buyerAddress: companyInfo.address || '',
                                            buyerPhone: companyInfo.phone || '',
                                            carType: car.type || 'sedan',
                                            carMake: car.brand,
                                            carModel: car.title,
                                            carYear: car.year,
                                            carBuyPrice: car.buy_price,
                                            carPlateNumber: car.car_number || '',
                                            carVin: '',
                                            carEngineNumber: '',
                                            carKilometers: car.kilometers,
                                            dealAmount: car.buy_price,
                                            ownershipTransferDays: 30,
                                        };

                                        const lang = getCookie('i18nextLng') || 'he';
                                        const normalizedLang = lang.toLowerCase().split('-')[0] as 'en' | 'ar' | 'he';

                                        const carIdentifier = car.car_number || `CAR-${car.id.slice(-6).toUpperCase()}`;
                                        const filename = `car-purchase-contract-${carIdentifier}-${new Date().toISOString().split('T')[0]}.pdf`;

                                        await CarPurchaseContractPDFGenerator.generateFromContract(contractData, {
                                            filename,
                                            language: normalizedLang,
                                            format: 'A4',
                                            orientation: 'portrait',
                                        });

                                        setAlert({ visible: true, message: t('contract_generated_successfully') || 'Contract generated successfully', type: 'success' });
                                    } catch (error) {
                                        console.error('Error generating contract:', error);
                                        setAlert({ visible: true, message: t('error_generating_pdf') || 'Error generating PDF', type: 'danger' });
                                    } finally {
                                        setGeneratingContract(false);
                                    }
                                }}
                            >
                                {generatingContract ? (
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                    </svg>
                                ) : (
                                    <IconDocument className="w-4 h-4" />
                                )}
                                {generatingContract ? t('generating_contract') : t('generate_purchase_contract')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="container mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Images Gallery */}
                    <div className="lg:col-span-2">
                        <div className="panel h-full">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">{t('car_images')}</h3>
                            </div>

                            {imageUrls.length > 0 ? (
                                <div>
                                    {/* Main Image */}
                                    <div className="mb-4">
                                        <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                                            <Image src={imageUrls[selectedImageIndex]} alt={car.title} fill className="object-cover" />
                                        </div>
                                    </div>

                                    {/* Thumbnail Grid */}
                                    {imageUrls.length > 1 && (
                                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                            {imageUrls.map((url, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => setSelectedImageIndex(index)}
                                                    className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                                                        selectedImageIndex === index ? 'ring-2 ring-primary' : 'opacity-70 hover:opacity-100'
                                                    }`}
                                                >
                                                    <Image src={url} alt={`${car.title} ${index + 1}`} fill className="object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-10">
                                    <IconBox className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                                    <p className="text-gray-500">{t('no_images_available')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Car Details */}
                    <div className="lg:col-span-1">
                        <div className="panel">
                            <div className="mb-5">
                                <h3 className="text-xl font-bold">
                                    {car.brand} {car.title}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {t('year')}: {car.year}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <p className="text-sm text-gray-500">{t('buy_price')}</p>
                                        <p className="font-semibold text-lg">₪{car.buy_price.toLocaleString()}</p>
                                    </div>
                                </div>

                                {car.market_price > 0 && (
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="text-sm text-gray-500">{t('market_price')}</p>
                                            <p className="font-semibold text-lg">₪{car.market_price.toLocaleString()}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-3">
                                    <IconUser className="w-5 h-5 text-success" />
                                    <div>
                                        <p className="text-sm text-gray-500">{t('purchased_from')}</p>
                                        <p className="font-medium">{car.source_type === 'provider' ? car.providers?.name : car.customers?.name}</p>
                                        <p className="text-xs text-gray-400">{t(`source_type_${car.source_type}`)}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <IconCalendar className="w-5 h-5 text-warning" />
                                    <div>
                                        <p className="text-sm text-gray-500">{t('purchase_date')}</p>
                                        <p className="font-medium">{new Date(car.created_at).toLocaleDateString('he-IL')}</p>
                                    </div>
                                </div>

                                <div className="border-t pt-4 mt-4">
                                    <h4 className="font-semibold mb-3">{t('car_information')}</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500">{t('car_number')}:</span>
                                            <span className="text-sm font-medium">{car.car_number || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500">{t('kilometers')}:</span>
                                            <span className="text-sm font-medium">
                                                {car.kilometers.toLocaleString()} {t('km')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500">{t('status')}:</span>
                                            <span className={`text-sm font-medium badge badge-outline-${car.status === 'new' ? 'success' : car.status === 'used' ? 'info' : 'primary'}`}>
                                                {t(car.status)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contract Image */}
                        {contractImageUrl && (
                            <div className="panel mt-6">
                                <div className="mb-3">
                                    <h4 className="font-semibold">{t('purchase_contract')}</h4>
                                </div>
                                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100">
                                    <Image src={contractImageUrl} alt={t('purchase_contract')} fill className="object-contain" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Source Entity Details - Full Width */}
                <div className="mt-6">
                    <div className="panel">
                        <div className="mb-5">
                            <h3 className="text-lg font-semibold">
                                {t('source')} {t('contact_information')}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">{t(`source_type_${car.source_type}`)}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {car.source_type === 'provider' && car.providers ? (
                                <>
                                    <div className="flex items-start gap-3">
                                        <IconUser className="w-5 h-5 text-primary mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500">{t('provider_name')}</p>
                                            <p className="font-semibold">{car.providers.name}</p>
                                        </div>
                                    </div>

                                    {car.providers.phone && (
                                        <div className="flex items-start gap-3">
                                            <IconPhone className="w-5 h-5 text-success mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-500">{t('phone')}</p>
                                                <p className="font-medium">{car.providers.phone}</p>
                                            </div>
                                        </div>
                                    )}

                                    {car.providers.address && (
                                        <div className="flex items-start gap-3">
                                            <IconMapPin className="w-5 h-5 text-warning mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-500">{t('address')}</p>
                                                <p className="font-medium">{car.providers.address}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-start gap-3">
                                        <IconCreditCard className="w-5 h-5 text-info mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500">{t('provider_id')}</p>
                                            <p className="font-medium">#{car.providers.id}</p>
                                        </div>
                                    </div>
                                </>
                            ) : car.source_type === 'customer' && car.customers ? (
                                <>
                                    <div className="flex items-start gap-3">
                                        <IconUser className="w-5 h-5 text-primary mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500">{t('customer_name')}</p>
                                            <p className="font-semibold">{car.customers.name}</p>
                                        </div>
                                    </div>

                                    {car.customers.phone && (
                                        <div className="flex items-start gap-3">
                                            <IconPhone className="w-5 h-5 text-success mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-500">{t('phone')}</p>
                                                <p className="font-medium">{car.customers.phone}</p>
                                            </div>
                                        </div>
                                    )}

                                    {car.customers.id_number && (
                                        <div className="flex items-start gap-3">
                                            <IconCreditCard className="w-5 h-5 text-info mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-500">{t('id_number')}</p>
                                                <p className="font-medium">{car.customers.id_number}</p>
                                            </div>
                                        </div>
                                    )}

                                    {car.customers.age && (
                                        <div className="flex items-start gap-3">
                                            <IconCalendar className="w-5 h-5 text-warning mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-500">{t('age')}</p>
                                                <p className="font-medium">
                                                    {car.customers.age} {t('years_old')}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="col-span-full text-center text-gray-500 py-4">
                                    <p>{t('no_details_available')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Car Specifications */}
                {(car.desc || car.type || (car.features && car.features.length > 0)) && (
                    <div className="panel mt-6">
                        <div className="mb-5">
                            <h3 className="text-lg font-semibold">{t('car_details')}</h3>
                        </div>
                        <div className="space-y-4">
                            {car.type && (
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">{t('car_type')}</p>
                                    <p className="font-medium capitalize">{car.type}</p>
                                </div>
                            )}

                            {car.desc && (
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">{t('description')}</p>
                                    <p className="text-gray-700 dark:text-gray-300">{car.desc}</p>
                                </div>
                            )}

                            {car.features && car.features.length > 0 && (
                                <div>
                                    <p className="text-sm text-gray-500 mb-2">{t('features')}</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {car.features.map((feature, index) => (
                                            <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                                <p className="text-xs text-gray-500">{feature.label}</p>
                                                <p className="font-medium text-sm">{feature.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {car.colors && car.colors.length > 0 && (
                                <div>
                                    <p className="text-sm text-gray-500 mb-2">{t('available_colors')}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {car.colors.map((colorOption, index) => (
                                            <span key={index} className="badge badge-outline-primary">
                                                {colorOption.color}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CarDealPreview;
