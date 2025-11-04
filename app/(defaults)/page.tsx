'use client';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { IRootState } from '@/store';
import supabase from '@/lib/supabase';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getTranslation } from '@/i18n';

// Dynamically import ReactApexChart with SSR disabled
const ReactApexChart = dynamic(() => import('react-apexcharts'), {
    ssr: false,
    loading: () => (
        <div className="h-[200px] flex items-center justify-center animate-pulse bg-gray-200 dark:bg-gray-700 rounded">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32 animate-pulse"></div>
        </div>
    ),
});

// Icons
import IconCar from '@/components/icon/icon-car';
import IconTrendingUp from '@/components/icon/icon-trending-up';
import IconTrendingDown from '@/components/icon/icon-trending-down';
import IconMenuInvoice from '@/components/icon/menu/icon-menu-invoice';
import IconUsersGroup from '@/components/icon/icon-users-group';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconCash from '@/components/icon/icon-cash-banknotes';
import IconSettings from '@/components/icon/icon-settings';
import IconUser from '@/components/icon/icon-user';
import IconClipboardText from '@/components/icon/icon-clipboard-text';
import IconShoppingCart from '@/components/icon/icon-shopping-cart';
import IconBox from '@/components/icon/icon-box';
import IconStore from '@/components/icon/icon-store';
import IconHorizontalDots from '@/components/icon/icon-horizontal-dots';
import IconMenuCharts from '@/components/icon/menu/icon-menu-charts';
import IconMenuComponents from '@/components/icon/menu/icon-menu-components';
import IconMenuNotes from '@/components/icon/menu/icon-menu-notes';

interface DashboardStats {
    totalCars: number;
    totalDeals: number;
    totalCustomers: number;
    totalProviders: number;
    totalRevenue: number;
    monthlyRevenue: number;
    totalCarsSalePrice: number;
    carsGrowth: number;
    dealsGrowth: number;
    customersGrowth: number;
    revenueGrowth: number;
    loading: boolean;
    chartData: {
        months: string[];
        sales: number[];
        deals: number[];
        revenue: number[];
    };
    recentActivity: any[];
    dealsByType: { [key: string]: number };
    carsByStatus: { [key: string]: number };
}

type TimeFilter = 'week' | 'month' | 'year' | 'all';

const HomePage = () => {
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';
    const [isMounted, setIsMounted] = useState(false);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
    const { t } = getTranslation();

    const [stats, setStats] = useState<DashboardStats>({
        totalCars: 0,
        totalDeals: 0,
        totalCustomers: 0,
        totalProviders: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        totalCarsSalePrice: 0,
        carsGrowth: 0,
        dealsGrowth: 0,
        customersGrowth: 0,
        revenueGrowth: 0,
        loading: true,
        chartData: {
            months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            sales: [0, 0, 0, 0, 0, 0],
            deals: [0, 0, 0, 0, 0, 0],
            revenue: [0, 0, 0, 0, 0, 0],
        },
        recentActivity: [],
        dealsByType: {},
        carsByStatus: {},
    });

    // Set is mounted for client-side rendering of charts
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Calculate growth percentage
    const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    // Get date range based on filter
    const getDateRange = (filter: TimeFilter) => {
        const now = new Date();
        let startDate: Date;
        let previousStartDate: Date;
        let previousEndDate: Date;

        switch (filter) {
            case 'week':
                // Current week (Sunday to Saturday)
                const currentDayOfWeek = now.getDay();
                startDate = new Date(now);
                startDate.setDate(now.getDate() - currentDayOfWeek);
                startDate.setHours(0, 0, 0, 0);

                // Previous week
                previousStartDate = new Date(startDate);
                previousStartDate.setDate(startDate.getDate() - 7);
                previousEndDate = new Date(startDate);
                break;

            case 'month':
                // Current month
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);

                // Previous month
                previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                previousEndDate = new Date(startDate);
                break;

            case 'year':
                // Current year
                startDate = new Date(now.getFullYear(), 0, 1);

                // Previous year
                previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
                previousEndDate = new Date(startDate);
                break;

            case 'all':
            default:
                // All time - use a very old date
                startDate = new Date('2000-01-01');
                previousStartDate = new Date('2000-01-01');
                previousEndDate = new Date('2000-01-01');
                break;
        }

        return {
            currentStart: startDate,
            previousStart: previousStartDate,
            previousEnd: previousEndDate,
        };
    };

    useEffect(() => {
        const fetchDashboardStats = async () => {
            try {
                setStats((prev) => ({ ...prev, loading: true }));

                // Get date ranges based on current filter
                const { currentStart, previousStart, previousEnd } = getDateRange(timeFilter);

                // Consolidate all database queries into fewer parallel calls
                const sixMonthsAgo = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);

                const [
                    // Current period counts
                    carsResult,
                    dealsResult,
                    customersResult,
                    providersResult,
                    // Previous period counts (for growth calculation)
                    previousCarsResult,
                    previousDealsResult,
                    previousCustomersResult,
                    // Revenue data
                    { data: revenueData },
                    { data: previousRevenueData },
                    // Total cars sale price
                    { data: carsWithSalePrices },
                    // Chart data (all in single queries)
                    { data: allDealsForChart },
                    { data: allCarsForChart },
                    { data: allRevenueForChart },
                    // Additional data
                    { data: dealTypesData },
                    { data: carStatusData },
                    { data: recentActivity },
                ] = await Promise.all([
                    // Current period queries
                    timeFilter === 'all'
                        ? supabase.from('cars').select('*', { count: 'exact', head: true })
                        : supabase.from('cars').select('*', { count: 'exact', head: true }).gte('created_at', currentStart.toISOString()),

                    timeFilter === 'all'
                        ? supabase.from('deals').select('*', { count: 'exact', head: true })
                        : supabase.from('deals').select('*', { count: 'exact', head: true }).gte('created_at', currentStart.toISOString()),

                    timeFilter === 'all'
                        ? supabase.from('customers').select('*', { count: 'exact', head: true })
                        : supabase.from('customers').select('*', { count: 'exact', head: true }).gte('created_at', currentStart.toISOString()),

                    timeFilter === 'all'
                        ? supabase.from('providers').select('*', { count: 'exact', head: true })
                        : supabase.from('providers').select('*', { count: 'exact', head: true }).gte('created_at', currentStart.toISOString()),

                    // Previous period queries (only if not 'all')
                    timeFilter === 'all'
                        ? Promise.resolve({ count: 0 })
                        : supabase.from('cars').select('*', { count: 'exact', head: true }).gte('created_at', previousStart.toISOString()).lt('created_at', previousEnd.toISOString()),

                    timeFilter === 'all'
                        ? Promise.resolve({ count: 0 })
                        : supabase.from('deals').select('*', { count: 'exact', head: true }).gte('created_at', previousStart.toISOString()).lt('created_at', previousEnd.toISOString()),

                    timeFilter === 'all'
                        ? Promise.resolve({ count: 0 })
                        : supabase.from('customers').select('*', { count: 'exact', head: true }).gte('created_at', previousStart.toISOString()).lt('created_at', previousEnd.toISOString()),

                    // Revenue queries
                    timeFilter === 'all'
                        ? supabase.from('deals').select('amount, created_at').not('amount', 'is', null)
                        : supabase.from('deals').select('amount, created_at').not('amount', 'is', null).gte('created_at', currentStart.toISOString()),

                    timeFilter === 'all'
                        ? Promise.resolve({ data: [] })
                        : supabase.from('deals').select('amount').gte('created_at', previousStart.toISOString()).lt('created_at', previousEnd.toISOString()).not('amount', 'is', null),

                    // Total cars sale price (all cars regardless of date filter)
                    supabase.from('cars').select('sale_price').not('sale_price', 'is', null),

                    // Chart data queries (last 6 months)
                    supabase.from('deals').select('created_at').gte('created_at', sixMonthsAgo.toISOString()),
                    supabase.from('cars').select('created_at').gte('created_at', sixMonthsAgo.toISOString()),
                    supabase.from('deals').select('amount, created_at').gte('created_at', sixMonthsAgo.toISOString()).not('amount', 'is', null),

                    // Deals by type
                    timeFilter === 'all' ? supabase.from('deals').select('deal_type') : supabase.from('deals').select('deal_type').gte('created_at', currentStart.toISOString()),

                    // Cars by status
                    timeFilter === 'all' ? supabase.from('cars').select('status') : supabase.from('cars').select('status').gte('created_at', currentStart.toISOString()),

                    // Recent activity
                    supabase.from('logs').select('*').order('created_at', { ascending: false }).limit(10),
                ]);

                // Process results
                const totalCars = carsResult.count || 0;
                const totalDeals = dealsResult.count || 0;
                const totalCustomers = customersResult.count || 0;
                const totalProviders = providersResult.count || 0;

                const previousCars = previousCarsResult.count || 0;
                const previousDeals = previousDealsResult.count || 0;
                const previousCustomers = previousCustomersResult.count || 0;

                const totalRevenue = revenueData?.reduce((sum, deal) => sum + (deal.amount || 0), 0) || 0;
                const monthlyRevenue = totalRevenue;
                const previousMonthRevenue = previousRevenueData?.reduce((sum, deal) => sum + (deal.amount || 0), 0) || 0;
                const totalCarsSalePrice = carsWithSalePrices?.reduce((sum, car) => sum + (car.sale_price || 0), 0) || 0;

                // Calculate growth rates
                const carsGrowth = timeFilter === 'all' ? 0 : calculateGrowth(totalCars || 0, previousCars || 0);
                const dealsGrowth = timeFilter === 'all' ? 0 : calculateGrowth(totalDeals || 0, previousDeals || 0);
                const customersGrowth = timeFilter === 'all' ? 0 : calculateGrowth(totalCustomers || 0, previousCustomers || 0);
                const revenueGrowth = timeFilter === 'all' ? 0 : calculateGrowth(monthlyRevenue, previousMonthRevenue);

                // Process chart data efficiently in memory from already fetched data
                const now = new Date();
                const chartMonths = [];
                const chartSales = [];
                const chartDeals = [];
                const chartRevenue = [];

                for (let i = 5; i >= 0; i--) {
                    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

                    chartMonths.push(month.toLocaleDateString('en-US', { month: 'short' }));

                    // Count items for this month from already fetched data
                    const monthDeals = (allDealsForChart || []).filter((deal) => {
                        const dealDate = new Date(deal.created_at);
                        return dealDate >= month && dealDate < nextMonth;
                    }).length;

                    const monthCars = (allCarsForChart || []).filter((car) => {
                        const carDate = new Date(car.created_at);
                        return carDate >= month && carDate < nextMonth;
                    }).length;

                    const monthRevenueTotal = (allRevenueForChart || [])
                        .filter((deal) => {
                            const dealDate = new Date(deal.created_at);
                            return dealDate >= month && dealDate < nextMonth;
                        })
                        .reduce((sum, deal) => sum + (deal.amount || 0), 0);

                    chartDeals.push(monthDeals);
                    chartSales.push(monthCars);
                    chartRevenue.push(monthRevenueTotal);
                }

                // Process deals by type
                const dealsByType: { [key: string]: number } = {};
                (dealTypesData || []).forEach((deal) => {
                    dealsByType[deal.deal_type] = (dealsByType[deal.deal_type] || 0) + 1;
                });

                // Process cars by status
                const carsByStatus: { [key: string]: number } = {};
                (carStatusData || []).forEach((car) => {
                    carsByStatus[car.status] = (carsByStatus[car.status] || 0) + 1;
                });

                setStats({
                    totalCars: totalCars || 0,
                    totalDeals: totalDeals || 0,
                    totalCustomers: totalCustomers || 0,
                    totalProviders: totalProviders || 0,
                    totalRevenue,
                    monthlyRevenue,
                    totalCarsSalePrice,
                    carsGrowth,
                    dealsGrowth,
                    customersGrowth,
                    revenueGrowth,
                    loading: false,
                    chartData: {
                        months: chartMonths,
                        sales: chartSales,
                        deals: chartDeals,
                        revenue: chartRevenue,
                    },
                    recentActivity: recentActivity || [],
                    dealsByType,
                    carsByStatus,
                });
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
                setStats((prev) => ({ ...prev, loading: false }));
            }
        };

        fetchDashboardStats();
    }, [timeFilter]);

    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'ILS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Format large numbers
    const formatNumber = (value: number) => {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(0) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(0) + 'K';
        }
        return value.toString();
    };

    // Get growth indicator
    const getGrowthIndicator = (growth: number) => {
        if (growth > 0) {
            return {
                icon: <IconTrendingUp className="w-4 h-4" />,
                color: 'text-success',
                bgColor: 'bg-success-light',
            };
        } else if (growth < 0) {
            return {
                icon: <IconTrendingDown className="w-4 h-4" />,
                color: 'text-danger',
                bgColor: 'bg-danger-light',
            };
        }
        return {
            icon: <IconTrendingUp className="w-4 h-4" />,
            color: 'text-secondary',
            bgColor: 'bg-secondary-light',
        };
    };

    // Chart configurations
    const salesChart = {
        series: [
            {
                name: t('cars_added'),
                data: stats.chartData.sales,
            },
            {
                name: t('deals_closed'),
                data: stats.chartData.deals,
            },
        ],
        options: {
            chart: {
                height: 325,
                type: 'area' as const,
                fontFamily: 'Nunito, sans-serif',
                zoom: {
                    enabled: false,
                },
                toolbar: {
                    show: false,
                },
            },
            dataLabels: {
                enabled: false,
            },
            stroke: {
                show: true,
                curve: 'smooth' as const,
                width: 2,
                lineCap: 'square' as const,
            },
            dropShadow: {
                enabled: true,
                opacity: 0.2,
                blur: 10,
                left: -7,
                top: 22,
            },
            colors: isDark ? ['#2196F3', '#E7515A'] : ['#1B55E2', '#E7515A'],
            markers: {
                discrete: [
                    {
                        seriesIndex: 0,
                        dataPointIndex: 6,
                        fillColor: '#1B55E2',
                        strokeColor: 'transparent',
                        size: 7,
                    },
                    {
                        seriesIndex: 1,
                        dataPointIndex: 5,
                        fillColor: '#E7515A',
                        strokeColor: 'transparent',
                        size: 7,
                    },
                ],
            },
            labels: stats.chartData.months,
            xaxis: {
                axisBorder: {
                    show: false,
                },
                axisTicks: {
                    show: false,
                },
                crosshairs: {
                    show: true,
                },
                labels: {
                    offsetX: isRtl ? 2 : 0,
                    offsetY: 5,
                    style: {
                        fontSize: '12px',
                        cssClass: 'apexcharts-xaxis-title',
                    },
                },
            },
            yaxis: {
                tickAmount: 7,
                labels: {
                    formatter: (value: number) => {
                        return formatNumber(value);
                    },
                    offsetX: isRtl ? -30 : -10,
                    offsetY: 0,
                    style: {
                        fontSize: '12px',
                        cssClass: 'apexcharts-yaxis-title',
                    },
                },
                opposite: isRtl ? true : false,
            },
            grid: {
                borderColor: isDark ? '#191E3A' : '#E0E6ED',
                strokeDashArray: 5,
                xaxis: {
                    lines: {
                        show: true,
                    },
                },
                yaxis: {
                    lines: {
                        show: false,
                    },
                },
                padding: {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                },
            },
            legend: {
                position: 'top' as const,
                horizontalAlign: 'right' as const,
                fontSize: '16px',
                markers: {
                    width: 10,
                    height: 10,
                    offsetX: -2,
                },
                itemMargin: {
                    horizontal: 10,
                    vertical: 5,
                },
            },
            tooltip: {
                marker: {
                    show: true,
                },
                x: {
                    show: false,
                },
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    inverseColors: !1,
                    opacityFrom: isDark ? 0.19 : 0.28,
                    opacityTo: 0.05,
                    stops: isDark ? [100, 100] : [45, 100],
                },
            },
        },
    };

    const revenueChart = {
        series: [
            {
                name: t('revenue'),
                data: stats.chartData.revenue,
            },
        ],
        options: {
            chart: {
                height: 300,
                type: 'line' as const,
                fontFamily: 'Nunito, sans-serif',
                toolbar: {
                    show: false,
                },
            },
            colors: ['#00AB55'],
            stroke: {
                curve: 'smooth' as const,
                width: 2,
            },
            xaxis: {
                categories: stats.chartData.months,
            },
            yaxis: {
                labels: {
                    formatter: (value: number) => formatCurrency(value),
                },
            },
            tooltip: {
                y: {
                    formatter: (value: number) => formatCurrency(value),
                },
            },
        },
    };

    const dealTypeChart = {
        series: Object.values(stats.dealsByType),
        options: {
            chart: {
                height: 300,
                type: 'donut' as const,
                fontFamily: 'Almarai, sans-serif',
            },
            labels: Object.keys(stats.dealsByType).map((type) => t(`deal_type_${type}`)),
            colors: ['#4361EE', '#805DCA', '#00AB55', '#E7515A', '#E2A03F', '#2196F3'],
            responsive: [
                {
                    breakpoint: 480,
                    options: {
                        chart: {
                            width: 200,
                        },
                        legend: {
                            position: 'bottom' as const,
                        },
                    },
                },
            ],
            stroke: {
                show: false,
            },
            legend: {
                position: 'bottom' as const,
            },
        },
    };

    if (stats.loading) {
        return (
            <div className="pt-5 max-w-[1500px]">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-black dark:text-white">{t('dashboard')}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('overview_analytics')}</p>
                    </div>
                    <div className="flex gap-2 bg-white dark:bg-[#1b2e4b] rounded-lg p-1 border border-gray-200 dark:border-gray-600">
                        {(['week', 'month', 'year', 'all'] as TimeFilter[]).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setTimeFilter(filter)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                                    timeFilter === filter ? 'bg-primary text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                {t(`time_filter_${filter}`)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-6">
                    {/* Loading skeleton for summary cards */}
                    <div className="mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="panel">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="h-4 bg-gray-300/60 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                                    <div className="h-5 bg-gray-300/60 dark:bg-gray-700 rounded w-12 animate-pulse"></div>
                                </div>
                                <div className="mb-5">
                                    <div className="h-7 bg-gray-400/60 dark:bg-gray-600 rounded w-16 animate-pulse"></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 bg-gray-300/60 dark:bg-gray-700 rounded mr-2 animate-pulse"></div>
                                    <div className="h-3 bg-gray-300/60 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Loading skeleton for deals by type and quick actions */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Deals by type skeleton */}
                        <div className="panel">
                            <div className="mb-5">
                                <div className="h-5 bg-gray-300/60 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                            </div>
                            <div className="flex justify-center">
                                <div className="h-64 w-64 bg-gray-300/60 dark:bg-gray-700 rounded-full animate-pulse"></div>
                            </div>
                        </div>

                        {/* Quick actions skeleton */}
                        <div className="panel lg:col-span-2">
                            <div className="mb-5">
                                <div className="h-5 bg-gray-300/60 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="flex flex-col items-center rounded-md border border-gray-200 dark:border-gray-600 p-4">
                                        <div className="h-12 w-12 bg-gray-300/60 dark:bg-gray-700 rounded-lg mb-3 animate-pulse"></div>
                                        <div className="h-4 bg-gray-300/60 dark:bg-gray-700 rounded w-16 mb-2 animate-pulse"></div>
                                        <div className="h-3 bg-gray-300/60 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="flex items-center rounded-md border border-gray-200 dark:border-gray-600 p-4 gap-2">
                                        <div className="h-12 w-12 bg-gray-300/60 dark:bg-gray-700 rounded-lg mr-4 animate-pulse"></div>
                                        <div className="flex-1">
                                            <div className="h-4 bg-gray-300/60 dark:bg-gray-700 rounded w-20 mb-2 animate-pulse"></div>
                                            <div className="h-3 bg-gray-300/60 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Loading skeleton for charts */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {[1, 2].map((i) => (
                            <div key={i} className="panel">
                                <div className="mb-5">
                                    <div className="h-5 bg-gray-300/60 dark:bg-gray-700 rounded w-28 animate-pulse"></div>
                                </div>
                                <div className="h-64 bg-gray-300/60 dark:bg-gray-700 rounded animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="pt-5 max-w-[1500px]">
                {/* Time Filter Buttons */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-black dark:text-white">{t('dashboard')}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('overview_analytics')}</p>
                    </div>
                    <div className="flex gap-2 bg-white dark:bg-[#1b2e4b] rounded-lg p-1 border border-gray-200 dark:border-gray-600">
                        {(['week', 'month', 'year', 'all'] as TimeFilter[]).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setTimeFilter(filter)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                                    timeFilter === filter ? 'bg-primary text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                {t(`time_filter_${filter}`)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {/* Total Revenue */}
                    <div className="panel">
                        <div className="flex items-center justify-between dark:text-white-light">
                            <div className="text-md font-semibold ltr:mr-1 rtl:ml-1">{t('total_revenue')}</div>
                            <div className="dropdown">
                                <span className={`badge ${stats.revenueGrowth >= 0 ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                    {stats.revenueGrowth >= 0 ? '+' : ''}
                                    {stats.revenueGrowth.toFixed(0)}%
                                </span>
                            </div>
                        </div>
                        <div className="mt-5 flex items-center">
                            <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{formatCurrency(stats.totalRevenue)}</div>
                        </div>
                        <div className="mt-5 flex items-center font-semibold">
                            <IconCash className="h-5 w-5 text-success ltr:mr-2 rtl:ml-2" />
                            <p className="text-xs text-success">
                                + {formatCurrency(stats.monthlyRevenue)} {t('this_month')}
                            </p>
                        </div>
                    </div>

                    {/* Total Cars */}
                    <div className="panel">
                        <div className="flex items-center justify-between dark:text-white-light">
                            <div className="text-md font-semibold ltr:mr-1 rtl:ml-1">{t('total_cars')}</div>
                            <div className="dropdown">
                                <span className={`badge ${stats.carsGrowth >= 0 ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                    {stats.carsGrowth >= 0 ? '+' : ''}
                                    {stats.carsGrowth.toFixed(0)}%
                                </span>
                            </div>
                        </div>
                        <div className="mt-5 flex items-center">
                            <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{formatNumber(stats.totalCars)}</div>
                        </div>
                        <div className="mt-2 mb-2">
                            <div className="text-lg font-semibold text-success">{formatCurrency(stats.totalCarsSalePrice)}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('total_sale_value')}</div>
                        </div>
                        <div className="mt-5 flex items-center font-semibold">
                            <IconCar className="h-5 w-5 text-primary ltr:mr-2 rtl:ml-2" />
                            <p className="text-xs text-primary">{t('total_inventory')}</p>
                        </div>
                    </div>

                    {/* Total Deals */}
                    <div className="panel">
                        <div className="flex items-center justify-between dark:text-white-light">
                            <div className="text-md font-semibold ltr:mr-1 rtl:ml-1">{t('total_deals')}</div>
                            <div className="dropdown">
                                <span className={`badge ${stats.dealsGrowth >= 0 ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                    {stats.dealsGrowth >= 0 ? '+' : ''}
                                    {stats.dealsGrowth.toFixed(0)}%
                                </span>
                            </div>
                        </div>
                        <div className="mt-5 flex items-center">
                            <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{formatNumber(stats.totalDeals)}</div>
                        </div>
                        <div className="mt-5 flex items-center font-semibold">
                            <IconMenuInvoice className="h-5 w-5 text-warning ltr:mr-2 rtl:ml-2" />
                            <p className="text-xs text-warning">{t('total_transactions')}</p>
                        </div>
                    </div>

                    {/* Total Customers */}
                    <div className="panel">
                        <div className="flex items-center justify-between dark:text-white-light">
                            <div className="text-md font-semibold ltr:mr-1 rtl:ml-1">{t('total_customers')}</div>
                            <div className="dropdown">
                                <span className={`badge ${stats.customersGrowth >= 0 ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                    {stats.customersGrowth >= 0 ? '+' : ''}
                                    {stats.customersGrowth.toFixed(0)}%
                                </span>
                            </div>
                        </div>
                        <div className="mt-5 flex items-center">
                            <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{formatNumber(stats.totalCustomers)}</div>
                        </div>
                        <div className="mt-5 flex items-center font-semibold">
                            <IconUsersGroup className="h-5 w-5 text-danger ltr:mr-2 rtl:ml-2" />
                            <p className="text-xs text-danger">{t('registered_customers')}</p>
                        </div>
                    </div>
                </div>

                {/* Deals by Type & Quick Actions */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 my-6">
                    {/* Deals by Type */}
                    <div className="panel">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('deals_by_type')}</h5>
                        </div>
                        <div className="mb-5">
                            {isMounted && Object.keys(stats.dealsByType).length > 0 && <ReactApexChart options={dealTypeChart.options} series={dealTypeChart.series} type="donut" height={350} />}
                            {Object.keys(stats.dealsByType).length === 0 && (
                                <div className="flex h-72 items-center justify-center">
                                    <div className="text-lg text-gray-500">{t('no_deals_data')}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="panel lg:col-span-2">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('quick_actions')}</h5>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {/* Add New Car */}
                            <Link href="/cars/add" className="group">
                                <div className="flex flex-col items-center rounded-md border border-gray-200 p-4 transition-all duration-300 hover:border-primary hover:bg-primary/5 dark:border-[#191e3a] dark:hover:border-primary">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                                        <IconPlus className="h-6 w-6" />
                                    </div>
                                    <div className="text-center">
                                        <h6 className="font-semibold text-[#515365] group-hover:text-primary dark:text-white-light text-sm">{t('add_new_car')}</h6>
                                        <p className="text-xs text-white-dark mt-1">{t('create_new_car')}</p>
                                    </div>
                                </div>
                            </Link>

                            {/* Add New Deal */}
                            <Link href="/sales-deals/add" className="group">
                                <div className="flex flex-col items-center rounded-md border border-gray-200 p-4 transition-all duration-300 hover:border-warning hover:bg-warning/5 dark:border-[#191e3a] dark:hover:border-warning">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10 text-warning mb-3">
                                        <IconPlus className="h-6 w-6" />
                                    </div>
                                    <div className="text-center">
                                        <h6 className="font-semibold text-[#515365] group-hover:text-warning dark:text-white-light text-sm">{t('add_new_deal')}</h6>
                                        <p className="text-xs text-white-dark mt-1">{t('create_new_deal')}</p>
                                    </div>
                                </div>
                            </Link>

                            {/* Add New Bill */}
                            <Link href="/bills/add" className="group">
                                <div className="flex flex-col items-center rounded-md border border-gray-200 p-4 transition-all duration-300 hover:border-info hover:bg-info/5 dark:border-[#191e3a] dark:hover:border-info">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info/10 text-info mb-3">
                                        <IconPlus className="h-6 w-6" />
                                    </div>
                                    <div className="text-center">
                                        <h6 className="font-semibold text-[#515365] group-hover:text-info dark:text-white-light text-sm">{t('add_new_bill')}</h6>
                                        <p className="text-xs text-white-dark mt-1">{t('create_new_bill')}</p>
                                    </div>
                                </div>
                            </Link>

                            {/* Add New Client */}
                            <Link href="/customers/add" className="group">
                                <div className="flex flex-col items-center rounded-md border border-gray-200 p-4 transition-all duration-300 hover:border-success hover:bg-success/5 dark:border-[#191e3a] dark:hover:border-success">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10 text-success mb-3">
                                        <IconPlus className="h-6 w-6" />
                                    </div>
                                    <div className="text-center">
                                        <h6 className="font-semibold text-[#515365] group-hover:text-success dark:text-white-light text-sm">{t('add_new_client')}</h6>
                                        <p className="text-xs text-white-dark mt-1">{t('create_new_client')}</p>
                                    </div>
                                </div>
                            </Link>
                        </div>

                        {/* Quick Management Links */}
                        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Link href="/cars" className="group">
                                <div className="flex items-center rounded-md border border-gray-200 p-4 transition-all duration-300 hover:border-primary hover:bg-primary/5 dark:border-[#191e3a] dark:hover:border-primary">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <IconCar className="h-6 w-6" />
                                    </div>
                                    <div className="ltr:ml-4 rtl:mr-4">
                                        <h6 className="font-semibold text-[#515365] group-hover:text-primary dark:text-white-light">{t('manage_cars')}</h6>
                                        <p className="text-xs text-white-dark">{t('add_edit_cars')}</p>
                                    </div>
                                </div>
                            </Link>

                            <Link href="/sales-deals" className="group">
                                <div className="flex items-center rounded-md border border-gray-200 p-4 transition-all duration-300 hover:border-warning hover:bg-warning/5 dark:border-[#191e3a] dark:hover:border-warning">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10 text-warning">
                                        <IconMenuInvoice className="h-6 w-6" />
                                    </div>
                                    <div className="ltr:ml-4 rtl:mr-4">
                                        <h6 className="font-semibold text-[#515365] group-hover:text-warning dark:text-white-light">{t('manage_deals')}</h6>
                                        <p className="text-xs text-white-dark">{t('create_track_deals')}</p>
                                    </div>
                                </div>
                            </Link>

                            <Link href="/customers" className="group">
                                <div className="flex items-center rounded-md border border-gray-200 p-4 transition-all duration-300 hover:border-success hover:bg-success/5 dark:border-[#191e3a] dark:hover:border-success">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10 text-success">
                                        <IconUsersGroup className="h-6 w-6" />
                                    </div>
                                    <div className="ltr:ml-4 rtl:mr-4">
                                        <h6 className="font-semibold text-[#515365] group-hover:text-success dark:text-white-light">{t('manage_customers')}</h6>
                                        <p className="text-xs text-white-dark">{t('view_customer_info')}</p>
                                    </div>
                                </div>
                            </Link>

                            <Link href="/analytics" className="group">
                                <div className="flex items-center rounded-md border border-gray-200 p-4 transition-all duration-300 hover:border-danger hover:bg-danger/5 dark:border-[#191e3a] dark:hover:border-danger">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-danger/10 text-danger">
                                        <IconEye className="h-6 w-6" />
                                    </div>
                                    <div className="ltr:ml-4 rtl:mr-4">
                                        <h6 className="font-semibold text-[#515365] group-hover:text-danger dark:text-white-light">{t('view_analytics')}</h6>
                                        <p className="text-xs text-white-dark">{t('detailed_reports')}</p>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Sales & Deals Chart */}
                    <div className="panel">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('sales_deals_chart')}</h5>
                        </div>
                        <div className="mb-5">{isMounted && <ReactApexChart options={salesChart.options} series={salesChart.series} type="area" height={325} />}</div>
                    </div>

                    {/* Revenue Trend Chart */}
                    <div className="panel">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('revenue_trend')}</h5>
                        </div>
                        <div className="mb-5">{isMounted && <ReactApexChart options={revenueChart.options} series={revenueChart.series} type="line" height={300} />}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
