'use client';
import React, { useState, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { getCurrentLocation, createCurrentLocationMarker } from './map-utils';
import LocationIcon from './location-icon';

interface CurrentLocationProps {
    onLocationFound?: (lat: number, lng: number) => void;
    setErrorMessage?: (message: string) => void;
}

const CurrentLocation: React.FC<CurrentLocationProps> = ({ onLocationFound, setErrorMessage }) => {
    const map = useMap();
    const [loading, setLoading] = useState(false);
    const [locationMarker, setLocationMarker] = useState<L.FeatureGroup | null>(null);
    const [isFirstLoad, setIsFirstLoad] = useState(true); // Function to handle getting current location
    const handleGetCurrentLocation = async (isInitialLoad = false, e?: React.MouseEvent) => {
        if (loading || !map) return; // Prevent requests if loading or map is not ready

        // Prevent form submission in case the button is inside a form
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        setLoading(true);

        try {
            // Get user's location
            const [lat, lng] = await getCurrentLocation();

            // Remove any existing location markers
            if (locationMarker) {
                locationMarker.remove();
            }

            // Create and add pulsing marker
            const marker = createCurrentLocationMarker([lat, lng]);
            marker.addTo(map);

            // Store the marker for later cleanup
            setLocationMarker(marker);

            // Fly to the location with animation
            // Use different animation behavior for initial load vs button click
            if (isInitialLoad) {
                map.setView([lat, lng], 16);
            } else {
                map.flyTo([lat, lng], 16, {
                    animate: true,
                    duration: 1,
                });
            }

            // Call the callback if provided
            if (onLocationFound) {
                onLocationFound(lat, lng);
            }

            setIsFirstLoad(false);
        } catch (error) {
            console.error('Error getting location:', error);

            // Set error message if callback is provided
            if (setErrorMessage && error instanceof Error) {
                setErrorMessage(error.message);
            }

            setIsFirstLoad(false);
        } finally {
            setLoading(false);
        }
    };

    // Clean up on component unmount
    useEffect(() => {
        return () => {
            if (locationMarker) {
                locationMarker.remove();
            }
        };
    }, [locationMarker]); // We don't need to automatically get location on initial load
    // We'll rely on the "Use my current location" button for that
    // This ensures we keep showing the shop's location when editing

    // Create a safe handler for the location icon click
    const handleIconClick = (): void => {
        handleGetCurrentLocation(false);
    };

    return (
        <div className="leaflet-top leaflet-right mt-2 mr-2 z-[1000]">
            <div className="leaflet-control">
                <LocationIcon onClick={handleIconClick} className={loading ? 'opacity-50 cursor-not-allowed' : ''} />
            </div>
        </div>
    );
};

export default CurrentLocation;
