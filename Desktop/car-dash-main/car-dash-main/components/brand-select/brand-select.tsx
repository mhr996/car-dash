import React, { useState, useEffect, useRef } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import { getTranslation } from '@/i18n';

interface BrandSelectProps {
    id?: string;
    name?: string;
    defaultValue?: string;
    className?: string;
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const BrandSelect = ({ defaultValue, className = 'form-select text-white-dark', onChange, name = 'brand', id }: BrandSelectProps) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBrand, setSelectedBrand] = useState(defaultValue);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Update selectedBrand when defaultValue changes
    useEffect(() => {
        setSelectedBrand(defaultValue);
    }, [defaultValue]);
    const carBrands = [
        'Acura',
        'Alfa Romeo',
        'Aston Martin',
        'Audi',
        'Bentley',
        'BMW',
        'Buick',
        'Cadillac',
        'Chevrolet',
        'Chrysler',
        'Citroen',
        'Dodge',
        'Ferrari',
        'Fiat',
        'Ford',
        'Genesis',
        'GMC',
        'Honda',
        'Hyundai',
        'Infiniti',
        'Isuzu',
        'Jaguar',
        'Jeep',
        'Kia',
        'Lamborghini',
        'Land Rover',
        'Lexus',
        'Lincoln',
        'Maserati',
        'Mazda',
        'McLaren',
        'Mercedes-Benz',
        'MINI',
        'Mitsubishi',
        'Nissan',
        'Peugeot',
        'Porsche',
        'Ram',
        'Renault',
        'Rolls-Royce',
        'Saab',
        'Subaru',
        'Suzuki',
        'Tesla',
        'Toyota',
        'Volkswagen',
        'Volvo',
        'BYD',
        'Chery',
        'Geely',
        'Great Wall',
        'Haval',
        'MG',
        'NIO',
        'Xpeng',
        'Li Auto',
        'Rivian',
        'Lucid',
        'Polestar',
        'Smart',
        'Dacia',
        'Lada',
        'Skoda',
        'SEAT',
        'Opel',
        'Vauxhall',
        'Holden',
        'Proton',
        'Perodua',
        'Tata',
        'Mahindra',
        'Maruti Suzuki',
        'Datsun',
        'Scion',
        'Saturn',
        'Pontiac',
        'Oldsmobile',
        'Mercury',
        'Hummer',
        'Plymouth',
        'Eagle',
        'Daewoo',
        'Lotus',
        'Koenigsegg',
        'Pagani',
        'Bugatti',
        'Spyker',
        'Morgan',
        'Caterham',
        'Ariel',
        'Noble',
        'TVR',
        'Marcos',
        'Westfield',
        'Ginetta',
        'AC Cars',
        'Bristol',
        'Daimler',
        'Jensen',
        'Triumph',
        'MG Motor',
        'Austin',
        'Morris',
        'Rover',
        'Hillman',
        'Sunbeam',
        'Talbot',
        'Wolseley',
        'Riley',
        'Humber',
        'Singer',
        'Standard',
        'Alvis',
        'Armstrong Siddeley',
        'Lanchester',
        'Lea-Francis',
        'Lagonda',
        'Frazer Nash',
        'Allard',
        'Jowett',
        'Bond',
        'Reliant',
        'Panther',
        'De Tomaso',
        'Lancia',
        'Autobianchi',
        'Innocenti',
        'Abarth',
        'Iso',
        'Bizzarrini',
        'Rimac',
        'Pininfarina',
        'Icona',
        'Italdesign',
        'Zagato',
        'Bertone',
        'Giugiaro',
        'Touring Superleggera',
        'Carrozzeria Touring',
        'Vignale',
        'Ghia',
        'Scuderia Cameron Glickenhaus',
        'Hennessey',
        'SSC',
        'Saleen',
        'Shelby',
        'Roush',
        'Callaway',
        'Lingenfelter',
        'Fisker',
        'Canoo',
        'Lordstown',
        'Bollinger',
        'VinFast',
        'Zeekr',
        'Lynk & Co',
        'WM Motor',
        'Aiways',
        'Byton',
        'Faraday Future',
        'SF Motors',
        'Karma',
        'Aptera',
    ].sort();

    // More accurate search: prioritize exact matches and beginning of string matches
    const filteredBrands = carBrands
        .filter((brand) => {
            const searchLower = searchTerm.toLowerCase().trim();
            const brandLower = brand.toLowerCase();

            // If search is empty, show all brands
            if (!searchLower) return true;

            // Check if brand starts with search term (highest priority)
            // Or if any word in the brand starts with search term
            // Or if brand contains the search term
            return brandLower.startsWith(searchLower) || brand.split(' ').some((word) => word.toLowerCase().startsWith(searchLower)) || brandLower.includes(searchLower);
        })
        .sort((a, b) => {
            const searchLower = searchTerm.toLowerCase().trim();
            if (!searchLower) return 0;

            const aLower = a.toLowerCase();
            const bLower = b.toLowerCase();

            // Exact matches first
            if (aLower === searchLower && bLower !== searchLower) return -1;
            if (bLower === searchLower && aLower !== searchLower) return 1;

            // Brands starting with search term
            const aStarts = aLower.startsWith(searchLower);
            const bStarts = bLower.startsWith(searchLower);
            if (aStarts && !bStarts) return -1;
            if (bStarts && !aStarts) return 1;

            // Words starting with search term
            const aWordStarts = a.split(' ').some((word) => word.toLowerCase().startsWith(searchLower));
            const bWordStarts = b.split(' ').some((word) => word.toLowerCase().startsWith(searchLower));
            if (aWordStarts && !bWordStarts) return -1;
            if (bWordStarts && !aWordStarts) return 1;

            // Alphabetical order for remaining
            return a.localeCompare(b);
        });

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const handleBrandSelect = (brand: string) => {
        setSelectedBrand(brand);
        setIsOpen(false);
        setSearchTerm('');
        if (onChange) {
            const event = {
                target: { value: brand, name: name },
            } as React.ChangeEvent<HTMLSelectElement>;
            onChange(event);
        }
    };
    return (
        <div ref={wrapperRef} className="relative">
            <div className={`${className} cursor-pointer dark:bg-black dark:text-white-dark dark:border-[#191e3a] flex items-center justify-between`} onClick={() => setIsOpen(!isOpen)}>
                <span>{selectedBrand || t('select_brand')}</span>
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:bg-black dark:border-[#191e3a]">
                    <div className="p-2">
                        <input
                            type="text"
                            className="w-full rounded border border-gray-300 p-2 focus:border-primary focus:outline-none dark:bg-black dark:border-[#191e3a] dark:text-white-dark"
                            placeholder={t('search_brands')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {filteredBrands.length > 0 ? (
                            filteredBrands.map((brand) => (
                                <div key={brand} className="cursor-pointer px-4 py-2 hover:bg-gray-100 dark:text-white-dark dark:hover:bg-[#191e3a]" onClick={() => handleBrandSelect(brand)}>
                                    {brand}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-2 text-gray-500 dark:text-gray-400 text-center">{t('no_brands_found')}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrandSelect;
