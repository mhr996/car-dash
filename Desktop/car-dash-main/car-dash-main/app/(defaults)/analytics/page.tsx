import AnalyticsDashboard from '@/components/analytics/analytics-dashboard';
import { Metadata } from 'next';
import { getTranslation } from '@/i18n';

export const metadata: Metadata = {
    title: 'Analytics Dashboard',
};

const AnalyticsPage = () => {
    return <AnalyticsDashboard />;
};

export default AnalyticsPage;
