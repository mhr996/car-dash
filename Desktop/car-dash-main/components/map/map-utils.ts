'use client';
import { useEffect } from 'react';
import L from 'leaflet';

/**
 * Helper hook to clean up Leaflet resources when a component unmounts
 * This is important to prevent memory leaks, especially in a Next.js app
 * with component re-renders during development
 */
export const useLeafletCleanup = () => {
    useEffect(() => {
        // Return cleanup function to run when component unmounts
        return () => {
            // Clean up all Leaflet event listeners
            // This prevents memory leaks when components unmount
            const eventHandlers = (L.DomEvent as any)._globalEventHandlers || {};
            const eventHandlersKeys = Object.keys(eventHandlers);
            eventHandlersKeys.forEach((k) => {
                const handler = eventHandlers[k];
                if (handler && handler.length > 0) {
                    handler.forEach((h: any) => {
                        if (h.target) {
                            L.DomEvent.off(h.target);
                        }
                    });
                }
            });
            // Clear popup cache if it exists
            if (L.Popup && (L.Popup as any)._popupCache) {
                (L.Popup as any)._popupCache = {};
            }
        };
    }, []);
};

/**
 * Common default position (center of the world map)
 * Can be used when no specific position is provided
 */
export const DEFAULT_MAP_POSITION: [number, number] = [20, 0];

/**
 * Format coordinates for display
 * @param lat Latitude
 * @param lng Longitude
 * @param decimals Number of decimal places
 * @returns Formatted coordinates string
 */
export const formatCoordinates = (lat?: number | null, lng?: number | null, decimals: number = 6): string => {
    if (lat === undefined || lat === null || lng === undefined || lng === null) {
        return 'No coordinates available';
    }

    return `${lat.toFixed(decimals)}, ${lng.toFixed(decimals)}`;
};

/**
 * Check if geolocation is available in the browser
 */
export const isGeolocationAvailable = (): boolean => {
    return 'geolocation' in navigator;
};

/**
 * Get the current user location using the browser's Geolocation API
 * @returns Promise resolving to [lat, lng] coordinates or rejecting with an error
 */
export const getCurrentLocation = (): Promise<[number, number]> => {
    return new Promise((resolve, reject) => {
        if (!isGeolocationAvailable()) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                resolve([latitude, longitude]);
            },
            (error) => {
                let errorMessage = 'Failed to get your location';

                // Provide more specific error messages
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access was denied. Please enable location permissions in your browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable. Please try again later.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Request to get location timed out. Please try again.';
                        break;
                }

                reject(new Error(errorMessage));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            },
        );
    });
};

/**
 * Create a pulsing location marker for current position
 * @param latlng The coordinates for the marker
 * @returns Leaflet FeatureGroup instance with markers
 */
export const createCurrentLocationMarker = (latlng: L.LatLngExpression): L.FeatureGroup => {
    // Create the pulse animation first (will be positioned below)
    const pulseIcon = L.divIcon({
        className: 'leaflet-pulsing-marker',
        html: `
      <div class="marker-pulse-container">
        <div class="marker-pulse-outer"></div>
        <div class="marker-pulse-middle"></div>
      </div>
    `,
        iconSize: [32, 32],
        iconAnchor: [16, 16], // Center the icon at the exact position
    });

    // Create the pulse marker
    const pulseMarker = L.marker(latlng, {
        icon: pulseIcon,
        interactive: false, // Make non-interactive so it doesn't interfere with clicks
        keyboard: false,
        zIndexOffset: -1000, // Position below other markers
    });
    // Create a centered dot marker that appears above the pulse effect
    const dotMarker = L.circleMarker(latlng, {
        radius: 6,
        fillColor: '#3b82f6', // blue-500
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 1,
        bubblingMouseEvents: false, // Don't let click events bubble to elements below
        interactive: false, // Don't make the dot clickable
        className: 'current-location-dot', // Add class for styling
    });

    // Create a feature group with both markers
    return L.featureGroup([pulseMarker, dotMarker]);
};
