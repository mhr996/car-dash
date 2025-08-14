'use client';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { IRootState } from '@/store';
import ReactApexChart from 'react-apexcharts';
import supabase from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Dropdown from '@/components/dropdown';
import Link from 'next/link';
import PerfectScrollbar from 'react-perfect-scrollbar';
import AnimateHeight from 'react-animate-height';
import { getTranslation } from '@/i18n';

// Icons
import IconTrendingUp from '@/components/icon/icon-trending-up';
import IconTrendingDown from '@/components/icon/icon-trending-down';
import IconShoppingCart from '@/components/icon/icon-shopping-cart';
import IconStore from '@/components/icon/icon-store';
import IconUsersGroup from '@/components/icon/icon-users-group';
import IconBox from '@/components/icon/icon-box';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconHorizontalDots from '@/components/icon/icon-horizontal-dots';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconClock from '@/components/icon/icon-clock';

// Define interfaces for our data types
interface Shop {
    id: string;
    shop_name: string;
    owner: string;
    created_at: string;
}

// Update the User interface to match the profiles table structure
interface User {
    id: string;
    full_name: string;
    email: string;
    registration_date: string;
    status: string;
    avatar_url: string | null;
    created_at?: string; // For backward compatibility
}

interface Product {
    id: number;
    title: string;
    shop: string;
    price: number;
    created_at: string;
}

interface Order {
    id: number;
    total_amount: number;
    status: string;
    created_at: string;
    user_id: string;
}

interface AnalyticsState {
    shops: Shop[];
    users: User[];
    products: Product[];
    orders: Order[];
    loading: boolean;
    timeframe: string;
    shopGrowth: number;
    userGrowth: number;
    orderGrowth: number;
    productGrowth: number;
    revenue: {
        total: number;
        previousPeriod: number;
        growth: number;
    };
    topShops: {
        name: string;
        orders: number;
        revenue: number;
    }[];
    dailyRevenue: {
        date: string;
        amount: number;
    }[];
    ordersByStatus: {
        status: string;
        count: number;
    }[];
}

const AnalyticsDashboard = () => {
    const router = useRouter();
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';
    const [isMounted, setIsMounted] = useState(false);
    const { t } = getTranslation();

    // State to hold all analytics data
    const [analytics, setAnalytics] = useState<AnalyticsState>({
        shops: [],
        users: [],
        products: [],
        orders: [],
        loading: true,
        timeframe: 'year', // 'week', 'month', 'year'
        shopGrowth: 0,
        userGrowth: 0,
        orderGrowth: 0,
        productGrowth: 0,
        revenue: {
            total: 0,
            previousPeriod: 0,
            growth: 0,
        },
        topShops: [],
        dailyRevenue: [],
        ordersByStatus: [],
    });

    // State for handling animated sections
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    // Set is mounted for client-side rendering of charts
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Function to handle timeframe changes
    const handleTimeframeChange = (timeframe: string) => {
        setAnalytics((prev) => ({
            ...prev,
            timeframe,
            loading: true,
        }));
    };

    // Calculate date ranges based on timeframe
    const getDateRange = () => {
        const now = new Date();
        const endDate = now.toISOString();
        let startDate: string;

        switch (analytics.timeframe) {
            case 'week':
                const weekAgo = new Date(now.setDate(now.getDate() - 7));
                startDate = weekAgo.toISOString();
                break;
            case 'month':
                const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
                startDate = monthAgo.toISOString();
                break;
            case 'year':
                const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
                startDate = yearAgo.toISOString();
                break;
            default:
                const defaultPeriod = new Date(now.setMonth(now.getMonth() - 1));
                startDate = defaultPeriod.toISOString();
        }

        return { startDate, endDate };
    };

    // Format date for display
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Calculate growth percentage
    const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return 100; // If there was nothing before, it's 100% growth
        return ((current - previous) / previous) * 100;
    };

    // Process orders data to get revenue by date
    const processRevenueData = (orders: Order[]) => {
        // Group orders by date and sum amounts
        const revenueByDate = orders.reduce((acc: { [key: string]: number }, order) => {
            const date = order.created_at.split('T')[0];
            if (!acc[date]) {
                acc[date] = 0;
            }
            acc[date] += order.total_amount;
            return acc;
        }, {});

        // Convert to array format needed for chart
        return Object.entries(revenueByDate)
            .map(([date, amount]) => ({
                date: formatDate(date),
                amount,
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    // Process orders by status
    const processOrdersByStatus = (orders: Order[]) => {
        const statusCounts = orders.reduce((acc: { [key: string]: number }, order) => {
            const status = order.status || 'unknown';
            if (!acc[status]) {
                acc[status] = 0;
            }
            acc[status]++;
            return acc;
        }, {});

        return Object.entries(statusCounts).map(([status, count]) => ({
            status,
            count,
        }));
    };

    // Calculate top shops by orders and revenue
    const calculateTopShops = (orders: Order[], shops: Shop[]) => {
        // Group orders by shop
        const ordersByShop: { [key: string]: { orders: number; revenue: number } } = {};

        orders.forEach((order) => {
            const product = analytics.products.find((p) => p.id === order.id);
            if (product) {
                if (!ordersByShop[product.shop]) {
                    ordersByShop[product.shop] = { orders: 0, revenue: 0 };
                }
                ordersByShop[product.shop].orders++;
                ordersByShop[product.shop].revenue += order.total_amount;
            }
        });

        // Convert to array and add shop names
        return Object.entries(ordersByShop)
            .map(([shopId, data]) => {
                const shop = shops.find((s) => s.id === shopId);
                return {
                    name: shop ? shop.shop_name : 'Unknown Shop',
                    orders: data.orders,
                    revenue: data.revenue,
                };
            })
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5); // Get top 5
    };

    // Process user data for display
    const processUserData = (users: User[]) => {
        return users.map((user) => ({
            ...user,
            // Use registration_date for created_at if available, otherwise fallback to created_at
            created_at: user.registration_date || user.created_at,
        }));
    };

    // Fetch data from Supabase based on selected timeframe
    useEffect(() => {
        const fetchData = async () => {
            try {
                setAnalytics((prev) => ({ ...prev, loading: true }));

                const { startDate, endDate } = getDateRange();
                const previousStartDate = new Date(new Date(startDate).getTime() - (new Date(endDate).getTime() - new Date(startDate).getTime())).toISOString();

                // Fetch current period data
                const [{ data: currentShops }, { data: currentUsers }, { data: currentProducts }, { data: currentOrders }] = await Promise.all([
                    supabase.from('shops').select('*').gte('created_at', startDate),
                    supabase.from('users').select('*').gte('registration_date', startDate),
                    supabase.from('products').select('*').gte('created_at', startDate),
                    supabase.from('orders').select('*').gte('created_at', startDate),
                ]);

                // Fetch previous period data for growth calculation
                const [{ data: previousShops }, { data: previousUsers }, { data: previousProducts }, { data: previousOrders }] = await Promise.all([
                    supabase.from('shops').select('*').gte('created_at', previousStartDate).lt('created_at', startDate),
                    supabase.from('users').select('*').gte('registration_date', previousStartDate).lt('registration_date', startDate),
                    supabase.from('products').select('*').gte('created_at', previousStartDate).lt('created_at', startDate),
                    supabase.from('orders').select('*').gte('created_at', previousStartDate).lt('created_at', startDate),
                ]);

                // Process user data for normalized date handling
                const processedCurrentUsers = processUserData(currentUsers || []);
                const processedPreviousUsers = processUserData(previousUsers || []);

                // Calculate revenue totals
                const currentRevenue = currentOrders ? currentOrders.reduce((sum, order) => sum + order.total_amount, 0) : 0;
                const previousRevenue = previousOrders ? previousOrders.reduce((sum, order) => sum + order.total_amount, 0) : 0;

                // Fetch all shops for reference (needed for shop names)
                const { data: allShops } = await supabase.from('shops').select('*');

                // Fetch all products for reference
                const { data: allProducts } = await supabase.from('products').select('*');

                // Update state with all the calculated data
                setAnalytics((prev) => ({
                    ...prev,
                    shops: currentShops || [],
                    users: processedCurrentUsers, // Use filtered users for the selected timeframe
                    products: currentProducts || [],
                    orders: currentOrders || [],
                    loading: false,
                    shopGrowth: calculateGrowth(currentShops ? currentShops.length : 0, previousShops ? previousShops.length : 0),
                    userGrowth: calculateGrowth(processedCurrentUsers.length, processedPreviousUsers.length),
                    productGrowth: calculateGrowth(currentProducts ? currentProducts.length : 0, previousProducts ? previousProducts.length : 0),
                    orderGrowth: calculateGrowth(currentOrders ? currentOrders.length : 0, previousOrders ? previousOrders.length : 0),
                    revenue: {
                        total: currentRevenue,
                        previousPeriod: previousRevenue,
                        growth: calculateGrowth(currentRevenue, previousRevenue),
                    },
                    dailyRevenue: processRevenueData(currentOrders || []),
                    ordersByStatus: processOrdersByStatus(currentOrders || []),
                    topShops: calculateTopShops(currentOrders || [], allShops || []),
                }));
            } catch (error) {
                console.error('Error fetching analytics data:', error);
                setAnalytics((prev) => ({ ...prev, loading: false }));
            }
        };

        fetchData();
    }, [analytics.timeframe]);

    // Chart configurations
    const revenueChartData: any = {
        series: [
            {
                name: 'Revenue',
                data: analytics.dailyRevenue.map((item) => item.amount),
            },
        ],
        options: {
            chart: {
                height: 300,
                type: 'area',
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
                curve: 'smooth',
                width: 2,
            },
            colors: ['#4361ee'],
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.3,
                },
            },
            grid: {
                borderColor: isDark ? '#191e3a' : '#e0e6ed',
                strokeDashArray: 5,
                xaxis: {
                    lines: {
                        show: true,
                    },
                },
                yaxis: {
                    lines: {
                        show: true,
                    },
                },
                padding: {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                },
            },
            xaxis: {
                categories: analytics.dailyRevenue.map((item) => item.date),
                axisBorder: {
                    show: false,
                },
            },
            yaxis: {
                opposite: isRtl ? true : false,
                labels: {
                    offsetX: isRtl ? -10 : 0,
                    formatter: (value: number) => {
                        return '$' + value.toFixed(0);
                    },
                },
            },
            tooltip: {
                x: {
                    format: 'dd/MM/yy',
                },
            },
            legend: {
                horizontalAlign: 'center',
                offsetY: 10,
            },
        },
    };

    const orderStatusChartData: any = {
        series: analytics.ordersByStatus.map((item) => item.count),
        options: {
            chart: {
                type: 'donut',
                height: 460,
            },
            colors: ['#4361ee', '#805dca', '#00ab55', '#e7515a', '#e2a03f'],
            labels: analytics.ordersByStatus.map((item) => item.status),
            responsive: [
                {
                    breakpoint: 480,
                    options: {
                        chart: {
                            width: 200,
                        },
                        legend: {
                            position: 'bottom',
                        },
                    },
                },
            ],
            stroke: {
                show: false,
            },
            legend: {
                position: 'bottom',
                horizontalAlign: 'center',
                fontSize: '14px',
                markers: {
                    width: 10,
                    height: 10,
                },
                itemMargin: {
                    horizontal: 8,
                    vertical: 8,
                },
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '65%',
                        background: 'transparent',
                        labels: {
                            show: true,
                            name: {
                                show: true,
                                fontSize: '16px',
                                offsetY: -10,
                            },
                            value: {
                                show: true,
                                fontSize: '20px',
                                color: isDark ? '#bfc9d4' : undefined,
                                offsetY: 16,
                            },
                            total: {
                                show: true,
                                label: 'Total',
                                fontSize: '16px',
                                color: isDark ? '#bfc9d4' : undefined,
                                formatter: function (w: any) {
                                    return w.globals.seriesTotals.reduce((a: number, b: number) => {
                                        return a + b;
                                    }, 0);
                                },
                            },
                        },
                    },
                },
            },
        },
    };

    const shopProductComparisonData: any = {
        series: [
            {
                name: 'Shops',
                data: [
                    analytics.shops.filter((s) => new Date(s.created_at).getMonth() === 0).length,
                    analytics.shops.filter((s) => new Date(s.created_at).getMonth() === 1).length,
                    analytics.shops.filter((s) => new Date(s.created_at).getMonth() === 2).length,
                    analytics.shops.filter((s) => new Date(s.created_at).getMonth() === 3).length,
                    analytics.shops.filter((s) => new Date(s.created_at).getMonth() === 4).length,
                    analytics.shops.filter((s) => new Date(s.created_at).getMonth() === 5).length,
                    analytics.shops.filter((s) => new Date(s.created_at).getMonth() === 6).length,
                    analytics.shops.filter((s) => new Date(s.created_at).getMonth() === 7).length,
                    analytics.shops.filter((s) => new Date(s.created_at).getMonth() === 8).length,
                    analytics.shops.filter((s) => new Date(s.created_at).getMonth() === 9).length,
                    analytics.shops.filter((s) => new Date(s.created_at).getMonth() === 10).length,
                    analytics.shops.filter((s) => new Date(s.created_at).getMonth() === 11).length,
                ],
            },
            {
                name: 'Products',
                data: [
                    analytics.products.filter((p) => new Date(p.created_at).getMonth() === 0).length,
                    analytics.products.filter((p) => new Date(p.created_at).getMonth() === 1).length,
                    analytics.products.filter((p) => new Date(p.created_at).getMonth() === 2).length,
                    analytics.products.filter((p) => new Date(p.created_at).getMonth() === 3).length,
                    analytics.products.filter((p) => new Date(p.created_at).getMonth() === 4).length,
                    analytics.products.filter((p) => new Date(p.created_at).getMonth() === 5).length,
                    analytics.products.filter((p) => new Date(p.created_at).getMonth() === 6).length,
                    analytics.products.filter((p) => new Date(p.created_at).getMonth() === 7).length,
                    analytics.products.filter((p) => new Date(p.created_at).getMonth() === 8).length,
                    analytics.products.filter((p) => new Date(p.created_at).getMonth() === 9).length,
                    analytics.products.filter((p) => new Date(p.created_at).getMonth() === 10).length,
                    analytics.products.filter((p) => new Date(p.created_at).getMonth() === 11).length,
                ],
            },
        ],
        options: {
            chart: {
                height: 360,
                type: 'bar',
                fontFamily: 'Nunito, sans-serif',
                toolbar: {
                    show: false,
                },
            },
            dataLabels: {
                enabled: false,
            },
            stroke: {
                width: 2,
                colors: ['transparent'],
            },
            colors: ['#5c1ac3', '#00ab55'],
            dropShadow: {
                enabled: true,
                blur: 3,
                color: '#515365',
                opacity: 0.4,
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '55%',
                    borderRadius: 8,
                    borderRadiusApplication: 'end',
                },
            },
            legend: {
                position: 'bottom',
                horizontalAlign: 'center',
                fontSize: '14px',
                itemMargin: {
                    horizontal: 8,
                    vertical: 8,
                },
            },
            grid: {
                borderColor: isDark ? '#191e3a' : '#e0e6ed',
                padding: {
                    left: 20,
                    right: 20,
                },
            },
            xaxis: {
                categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                axisBorder: {
                    show: true,
                    color: isDark ? '#3b3f5c' : '#e0e6ed',
                },
            },
            yaxis: {
                opposite: isRtl ? true : false,
                labels: {
                    offsetX: isRtl ? -10 : 0,
                },
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shade: isDark ? 'dark' : 'light',
                    type: 'vertical',
                    shadeIntensity: 0.3,
                    inverseColors: false,
                    opacityFrom: 1,
                    opacityTo: 0.8,
                    stops: [0, 100],
                },
            },
            tooltip: {
                marker: {
                    show: true,
                },
            },
        },
    };

    // Time trends data (users vs orders)
    const timeTrendsData: any = {
        series: [
            {
                name: 'Users',
                data: [
                    analytics.users.filter((u) => u.created_at && new Date(u.created_at).getMonth() === 0).length,
                    analytics.users.filter((u) => u.created_at && new Date(u.created_at).getMonth() === 1).length,
                    analytics.users.filter((u) => u.created_at && new Date(u.created_at).getMonth() === 2).length,
                    analytics.users.filter((u) => u.created_at && new Date(u.created_at).getMonth() === 3).length,
                    analytics.users.filter((u) => u.created_at && new Date(u.created_at).getMonth() === 4).length,
                    analytics.users.filter((u) => u.created_at && new Date(u.created_at).getMonth() === 5).length,
                    analytics.users.filter((u) => u.created_at && new Date(u.created_at).getMonth() === 6).length,
                    analytics.users.filter((u) => u.created_at && new Date(u.created_at).getMonth() === 7).length,
                    analytics.users.filter((u) => u.created_at && new Date(u.created_at).getMonth() === 8).length,
                    analytics.users.filter((u) => u.created_at && new Date(u.created_at).getMonth() === 9).length,
                    analytics.users.filter((u) => u.created_at && new Date(u.created_at).getMonth() === 10).length,
                    analytics.users.filter((u) => u.created_at && new Date(u.created_at).getMonth() === 11).length,
                ],
            },
            {
                name: 'Orders',
                data: [
                    analytics.orders.filter((o) => new Date(o.created_at).getMonth() === 0).length,
                    analytics.orders.filter((o) => new Date(o.created_at).getMonth() === 1).length,
                    analytics.orders.filter((o) => new Date(o.created_at).getMonth() === 2).length,
                    analytics.orders.filter((o) => new Date(o.created_at).getMonth() === 3).length,
                    analytics.orders.filter((o) => new Date(o.created_at).getMonth() === 4).length,
                    analytics.orders.filter((o) => new Date(o.created_at).getMonth() === 5).length,
                    analytics.orders.filter((o) => new Date(o.created_at).getMonth() === 6).length,
                    analytics.orders.filter((o) => new Date(o.created_at).getMonth() === 7).length,
                    analytics.orders.filter((o) => new Date(o.created_at).getMonth() === 8).length,
                    analytics.orders.filter((o) => new Date(o.created_at).getMonth() === 9).length,
                    analytics.orders.filter((o) => new Date(o.created_at).getMonth() === 10).length,
                    analytics.orders.filter((o) => new Date(o.created_at).getMonth() === 11).length,
                ],
            },
        ],
        options: {
            chart: {
                height: 300,
                type: 'line',
                fontFamily: 'Nunito, sans-serif',
                toolbar: {
                    show: false,
                },
            },
            colors: ['#00ab55', '#e7515a'],
            dataLabels: {
                enabled: false,
            },
            stroke: {
                width: 3,
                curve: 'smooth',
            },
            grid: {
                borderColor: isDark ? '#191e3a' : '#e0e6ed',
                strokeDashArray: 5,
                xaxis: {
                    lines: {
                        show: true,
                    },
                },
                yaxis: {
                    lines: {
                        show: true,
                    },
                },
                padding: {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                },
            },
            markers: {
                size: 4,
                colors: '#ffffff',
                strokeColors: ['#00ab55', '#e7515a'],
                strokeWidth: 3,
                hover: {
                    size: 7,
                },
            },
            xaxis: {
                categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                axisBorder: {
                    show: false,
                },
            },
            yaxis: {
                opposite: isRtl ? true : false,
                labels: {
                    offsetX: isRtl ? -10 : 0,
                },
            },
            legend: {
                position: 'bottom',
                horizontalAlign: 'center',
                fontSize: '14px',
                markers: {
                    width: 10,
                    height: 10,
                },
                itemMargin: {
                    horizontal: 8,
                    vertical: 8,
                },
            },
        },
    };

    // Stats cards small line charts
    const shopTrendData: any = {
        series: [
            {
                data: analytics.shops.slice(-10).map((_, index) => index + 1),
            },
        ],
        options: {
            chart: {
                height: 50,
                type: 'line',
                sparkline: {
                    enabled: true,
                },
            },
            stroke: {
                curve: 'smooth',
                width: 2,
            },
            colors: ['#00ab55'],
            tooltip: {
                x: {
                    show: false,
                },
                y: {
                    title: {
                        formatter: () => {
                            return '';
                        },
                    },
                },
            },
        },
    };

    const userTrendData: any = {
        series: [
            {
                data: analytics.users.slice(-10).map((_, index) => index + Math.floor(Math.random() * 3)),
            },
        ],
        options: {
            chart: {
                height: 50,
                type: 'line',
                sparkline: {
                    enabled: true,
                },
            },
            stroke: {
                curve: 'smooth',
                width: 2,
            },
            colors: ['#4361ee'],
            tooltip: {
                x: {
                    show: false,
                },
                y: {
                    title: {
                        formatter: () => {
                            return '';
                        },
                    },
                },
            },
        },
    };

    const productTrendData: any = {
        series: [
            {
                data: analytics.products.slice(-10).map((_, index) => index + Math.floor(Math.random() * 5)),
            },
        ],
        options: {
            chart: {
                height: 50,
                type: 'line',
                sparkline: {
                    enabled: true,
                },
            },
            stroke: {
                curve: 'smooth',
                width: 2,
            },
            colors: ['#805dca'],
            tooltip: {
                x: {
                    show: false,
                },
                y: {
                    title: {
                        formatter: () => {
                            return '';
                        },
                    },
                },
            },
        },
    };

    const orderTrendData: any = {
        series: [
            {
                data: analytics.orders.slice(-10).map((_, index) => index + Math.floor(Math.random() * 4)),
            },
        ],
        options: {
            chart: {
                height: 50,
                type: 'line',
                sparkline: {
                    enabled: true,
                },
            },
            stroke: {
                curve: 'smooth',
                width: 2,
            },
            colors: ['#e7515a'],
            tooltip: {
                x: {
                    show: false,
                },
                y: {
                    title: {
                        formatter: () => {
                            return '';
                        },
                    },
                },
            },
        },
    };

    // Animation for top shops
    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <div className="max-w-[1800px]">
            {/* Breadcrumbs */}
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="/" className="text-primary hover:underline">
                        {t('home')}
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{t('analytics')}</span>
                </li>
            </ul>

            <div className="pt-5">
                {/* Timeframe Selection */}
                <div className="mb-6 flex justify-end">
                    <div className="inline-flex rounded-md shadow-sm">
                        <button
                            type="button"
                            className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                                analytics.timeframe === 'week' ? 'bg-primary text-white' : 'bg-white dark:bg-black text-gray-700 dark:text-gray-300'
                            } border border-gray-200 dark:border-gray-800`}
                            onClick={() => handleTimeframeChange('week')}
                        >
                            {t('this_week')}
                        </button>
                        <button
                            type="button"
                            className={`px-4 py-2 text-sm font-medium ${
                                analytics.timeframe === 'month' ? 'bg-primary text-white' : 'bg-white dark:bg-black text-gray-700 dark:text-gray-300'
                            } border-t border-b border-gray-200 dark:border-gray-800`}
                            onClick={() => handleTimeframeChange('month')}
                        >
                            {t('this_month')}
                        </button>
                        <button
                            type="button"
                            className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                                analytics.timeframe === 'year' ? 'bg-primary text-white' : 'bg-white dark:bg-black text-gray-700 dark:text-gray-300'
                            } border border-gray-200 dark:border-gray-800`}
                            onClick={() => handleTimeframeChange('year')}
                        >
                            {t('this_year')}
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="mb-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    {/* Shops */}
                    <div className="panel h-full">
                        <div className="mb-5 flex items-center">
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-success/10 text-success dark:bg-success dark:text-white-light">
                                <IconStore className="h-7 w-7" />
                            </div>
                            <div className="ml-4">
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('shops')}</h5>
                                <div className="text-[13px] font-normal text-white-dark">
                                    {t('total')} {t('shops')}
                                </div>
                            </div>
                            <div className={`badge ml-auto ${analytics.shopGrowth >= 0 ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                {analytics.shopGrowth >= 0 ? '+' : ''}
                                {analytics.shopGrowth.toFixed(1)}%
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="text-3xl font-bold dark:text-white-light">{analytics.shops.length}</div>
                            {isMounted && <ReactApexChart series={shopTrendData.series} options={shopTrendData.options} type="line" height={50} width={100} />}
                        </div>
                    </div>

                    {/* Users */}
                    <div className="panel h-full">
                        <div className="mb-5 flex items-center">
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary dark:text-white-light">
                                <IconUsersGroup className="h-7 w-7" />
                            </div>
                            <div className="ml-4">
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('users')}</h5>
                                <div className="text-[13px] font-normal text-white-dark">
                                    {t('total')} {t('users')}
                                </div>
                            </div>
                            <div className={`badge ml-auto ${analytics.userGrowth >= 0 ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                {analytics.userGrowth >= 0 ? '+' : ''}
                                {analytics.userGrowth.toFixed(1)}%
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="text-3xl font-bold dark:text-white-light">{analytics.users.length}</div>
                            {isMounted && <ReactApexChart series={userTrendData.series} options={userTrendData.options} type="line" height={50} width={100} />}
                        </div>
                    </div>

                    {/* Products */}
                    <div className="panel h-full">
                        <div className="mb-5 flex items-center">
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 dark:bg-violet-500 dark:text-white-light">
                                <IconBox className="h-7 w-7" />
                            </div>
                            <div className="ml-4">
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('products')}</h5>
                                <div className="text-[13px] font-normal text-white-dark">
                                    {t('total')} {t('products')}
                                </div>
                            </div>
                            <div className={`badge ml-auto ${analytics.productGrowth >= 0 ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                {analytics.productGrowth >= 0 ? '+' : ''}
                                {analytics.productGrowth.toFixed(1)}%
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="text-3xl font-bold dark:text-white-light">{analytics.products.length}</div>
                            {isMounted && <ReactApexChart series={productTrendData.series} options={productTrendData.options} type="line" height={50} width={100} />}
                        </div>
                    </div>

                    {/* Orders */}
                    <div className="panel h-full">
                        <div className="mb-5 flex items-center">
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-danger/10 text-danger dark:bg-danger dark:text-white-light">
                                <IconShoppingCart className="h-7 w-7" />
                            </div>
                            <div className="ml-4">
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('orders')}</h5>
                                <div className="text-[13px] font-normal text-white-dark">
                                    {t('total')} {t('orders')}
                                </div>
                            </div>
                            <div className={`badge ml-auto ${analytics.orderGrowth >= 0 ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                {analytics.orderGrowth >= 0 ? '+' : ''}
                                {analytics.orderGrowth.toFixed(1)}%
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="text-3xl font-bold dark:text-white-light">{analytics.orders.length}</div>
                            {isMounted && <ReactApexChart series={orderTrendData.series} options={orderTrendData.options} type="line" height={50} width={100} />}
                        </div>
                    </div>
                </div>

                {/* Revenue & Order Status */}
                <div className="mb-6 grid gap-6 xl:grid-cols-3">
                    {/* Revenue Overview */}
                    <div className="panel h-full xl:col-span-2">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">
                                {t('revenue')} {t('sales_overview')}
                            </h5>
                            <div className="dropdown">
                                <Dropdown
                                    offset={[0, 5]}
                                    placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                    btnClassName="hover:text-primary"
                                    button={<IconHorizontalDots className="text-black/70 hover:!text-primary dark:text-white/70" />}
                                >
                                    <ul>
                                        <li>
                                            <button type="button" onClick={() => handleTimeframeChange('week')}>
                                                {t('this_week')}
                                            </button>
                                        </li>
                                        <li>
                                            <button type="button" onClick={() => handleTimeframeChange('month')}>
                                                {t('this_month')}
                                            </button>
                                        </li>
                                        <li>
                                            <button type="button" onClick={() => handleTimeframeChange('year')}>
                                                {t('this_year')}
                                            </button>
                                        </li>
                                    </ul>
                                </Dropdown>
                            </div>
                        </div>

                        <div className="mb-5 flex flex-col sm:flex-row">
                            <div className="mb-5 sm:mb-0 sm:w-1/3">
                                <div className="mb-2 text-lg font-semibold dark:text-white-light">{t('total_revenue')}</div>
                                <div className="text-3xl font-bold text-[#009688]">₪{analytics.revenue.total.toFixed(2)}</div>
                                <div className={`mt-2 inline-flex items-center ${analytics.revenue.growth >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {analytics.revenue.growth >= 0 ? <IconTrendingUp className="h-4 w-4 stroke-current mr-1" /> : <IconTrendingDown className="h-4 w-4 stroke-current mr-1" />}
                                    <span>{Math.abs(analytics.revenue.growth).toFixed(1)}%</span>
                                    <span className="ml-1 text-white-dark text-xs">
                                        {t('vs_previous')} {analytics.timeframe}
                                    </span>
                                </div>
                            </div>
                            <div className="sm:w-2/3">
                                {isMounted && analytics.dailyRevenue.length > 0 ? (
                                    <ReactApexChart options={revenueChartData.options} series={revenueChartData.series} type="area" height={300} />
                                ) : (
                                    <div className="flex h-72 items-center justify-center">
                                        <div className="text-lg text-gray-500">{t('no_revenue_data')}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Order Status */}
                    <div className="panel h-full">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('order_status')}</h5>
                            <div className="dropdown">
                                <Dropdown
                                    offset={[0, 5]}
                                    placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                    btnClassName="hover:text-primary"
                                    button={<IconHorizontalDots className="text-black/70 hover:!text-primary dark:text-white/70" />}
                                >
                                    <ul>
                                        <li>
                                            <button type="button" onClick={() => handleTimeframeChange('week')}>
                                                {t('this_week')}
                                            </button>
                                        </li>
                                        <li>
                                            <button type="button" onClick={() => handleTimeframeChange('month')}>
                                                {t('this_month')}
                                            </button>
                                        </li>
                                        <li>
                                            <button type="button" onClick={() => handleTimeframeChange('year')}>
                                                {t('this_year')}
                                            </button>
                                        </li>
                                    </ul>
                                </Dropdown>
                            </div>
                        </div>

                        <div>
                            {isMounted && analytics.ordersByStatus.length > 0 ? (
                                <ReactApexChart options={orderStatusChartData.options} series={orderStatusChartData.series} type="donut" height={300} />
                            ) : (
                                <div className="flex h-72 items-center justify-center">
                                    <div className="text-lg text-gray-500">{t('no_order_status_data')}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Top Shops & Growth Trends */}
                <div className="mb-6 grid gap-6 xl:grid-cols-3">
                    {/* Top Shops */}
                    <div className="panel h-full">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('top_performing_shops')}</h5>
                            <button type="button" className="hover:text-primary" onClick={() => toggleSection('topShops')}>
                                <IconCaretDown className={`h-4 w-4 transition-transform duration-300 ${expandedSection === 'topShops' ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        <AnimateHeight duration={300} height={expandedSection === 'topShops' ? 'auto' : 300}>
                            <div className="mb-5">
                                <div className="space-y-4">
                                    {analytics.topShops.length > 0 ? (
                                        analytics.topShops.map((shop, index) => (
                                            <div key={index} className="flex items-start">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-light text-primary dark:bg-primary dark:text-white-light">
                                                    {index + 1}
                                                </div>
                                                <div className="px-4 w-full">
                                                    <h6 className="font-semibold dark:text-white-light">{shop.name}</h6>
                                                    <p className="text-xs text-white-dark">
                                                        {shop.orders} orders • ${shop.revenue.toFixed(2)} revenue
                                                    </p>
                                                    <div className="mt-2 h-1.5 rounded-full bg-dark-light/30 dark:bg-dark-light/10">
                                                        <div
                                                            className="h-1.5 rounded-full bg-primary"
                                                            style={{
                                                                width: Math.min(100, (shop.revenue / (analytics.topShops[0]?.revenue || 1)) * 100) + '%',
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex h-32 items-center justify-center">
                                            <div className="text-lg text-gray-500">{t('no_shop_data')}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </AnimateHeight>
                    </div>

                    {/* Growth Trends & Charts */}
                    <div className="panel h-full xl:col-span-2">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('growth_trends')}</h5>
                            <div className="dropdown">
                                <Dropdown
                                    offset={[0, 5]}
                                    placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                    btnClassName="hover:text-primary"
                                    button={<IconHorizontalDots className="text-black/70 hover:!text-primary dark:text-white/70" />}
                                >
                                    <ul>
                                        <li>
                                            <button type="button" onClick={() => toggleSection('userOrderTrend')}>
                                                {t('user_vs_order_trend')}
                                            </button>
                                        </li>
                                        <li>
                                            <button type="button" onClick={() => toggleSection('shopProductTrend')}>
                                                {t('shop_vs_product_trend')}
                                            </button>
                                        </li>
                                    </ul>
                                </Dropdown>
                            </div>
                        </div>

                        <AnimateHeight duration={300} height={expandedSection !== 'shopProductTrend' ? 'auto' : 0}>
                            <div className="mb-5">
                                <h6 className="mb-3 text-base font-medium dark:text-white-light">{t('user_vs_order_trends')}</h6>
                                {isMounted && <ReactApexChart options={timeTrendsData.options} series={timeTrendsData.series} type="line" height={300} />}
                            </div>
                        </AnimateHeight>

                        <AnimateHeight duration={300} height={expandedSection !== 'userOrderTrend' ? 'auto' : 0}>
                            <div className="mb-5">
                                <h6 className="mb-3 text-base font-medium dark:text-white-light">{t('shop_vs_product_distribution')}</h6>
                                {isMounted && <ReactApexChart options={shopProductComparisonData.options} series={shopProductComparisonData.series} type="bar" height={300} />}
                            </div>
                        </AnimateHeight>
                    </div>
                </div>

                {/* Recent Activity & Sales Report */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Recent Activity */}
                    <div className="panel h-full">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('recent_activity')}</h5>
                        </div>

                        <PerfectScrollbar className="perfect-scrollbar relative h-[360px] ltr:-mr-3 ltr:pr-3 rtl:-ml-3 rtl:pl-3">
                            <div className="space-y-7">
                                {analytics.loading ? (
                                    <div className="flex h-32 items-center justify-center">
                                        <div className="text-lg text-gray-500">{t('loading_activity_data')}...</div>
                                    </div>
                                ) : analytics.orders.length > 0 || analytics.users.length > 0 ? (
                                    <>
                                        {/* Show most recent orders and user registrations */}
                                        {[...analytics.orders]
                                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                            .slice(0, 3)
                                            .map((order, index) => (
                                                <div className="flex" key={`order-${order.id}`}>
                                                    <div className="relative z-10 shrink-0 before:absolute before:left-4 before:top-10 before:h-[calc(100%-24px)] before:w-[2px] before:bg-white-dark/30 ltr:mr-2 rtl:ml-2">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-white shadow shadow-success">
                                                            <IconShoppingCart className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h5 className="font-semibold dark:text-white-light">
                                                            {t('new_order_placed')}: <span className="text-success">${order.total_amount.toFixed(2)}</span>
                                                        </h5>
                                                        <p className="text-xs text-white-dark">
                                                            {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}

                                        {[...analytics.users]
                                            .filter((user) => user.created_at) // Filter out any users without created_at
                                            .sort((a, b) => {
                                                // Safely handle created_at with type guard
                                                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                                                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                                                return dateB - dateA;
                                            })
                                            .slice(0, 3)
                                            .map((user, index) => (
                                                <div className="flex" key={`user-${user.id}`}>
                                                    <div className="relative z-10 shrink-0 before:absolute before:left-4 before:top-10 before:h-[calc(100%-24px)] before:w-[2px] before:bg-white-dark/30 ltr:mr-2 rtl:ml-2">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow shadow-primary">
                                                            <IconUsersGroup className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h5 className="font-semibold dark:text-white-light">
                                                            {t('new_user_registered')}: <span className="text-primary">{user.email}</span>
                                                        </h5>
                                                        <p className="text-xs text-white-dark">
                                                            {user.created_at && new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}

                                        {[...analytics.products]
                                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                            .slice(0, 2)
                                            .map((product, index) => (
                                                <div className="flex" key={`product-${product.id}`}>
                                                    <div
                                                        className={
                                                            index === analytics.products.length - 1
                                                                ? 'shrink-0 ltr:mr-2 rtl:ml-2'
                                                                : 'relative z-10 shrink-0 before:absolute before:left-4 before:top-10 before:h-[calc(100%-24px)] before:w-[2px] before:bg-white-dark/30 ltr:mr-2 rtl:ml-2'
                                                        }
                                                    >
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning text-white shadow shadow-warning">
                                                            <IconBox className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h5 className="font-semibold dark:text-white-light">
                                                            {t('new_product_added')}: <span className="text-warning">{product.title}</span>
                                                        </h5>
                                                        <p className="text-xs text-white-dark">
                                                            {new Date(product.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                    </>
                                ) : (
                                    <div className="flex h-32 items-center justify-center">
                                        <div className="text-lg text-gray-500">{t('no_recent_activity')}</div>
                                    </div>
                                )}
                            </div>
                        </PerfectScrollbar>
                    </div>

                    {/* Sales Report */}
                    <div className="panel h-full">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('revenue_by_period')}</h5>
                        </div>

                        <div className="mb-10">
                            <div className="grid grid-cols-3 gap-6 text-center">
                                <div>
                                    <div className="text-xl font-bold dark:text-white-light">${analytics.revenue.total.toFixed(2)}</div>
                                    <div className="text-white-dark">
                                        {t('this_period')} {t('revenue')}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xl font-bold dark:text-white-light">${analytics.revenue.previousPeriod.toFixed(2)}</div>
                                    <div className="text-white-dark">{t('previous_period')}</div>
                                </div>
                                <div>
                                    <div className={`text-xl font-bold ${analytics.revenue.growth >= 0 ? 'text-success' : 'text-danger'}`}>
                                        {analytics.revenue.growth >= 0 ? '+' : ''}
                                        {analytics.revenue.growth.toFixed(2)}%
                                    </div>
                                    <div className="text-white-dark">{t('growth')}</div>
                                </div>
                            </div>
                        </div>

                        <div className="relative overflow-hidden">
                            <div className={`flex items-center justify-between border-b border-white-light py-2 dark:border-[#1b2e4b] ${analytics.timeframe === 'week' ? 'text-primary' : ''}`}>
                                <div className="flex items-center">
                                    <div className={`h-2 w-2 rounded-full ${analytics.timeframe === 'week' ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'} mr-2`}></div>
                                    <div className={`text-sm font-medium ${analytics.timeframe === 'week' ? 'text-primary' : 'text-gray-600 dark:text-gray-400'}`}>{t('this_week')}</div>
                                </div>
                                <div className="font-semibold">${analytics.timeframe === 'week' ? analytics.revenue.total.toFixed(2) : '0.00'}</div>
                            </div>

                            <div className={`flex items-center justify-between border-b border-white-light py-2 dark:border-[#1b2e4b] ${analytics.timeframe === 'month' ? 'text-primary' : ''}`}>
                                <div className="flex items-center">
                                    <div className={`h-2 w-2 rounded-full ${analytics.timeframe === 'month' ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'} mr-2`}></div>
                                    <div className={`text-sm font-medium ${analytics.timeframe === 'month' ? 'text-primary' : 'text-gray-600 dark:text-gray-400'}`}>{t('this_month')}</div>
                                </div>
                                <div className="font-semibold">${analytics.timeframe === 'month' ? analytics.revenue.total.toFixed(2) : '0.00'}</div>
                            </div>

                            <div className={`flex items-center justify-between border-b border-white-light py-2 dark:border-[#1b2e4b] ${analytics.timeframe === 'year' ? 'text-primary' : ''}`}>
                                <div className="flex items-center">
                                    <div className={`h-2 w-2 rounded-full ${analytics.timeframe === 'year' ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'} mr-2`}></div>
                                    <div className={`text-sm font-medium ${analytics.timeframe === 'year' ? 'text-primary' : 'text-gray-600 dark:text-gray-400'}`}>{t('this_year')}</div>
                                </div>
                                <div className="font-semibold">${analytics.timeframe === 'year' ? analytics.revenue.total.toFixed(2) : '0.00'}</div>
                            </div>
                        </div>

                        <div className="mt-8 flex items-center justify-center">
                            <button type="button" className="btn btn-primary btn-lg" onClick={() => router.push('/orders')}>
                                <IconCreditCard className="h-5 w-5 ltr:mr-2 rtl:ml-2" />
                                {t('view_order_details')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
