'use client';
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './map-styles.css';
import './map-pulse.css';
import { useLeafletCleanup, DEFAULT_MAP_POSITION, isGeolocationAvailable, getCurrentLocation } from './map-utils';
import LocationSearch from './location-search';
import CurrentLocation from './current-location';

// Fix for Leaflet default icons
const DefaultIcon = L.icon({
    iconUrl: '/assets/images/map/marker-icon.png',
    shadowUrl: '/assets/images/map/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapSelectorProps {
    initialPosition?: [number, number] | null;
    zoom?: number;
    onChange: (lat: number, lng: number) => void;
    height?: string;
    showSearch?: boolean;
    useCurrentLocationByDefault?: boolean;
}

interface MapClickHandlerProps {
    setPosition: (position: [number, number]) => void;
    onChange: (lat: number, lng: number) => void;
}

// Component to handle map click events
const MapClickHandler: React.FC<MapClickHandlerProps> = ({ setPosition, onChange }) => {
    const map = useMapEvents({
        click: (e) => {
            const { lat, lng } = e.latlng;
            setPosition([lat, lng]);
            onChange(lat, lng);
        },
    });

    return null;
};

const MapSelector: React.FC<MapSelectorProps> = ({ initialPosition = null, zoom = 13, onChange, height = '400px', showSearch = true, useCurrentLocationByDefault = false }) => {
    // Default position if none provided (central point)
    const defaultPos = initialPosition || DEFAULT_MAP_POSITION;
    const [position, setPosition] = useState<[number, number]>(defaultPos);
    const [address, setAddress] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isInitializing, setIsInitializing] = useState<boolean>(true);
    const mapRef = useRef<L.Map>(null);

    // Use the cleanup helper
    useLeafletCleanup();

    // Try to get current location on initial load if requested and no initialPosition is provided
    useEffect(() => {
        const tryGetCurrentLocation = async () => {
            // Only try to get the current location if:
            // 1. No initial position is provided AND
            // 2. useCurrentLocationByDefault is true AND
            // 3. Geolocation is available
            if (!initialPosition && useCurrentLocationByDefault && isGeolocationAvailable()) {
                try {
                    const [lat, lng] = await getCurrentLocation();
                    setPosition([lat, lng]);
                    onChange(lat, lng);

                    // Make sure to update map view when location is found
                    if (mapRef.current) {
                        setTimeout(() => {
                            mapRef.current?.setView([lat, lng], 16);
                        }, 200);
                    }
                } catch (err) {
                    console.log('Could not get initial location, using default', err);
                    // Continue with default position if location not available
                }
            }
            setIsInitializing(false);
        };

        tryGetCurrentLocation();
    }, [initialPosition, useCurrentLocationByDefault, onChange]);

    useEffect(() => {
        // If initialPosition changes from outside the component, update internal state
        if (initialPosition) {
            setPosition(initialPosition);
        }
    }, [initialPosition]);

    useEffect(() => {
        // When the map component is loaded, make sure it's properly sized
        if (mapRef.current) {
            setTimeout(() => {
                mapRef.current?.invalidateSize();
            }, 100);
        }
    }, []);

    // Handler for location search selection
    const handleLocationSelect = (lat: number, lng: number, selectedAddress: string) => {
        const newPosition: [number, number] = [lat, lng];
        setPosition(newPosition);
        setAddress(selectedAddress);
        onChange(lat, lng);

        // Center map on the selected location
        if (mapRef.current) {
            mapRef.current.setView(newPosition, 16);
        }
    };

    // Handler for when current location is found
    const handleLocationFound = (lat: number, lng: number) => {
        const newPosition: [number, number] = [lat, lng];
        setPosition(newPosition);
        setError(''); // Clear any previous errors
        onChange(lat, lng);
    };

    // Handler for location errors
    const handleLocationError = (message: string) => {
        setError(message);
        setTimeout(() => setError(''), 5000); // Clear error after 5 seconds
    };

    return (
        <div className="flex flex-col">
            {showSearch && (
                <div className="mb-3">
                    <LocationSearch onSelect={handleLocationSelect} placeholder="Search for a shop location..." />
                    {address && <p className="mt-1 text-xs text-gray-500 truncate">Selected: {address}</p>}
                </div>
            )}

            {error && <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md">{error}</div>}

            <div style={{ height, position: 'relative' }} className="location-selector border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                <MapContainer
                    center={position}
                    zoom={zoom}
                    style={{ height: '100%', width: '100%' }}
                    ref={mapRef}
                    whenReady={() => {
                        if (mapRef.current) {
                            mapRef.current.invalidateSize();
                        }
                    }}
                    attributionControl={false}
                >
                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={position} />
                    <MapClickHandler setPosition={setPosition} onChange={onChange} />
                    <CurrentLocation onLocationFound={handleLocationFound} setErrorMessage={handleLocationError} />
                    <div className="leaflet-bottom leaflet-right mb-5 mr-2">
                        <div className="leaflet-control leaflet-control-attribution bg-white bg-opacity-80 dark:bg-gray-800 dark:bg-opacity-80 px-1 py-0.5 text-xs">
                            &copy;
                            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
                                OpenStreetMap
                            </a>
                            contributors
                        </div>
                    </div>
                </MapContainer>
                <div className="location-selector-overlay">
                    Click on the map to set the shop location or use the <span className="text-blue-500">location button</span> in the top-right corner
                </div>
            </div>
        </div>
    );
};

export default MapSelector;
