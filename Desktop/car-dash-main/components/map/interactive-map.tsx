'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLeafletCleanup, DEFAULT_MAP_POSITION } from './map-utils';

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

interface InteractiveMapProps {
    position?: [number, number] | null;
    zoom?: number;
    height?: string;
    shopName?: string;
    shopAddress?: string;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ position = null, zoom = 15, height = '400px', shopName = 'Shop Location', shopAddress }) => {
    // Use the cleanup helper
    useLeafletCleanup();

    // Use default position if none provided
    const mapPosition = position || DEFAULT_MAP_POSITION;

    // Create popup content
    const createPopupContent = () => {
        const content = document.createElement('div');
        content.className = 'p-2';

        const title = document.createElement('h6');
        title.className = 'font-semibold text-sm mb-1';
        title.textContent = shopName;

        content.appendChild(title);

        if (shopAddress) {
            const address = document.createElement('p');
            address.className = 'text-xs text-gray-600';
            address.textContent = shopAddress;
            content.appendChild(address);
        }

        const coords = document.createElement('p');
        coords.className = 'text-xs text-gray-500 mt-1';
        coords.textContent = `${mapPosition[0].toFixed(6)}, ${mapPosition[1].toFixed(6)}`;

        content.appendChild(coords);

        return content;
    };

    return (
        <div style={{ height, position: 'relative' }} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <MapContainer center={mapPosition} zoom={zoom} style={{ height: '100%', width: '100%' }} zoomControl={true} scrollWheelZoom={true} dragging={true} doubleClickZoom={true}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker
                    position={mapPosition}
                    eventHandlers={{
                        add: (e) => {
                            const marker = e.target;
                            marker
                                .bindPopup(createPopupContent(), {
                                    closeButton: true,
                                    className: 'leaflet-popup-custom',
                                })
                                .openPopup();
                        },
                    }}
                />

                <div className="leaflet-bottom leaflet-left mb-1 ml-1">
                    <div className="leaflet-control leaflet-control-attribution bg-white bg-opacity-80 dark:bg-gray-800 dark:bg-opacity-80 px-1 py-0.5 text-xs">
                        &copy;
                        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
                            OpenStreetMap
                        </a>
                        contributors
                    </div>
                </div>
            </MapContainer>
        </div>
    );
};

export default InteractiveMap;
