export interface MessageTemplate {
    id: string;
    label: string;
    content: string;
}

export const DEFAULT_TEMPLATE_KEYS: { id: string; labelKey: string; contentKey: string }[] = [
    { id: 'template_car_purchase', labelKey: 'template_car_purchase', contentKey: 'template_car_purchase_content' },
    { id: 'template_maintenance_reminder', labelKey: 'template_maintenance_reminder', contentKey: 'template_maintenance_reminder_content' },
    { id: 'template_car_delivery_confirm', labelKey: 'template_car_delivery_confirm', contentKey: 'template_car_delivery_confirm_content' },
    { id: 'template_delivery_appointment_reminder', labelKey: 'template_delivery_appointment_reminder', contentKey: 'template_delivery_appointment_reminder_content' },
    { id: 'template_customer_welcome', labelKey: 'template_customer_welcome', contentKey: 'template_customer_welcome_content' },
    { id: 'template_payment_reminder', labelKey: 'template_payment_reminder', contentKey: 'template_payment_reminder_content' },
    { id: 'template_car_received_maintenance', labelKey: 'template_car_received_maintenance', contentKey: 'template_car_received_maintenance_content' },
    { id: 'template_car_ready_notification', labelKey: 'template_car_ready_notification', contentKey: 'template_car_ready_notification_content' },
    { id: 'collection', labelKey: 'collection', contentKey: 'collection_content' },
    { id: 'promotion', labelKey: 'promotion', contentKey: 'promotion_content' },
    { id: 'holiday_greetings', labelKey: 'holiday_greetings', contentKey: 'holiday_greetings_content' },
];
