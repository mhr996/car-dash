'use client';
import React from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
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

interface StaticMapProps {
    position?: [number, number] | null;
    zoom?: number;
    height?: string;
}

const StaticMap: React.FC<StaticMapProps> = ({ position = null, zoom = 15, height = '400px' }) => {
    // Use the cleanup helper
    useLeafletCleanup();

    // Use default position if none provided
    const mapPosition = position || DEFAULT_MAP_POSITION;

    return (
        <div style={{ height, position: 'relative' }} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <MapContainer
                center={mapPosition}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                scrollWheelZoom={false}
                dragging={false}
                doubleClickZoom={false}
                attributionControl={false}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={mapPosition} />
                <div className="leaflet-bottom leaflet-right mb-1 mr-1">
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

export default StaticMap;
