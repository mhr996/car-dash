'use client';
import React from 'react';
import { getTranslation } from '@/i18n';

interface OrderItem {
    name: string;
    quantity: number;
    price: number;
}

interface Order {
    id: number;
    name: string;
    image: string | null;
    buyer: string;
    date: string;
    total: string;
    status: 'completed' | 'processing' | 'cancelled';
    address: string;
    items: OrderItem[];
}

interface OrderReceiptProps {
    order: Order;
}

const OrderReceipt: React.FC<OrderReceiptProps> = ({ order }) => {
    const { t } = getTranslation();

    const calculateSubtotal = () => {
        return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    };

    const calculateTax = () => {
        return calculateSubtotal() * 0.1; // 10% tax
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateTax();
    };

    return (
        <div className="max-w-4xl mx-auto bg-white p-8" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* Header */}
            <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('order_invoice')}</h1>
                <p className="text-xl text-gray-600">#{order.id}</p>
            </div>

            {/* Company and Order Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Company Name</h3>
                    <p className="text-gray-600">123 Business Street</p>
                    <p className="text-gray-600">City, State 12345</p>
                    <p className="text-gray-600">Phone: (555) 123-4567</p>
                    <p className="text-gray-600">Email: info@company.com</p>
                </div>

                <div className="text-right">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('order_details')}</h3>
                    <p className="text-gray-600">
                        <strong>{t('order_date')}:</strong>{' '}
                        {new Date(order.date).toLocaleDateString('en-GB', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                        })}
                    </p>
                    <p className="text-gray-600">
                        <strong>{t('status')}:</strong>
                        <span
                            className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                                order.status === 'completed' ? 'bg-green-100 text-green-800' : order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}
                        >
                            {t(`order_status_${order.status}`)}
                        </span>
                    </p>
                </div>
            </div>

            {/* Customer Information */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('customer_information')}</h3>
                <div className="bg-gray-50 p-4 rounded">
                    <p className="text-gray-700">
                        <strong>{t('name')}:</strong> {order.buyer}
                    </p>
                    <p className="text-gray-700">
                        <strong>{t('address')}:</strong> {order.address}
                    </p>
                </div>
            </div>

            {/* Order Items Table */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('order_items')}</h3>
                <table className="w-full border-collapse border border-gray-300">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-4 py-3 text-left">{t('item_name')}</th>
                            <th className="border border-gray-300 px-4 py-3 text-center">{t('quantity')}</th>
                            <th className="border border-gray-300 px-4 py-3 text-right">{t('unit_price')}</th>
                            <th className="border border-gray-300 px-4 py-3 text-right">{t('total')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-4 py-3">{item.name}</td>
                                <td className="border border-gray-300 px-4 py-3 text-center">{item.quantity}</td>
                                <td className="border border-gray-300 px-4 py-3 text-right">₪{item.price.toFixed(2)}</td>
                                <td className="border border-gray-300 px-4 py-3 text-right font-semibold">₪{(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Order Totals */}
            <div className="flex justify-end mb-8">
                <div className="w-64">
                    <div className="bg-gray-50 p-4 rounded">
                        <div className="flex justify-between mb-2">
                            <span className="text-gray-700">{t('subtotal')}:</span>
                            <span className="font-semibold">₪{calculateSubtotal().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span className="text-gray-700">{t('tax')} (10%):</span>
                            <span className="font-semibold">₪{calculateTax().toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-300 pt-2">
                            <div className="flex justify-between">
                                <span className="text-lg font-bold text-gray-800">{t('total')}:</span>
                                <span className="text-lg font-bold text-green-600">₪{calculateTotal().toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-gray-500 text-sm border-t border-gray-300 pt-4">
                <p>Thank you for your business!</p>
                <p>For questions about this order, please contact us at support@company.com</p>
            </div>
        </div>
    );
};

export default OrderReceipt;
