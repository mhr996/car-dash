// Shared types for the CRM application

export interface DealAttachment {
    type: 'car_license' | 'driver_license' | 'car_transfer_document' | 'document';
    name: string;
    url: string; // Relative path like "/deals/7/car_license.pdf"
    uploadedAt: string;
    size: number;
    mimeType: string;
}

export interface Deal {
    id: string;
    created_at: string;
    deal_type: string;
    title: string;
    description: string;
    amount: number;
    selling_price: number;
    status: string;
    customer_id?: string;
    customer_name?: string;
    car_id?: string;
    seller_id?: string;
    buyer_id?: string;
    car_taken_from_client?: string; // For exchange deals - links to the car received from client

    // Exchange deal specific fields
    customer_car_eval_value?: number;
    additional_customer_amount?: number;
    additional_company_amount?: number;
    loss_amount?: number;

    attachments?: DealAttachment[];
    cancellation_reason?: string;

    // Joined customer data from the customers table
    customers?: {
        name: string;
        id_number?: string;
    };

    // Joined seller data from the customers table (for intermediary deals)
    seller?: {
        name: string;
        id_number?: string;
    };

    // Joined buyer data from the customers table (for intermediary deals)
    buyer?: {
        name: string;
        id_number?: string;
    };

    // Joined bills data from the bills table
    bills?: {
        id: string;
    }[];

    // Legacy individual URL columns (for backwards compatibility)
    car_license_url?: string;
    driver_license_url?: string;
    car_transfer_document_url?: string;
}

export interface Customer {
    id: string;
    name: string;
    phone: string;
    age: number;
    customer_type?: string;
    id_number?: string;
    birth_date?: string;
}

export interface Car {
    id: string;
    title: string;
    year: number;
    brand: string;
    status: string;
    type?: string;
    provider?: string | null;
    kilometers: number;
    market_price: number;
    buy_price: number;
    sale_price: number;
    car_number?: string;
    images: string[] | string;
}

export interface FileItem {
    file: File;
    preview?: string;
    id: string;
}

export interface DealAttachments {
    carLicense: FileItem | null;
    driverLicense: FileItem | null;
    carTransferDocument: FileItem | null;
}

export interface Log {
    id: string;
    created_at: string;
    type:
        | 'car_added'
        | 'car_updated'
        | 'car_deleted'
        | 'car_received_from_client'
        | 'deal_created'
        | 'deal_updated'
        | 'deal_deleted'
        | 'bill_created'
        | 'bill_updated'
        | 'bill_deleted'
        | 'customer_added'
        | 'customer_updated'
        | 'customer_deleted'
        | 'provider_added'
        | 'provider_updated'
        | 'provider_deleted';

    // JSONB data columns storing the actual data at time of log
    deal?: any; // The actual deal data as JSONB
    car?: any; // The actual car data as JSONB
    bill?: any; // The actual bill data as JSONB
}
