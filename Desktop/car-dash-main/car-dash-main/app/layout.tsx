import ProviderComponent from '@/components/layouts/provider-component';
import 'react-perfect-scrollbar/dist/css/styles.css';
import '../styles/tailwind.css';
import '../styles/print.css';
import { Metadata } from 'next';
import { Almarai } from 'next/font/google';

export const metadata: Metadata = {
    title: {
        template: '%s | Car Dash',
        default: 'Car Dash',
    },
};
const almarai = Almarai({
    weight: ['300', '400', '700', '800'],
    subsets: ['arabic'],
    display: 'swap',
    variable: '--font-almarai',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ar" dir="rtl">
            <body className={almarai.variable}>
                <ProviderComponent>{children}</ProviderComponent>
            </body>
        </html>
    );
}
