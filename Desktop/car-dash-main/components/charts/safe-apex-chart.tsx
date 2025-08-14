'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ReactApexChart with SSR disabled
const ReactApexChart = dynamic(() => import('react-apexcharts'), {
    ssr: false,
    loading: () => <div className="h-[300px] flex items-center justify-center">Loading chart...</div>,
});

// Safe wrapper for ApexCharts to prevent "resolve is not defined" error
const SafeApexChart = ({ options, series, type, height }: any) => {
    const [chartMounted, setChartMounted] = useState(false);
    const [chartKey, setChartKey] = useState(Date.now());

    // Reset chart on mount
    useEffect(() => {
        let timer: NodeJS.Timeout;

        const mountChart = () => {
            if (typeof window !== 'undefined') {
                // Polyfill resolve for ApexCharts
                if (typeof (window as any).resolve !== 'function') {
                    (window as any).resolve = (x: any) => x;
                }
                // Small delay to ensure all required objects are initialized
                timer = setTimeout(() => {
                    setChartMounted(true);
                    // Force re-render with a new key to ensure clean chart initialization
                    setChartKey(Date.now());
                }, 100);
            }
        };

        mountChart();

        return () => {
            if (timer) clearTimeout(timer);
            setChartMounted(false);
        };
    }, []);

    if (!chartMounted || typeof window === 'undefined') {
        return <div className="h-[300px] flex items-center justify-center">Loading chart...</div>;
    }

    // Add key to force a clean render on each update
    return (
        <div key={chartKey} id={`chart-${chartKey}`} className="apex-charts-wrapper">
            <ReactApexChart options={options} series={series} type={type} height={height} />
        </div>
    );
};

export default SafeApexChart;
