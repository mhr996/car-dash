'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconEdit from '@/components/icon/icon-edit';
import IconCalendar from '@/components/icon/icon-calendar';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconUser from '@/components/icon/icon-user';
import IconTrendingUp from '@/components/icon/icon-trending-up';
import IconBox from '@/components/icon/icon-box';
import IconDocument from '@/components/icon/icon-document';
import supabase from '@/lib/supabase';
import { getTranslation } from '@/i18n';
import Link from 'next/link';
import Image from 'next/image';
import { CarContract } from '@/types/contract';
import { CarPurchaseContractPDFGenerator } from '@/utils/car-purchase-contract-pdf-generator';
import { getCompanyInfo, CompanyInfo } from '@/lib/company-info';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { usePermissions } from '@/hooks/usePermissions';

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
    desc?: string; // New description field
    features?: Array<{ label: string; value: string }>; // New features field
    images: string[];
    contract_image?: string; // Contract image field
    car_number?: string; // Car number field
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

const CarPreview = () => {
    const { t } = getTranslation();
    const params = useParams();
    const router = useRouter();
    const { hasPermission } = usePermissions();
    const [car, setCar] = useState<Car | null>(null);
    const [loading, setLoading] = useState(true);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [contractImageUrl, setContractImageUrl] = useState<string>('');
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [selectedColorIndex, setSelectedColorIndex] = useState(0);
    const [colorImageUrls, setColorImageUrls] = useState<Record<number, string[]>>({});
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

                // Get contract image URL from Supabase storage
                if (data.contract_image) {
                    const { data: urlData } = supabase.storage.from('cars').getPublicUrl(data.contract_image);
                    setContractImageUrl(urlData.publicUrl);
                }

                // Get color image URLs from Supabase storage
                if (data.colors && data.colors.length > 0) {
                    const colorUrls: Record<number, string[]> = {};

                    await Promise.all(
                        data.colors.map(async (colorData: any, colorIndex: number) => {
                            if (colorData.images && colorData.images.length > 0) {
                                const urls = await Promise.all(
                                    colorData.images.map(async (imagePath: string) => {
                                        const { data: urlData } = supabase.storage.from('cars').getPublicUrl(imagePath);
                                        return urlData.publicUrl;
                                    }),
                                );
                                colorUrls[colorIndex] = urls;
                            }
                        }),
                    );

                    setColorImageUrls(colorUrls);
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        };

        if (params?.id) {
            fetchCar();
        }
    }, [params?.id]);

    // Load company information
    useEffect(() => {
        const loadCompanyInfo = async () => {
            try {
                const info = await getCompanyInfo();
                setCompanyInfo(info);
            } catch (error) {
                console.error('Failed to load company info:', error);
            }
        };
        loadCompanyInfo();
    }, []);

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'available':
                return 'badge-outline-success';
            case 'sold':
                return 'badge-outline-danger';
            case 'reserved':
                return 'badge-outline-warning';
            case 'maintenance':
                return 'badge-outline-info';
            default:
                return 'badge-outline-primary';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'ILS',
        }).format(amount);
    };

    const formatKilometers = (km: number) => {
        return new Intl.NumberFormat().format(km) + ' km';
    };

    const createCarContractData = (): CarContract => {
        if (!car) throw new Error('Car data is required to generate contract');

        // Determine seller info based on car source
        let sellerName = '';
        let sellerAddress = '';
        let sellerPhone = '';
        let sellerTaxNumber = '';

        if (car.source_type === 'customer' && car.customers) {
            // Seller is a customer
            sellerName = car.customers.name;
            sellerAddress = '[Customer Address - To Be Filled]';
            sellerPhone = car.customers.phone || '';
            sellerTaxNumber = car.customers.id_number || '';
        } else if (car.source_type === 'provider' && car.providers) {
            // Seller is a provider
            sellerName = car.providers.name;
            sellerAddress = car.providers.address || '';
            sellerPhone = car.providers.phone || '';
            sellerTaxNumber = '[Provider Tax Number - To Be Filled]';
        } else {
            // Fallback to provider string if no detailed info
            sellerName = car.provider || '[Seller Name - To Be Filled]';
            sellerAddress = '[Seller Address - To Be Filled]';
            sellerPhone = '[Seller Phone - To Be Filled]';
            sellerTaxNumber = '[Seller Tax Number - To Be Filled]';
        }

        return {
            dealType: 'normal',
            dealDate: new Date().toISOString().split('T')[0],

            // Company info (always the dealership)
            companyName: companyInfo?.name || 'Car Dealership',
            companyTaxNumber: companyInfo?.tax_number || '',
            companyAddress: companyInfo?.address || '',
            companyPhone: companyInfo?.phone || '',

            // Seller info - the provider or customer we got the car from
            sellerName,
            sellerTaxNumber,
            sellerAddress,
            sellerPhone,

            // Buyer info - our company (the car dealership)
            buyerName: companyInfo?.name || 'Car Dealership',
            buyerId: companyInfo?.tax_number || '[Company Tax Number]',
            buyerAddress: companyInfo?.address || '[Company Address]',
            buyerPhone: companyInfo?.phone || '[Company Phone]',

            // Car info
            carType: car.type || 'Vehicle',
            carMake: car.brand,
            carModel: car.title,
            carYear: car.year,
            carBuyPrice: car.buy_price,
            carPlateNumber: car.car_number || `CAR-${car.id.slice(-6).toUpperCase()}`,
            carVin: '', // Would need to be added to car data
            carEngineNumber: '', // Would need to be added to car data
            carKilometers: car.kilometers,

            // Deal amount - using buy price (what we paid for the car)
            dealAmount: car.buy_price,

            // Standard terms
            ownershipTransferDays: 30,
        };
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
            <div className="panel">
                <div className="text-center py-10">
                    <h3 className="text-lg font-semibold text-danger">{t('car_not_found')}</h3>
                    <Link href="/cars" className="btn btn-primary mt-4">
                        <IconArrowLeft className="ltr:mr-2 rtl:ml-2" />
                        {t('back_to_cars')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Alert */}
            {alert.visible && (
                <div className="fixed top-4 right-4 z-50 min-w-80 max-w-md">
                    <Alert
                        type={alert.type}
                        title={alert.type === 'success' ? t('success') : t('error')}
                        message={alert.message}
                        onClose={() => setAlert({ visible: false, message: '', type: 'success' })}
                    />
                </div>
            )}

            {/* Header */}
            <div className="container mx-auto p-6">
                <div className="flex items-center gap-5 mb-6">
                    <div onClick={() => router.back()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </div>
                    {/* Breadcrumb Navigation */}
                    <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                        <li>
                            <Link href="/" className="text-primary hover:underline">
                                {t('home')}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <Link href="/cars" className="text-primary hover:underline">
                                {t('cars')}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span>{t('car_details')}</span>
                        </li>
                    </ul>
                </div>

                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{t('car_details')}</h1>
                        <p className="text-gray-500">{car ? car.title : t('loading')}</p>
                    </div>
                    {car && (
                        <div className="flex gap-3">
                            <button
                                className={`btn btn-outline-success gap-2${generatingContract ? ' opacity-60 pointer-events-none' : ''}`}
                                disabled={generatingContract}
                                onClick={async () => {
                                    setGeneratingContract(true);
                                    try {
                                        // Create contract data
                                        const contractData = createCarContractData();

                                        // Get language from i18nextLng cookie
                                        const getCookie = (name: string) => {
                                            const value = `; ${document.cookie}`;
                                            const parts = value.split(`; ${name}=`);
                                            if (parts.length === 2) {
                                                const part = parts.pop();
                                                if (part) {
                                                    return part.split(';').shift();
                                                }
                                            }
                                            return null;
                                        };

                                        const lang = getCookie('i18nextLng') || 'he';
                                        const normalizedLang = lang.toLowerCase().split('-')[0] as 'en' | 'ar' | 'he';

                                        const carIdentifier = car.car_number || `CAR-${car.id.slice(-6).toUpperCase()}`;
                                        const filename = `car-purchase-contract-${carIdentifier}-${new Date().toISOString().split('T')[0]}.pdf`;

                                        // Use the car purchase contract PDF generator
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
                                    <svg className="animate-spin h-4 w-4 text-success" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                    </svg>
                                ) : (
                                    <IconDocument className="w-4 h-4" />
                                )}
                                {generatingContract ? t('generating_contract') : t('generate_contract')}
                            </button>
                            <Link href={`/cars/edit/${car.id}`} className="btn btn-primary">
                                <IconEdit className="ltr:mr-2 rtl:ml-2" />
                                {t('edit_car')}
                            </Link>
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

                        {/* Color Variants */}
                        {car && car.colors && car.colors.length > 0 && (
                            <div className="panel mt-6">
                                <div className="mb-5">
                                    <h3 className="text-lg font-semibold">{t('color_variants')}</h3>
                                </div>

                                <div className="space-y-6">
                                    {/* Color Selector */}
                                    <div className="flex gap-3 flex-wrap">
                                        {car.colors.map((colorData, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setSelectedColorIndex(index)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                                                    selectedColorIndex === index ? 'border-primary bg-primary/10 text-primary' : 'border-gray-300 hover:border-primary/50'
                                                }`}
                                            >
                                                <div className="w-6 h-6 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: colorData.color }}></div>
                                                <span className="text-sm font-medium">{colorData.color.toUpperCase()}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Selected Color Images */}
                                    {colorImageUrls[selectedColorIndex] && colorImageUrls[selectedColorIndex].length > 0 && (
                                        <div>
                                            <h4 className="text-md font-medium mb-3">
                                                {t('color_images')} - {car.colors[selectedColorIndex].color.toUpperCase()}
                                            </h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                {colorImageUrls[selectedColorIndex].map((url, imageIndex) => (
                                                    <div key={imageIndex} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                                                        <Image
                                                            src={url}
                                                            alt={`${car.title} ${car.colors![selectedColorIndex].color} ${imageIndex + 1}`}
                                                            fill
                                                            className="object-cover hover:scale-105 transition-transform cursor-pointer"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* No Images for Selected Color */}
                                    {(!colorImageUrls[selectedColorIndex] || colorImageUrls[selectedColorIndex].length === 0) && (
                                        <div className="text-center py-8">
                                            <IconBox className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                                            <p className="text-gray-500 text-sm">
                                                {t('no_images_available')} {t('for')} {car.colors[selectedColorIndex].color.toUpperCase()}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Contract Image */}
                        {/* {contractImageUrl && (
                            <div className="panel mt-6">
                                <div className="mb-5">
                                    <h3 className="text-lg font-semibold">{t('contract_image')}</h3>
                                </div>
                                <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                                    <Image src={contractImageUrl} alt={`${car?.title} contract`} fill className="object-contain hover:scale-105 transition-transform cursor-pointer" />
                                </div>
                            </div>
                        )} */}
                    </div>

                    {/* Car Information */}
                    <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="panel">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">{t('basic_information')}</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-primary mb-2">{car.title}</h2>
                                    <span className={`badge ${getStatusBadgeClass(car.status)}`}>{t(`status_${car.status}`)}</span>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center">
                                        <IconBox className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('brand')}:</span>
                                        <span className="font-medium">{car.brand}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <IconCalendar className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('year')}:</span>
                                        <span className="font-medium">{car.year}</span>
                                    </div>
                                    {car.type && (
                                        <div className="flex items-center">
                                            <IconBox className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                            <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('car_type')}:</span>
                                            <span className="font-medium">{car.type}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center">
                                        <IconMapPin className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('kilometers')}:</span>
                                        <span className="font-medium">{formatKilometers(car.kilometers)}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <IconUser className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('car_source')}:</span>
                                        <div className="font-medium">
                                            {car.source_type === 'customer' && car.customers ? (
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="badge badge-outline-info text-xs">{t('from_customer')}</span>
                                                    </div>
                                                    <div className="mt-1">
                                                        <div>{car.customers.name}</div>
                                                        <div className="text-xs text-gray-500">{car.customers.phone}</div>
                                                    </div>
                                                </div>
                                            ) : car.providers ? (
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="badge badge-outline-primary text-xs">{t('from_provider')}</span>
                                                    </div>
                                                    <div className="mt-1">
                                                        <div>{car.providers.name}</div>
                                                        <div className="text-xs text-gray-500">{car.providers.address}</div>
                                                        <div className="text-xs text-gray-500">{car.providers.phone}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span>{car.provider || '-'}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pricing Information */}
                        <div className="panel">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">{t('pricing_information')}</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center">
                                        <IconDollarSign className="w-5 h-5 text-gray-400 ltr:mr-2 rtl:ml-2" />
                                        <span className="text-sm text-gray-600">{t('market_price')}:</span>
                                    </div>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(car.market_price)}</span>
                                </div>
                                {hasPermission('view_car_purchase_price') && (
                                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div className="flex items-center">
                                            <IconTrendingUp className="w-5 h-5 text-gray-400 ltr:mr-2 rtl:ml-2" /> <span className="text-sm text-gray-600">{t('buy_price')}:</span>
                                        </div>
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(car.buy_price)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center p-3 bg-primary/10 dark:bg-primary/20 rounded-lg border border-primary/20">
                                    <div className="flex items-center">
                                        <IconDollarSign className="w-5 h-5 text-primary ltr:mr-2 rtl:ml-2" />
                                        <span className="text-sm font-medium text-primary">{t('sale_price')}:</span>
                                    </div>
                                    <span className="font-bold text-lg text-primary">{formatCurrency(car.sale_price)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Car Description */}
                        {car.desc && (
                            <div className="panel">
                                <div className="mb-5">
                                    <h3 className="text-lg font-semibold">{t('car_description')}</h3>
                                </div>
                                <div className="text-gray-700 dark:text-gray-300 leading-relaxed">{car.desc}</div>
                            </div>
                        )}

                        {/* Car Features */}
                        {car.features && car.features.length > 0 && (
                            <div className="panel">
                                <div className="mb-5">
                                    <h3 className="text-lg font-semibold">خصائص السيارة</h3>
                                </div>
                                <div className="space-y-3">
                                    {car.features.map((feature, index) => (
                                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{feature.label}:</span>
                                            <span className="font-semibold text-gray-700 dark:text-gray-300">{feature.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Additional Information */}
                        <div className="panel">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">{t('additional_information')}</h3>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('car_id')}:</span>
                                    <span className="font-medium font-mono">{car.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('created_at')}:</span>
                                    <span className="font-medium">
                                        {new Date(car.created_at).toLocaleDateString('en-GB', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                        })}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('total_images')}:</span>
                                    <span className="font-medium">{imageUrls.length}</span>
                                </div>
                                {car.colors && car.colors.length > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">{t('available_colors')}:</span>
                                        <span className="font-medium">{car.colors.length}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CarPreview;
