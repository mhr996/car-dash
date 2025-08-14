'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useLeafletCleanup } from './map-utils';

interface LocationSearchProps {
    onSelect: (lat: number, lng: number, address: string) => void;
    placeholder?: string;
    className?: string;
}

interface SearchResult {
    place_id: number;
    lat: string;
    lon: string;
    display_name: string;
    address: {
        road?: string;
        city?: string;
        country?: string;
        postcode?: string;
    };
}

const LocationSearch: React.FC<LocationSearchProps> = ({ onSelect, placeholder = 'Search for a location...', className = '' }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Use cleanup helper
    useLeafletCleanup();

    // Handle clicks outside of the dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Debounced search function
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setShowResults(false);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`);

                if (response.ok) {
                    const data: SearchResult[] = await response.json();
                    setResults(data);
                    setShowResults(true);
                } else {
                    console.error('Error fetching location data');
                    setResults([]);
                }
            } catch (error) {
                console.error('Error searching for location:', error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (result: SearchResult) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        onSelect(lat, lng, result.display_name);
        setQuery(result.display_name);
        setShowResults(false);
    };

    return (
        <div className={`relative ${className}`} ref={searchRef}>
            <div className="relative">
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} className="form-input w-full pr-10" />
                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    </div>
                )}
            </div>

            {showResults && results.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <ul className="max-h-60 overflow-auto py-1">
                        {results.map((result) => (
                            <li key={result.place_id} onClick={() => handleSelect(result)} className="cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                                {result.display_name}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default LocationSearch;
