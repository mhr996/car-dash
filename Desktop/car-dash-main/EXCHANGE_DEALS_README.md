# Exchange Deal Implementation

## Overview

This document describes the implementation of the exchange deal functionality where a client trades in their old car for a new one.

## Changes Made

### 1. Database Schema

- Added `car_taken_from_client` column to the `deals` table
- This column is a foreign key reference to the `cars` table
- Applied migration: `migrations/add_car_taken_from_client_column.sql`

### 2. Deal Creation Process (Exchange Deals)

When creating an exchange deal:

1. **Old Car Record Creation**: A new car record is automatically created for the car received from the client with:

    - `title`: Combination of manufacturer, name, and year
    - `status`: Set to `'received_from_client'`
    - `type`: Set to `'used'`
    - `provider`: Set to the customer's name or 'Client'
    - `buy_price`: Set to the purchase price from customer
    - All other car details from the exchange form

2. **Deal Record Creation**: The deal is created with:
    - `car_id`: References the new car being sold to client
    - `car_taken_from_client`: References the car received from client
    - All exchange-specific fields are preserved for backwards compatibility

### 3. UI Updates

#### Add Deal Page (`/deals/add`)

- Modified the exchange deal submission logic
- Now creates a car record for the old car before creating the deal
- Links both cars properly in the deal record

#### Preview Deal Page (`/deals/preview/[id]`)

- Added "Car Taken From Client" section for exchange deals
- Shows details of the car received from the client
- Uses orange color scheme to differentiate from the main car
- Displays car image, details, and pricing information

#### Edit Deal Page (`/deals/edit/[id]`)

- Added "Car Taken From Client" information display
- Shows car details in a read-only format for existing exchange deals
- Added proper state management and data fetching

### 4. Type Updates

- Updated `Deal` interface to include `car_taken_from_client?: string`
- Updated local `Car` interfaces to include `car_number?: string`

## Database Migration

Run the following migration to add the new column:

```sql
-- Add car_taken_from_client column to deals table for exchange deals
ALTER TABLE deals
ADD COLUMN car_taken_from_client UUID REFERENCES cars(id);

-- Add index for better performance
CREATE INDEX idx_deals_car_taken_from_client ON deals(car_taken_from_client);

-- Add comment
COMMENT ON COLUMN deals.car_taken_from_client IS 'Foreign key to cars table - stores the car received from client in exchange deals';
```

## Usage

1. When creating an exchange deal, fill out the old car information in the exchange form
2. The system will automatically create a new car record for the old car
3. The deal will reference both the new car (being sold) and old car (being received)
4. In preview/edit pages, both cars will be displayed with proper labeling

## Benefits

- **Proper Data Normalization**: Car data is stored in the cars table instead of JSON fields
- **Referential Integrity**: Foreign key relationships ensure data consistency
- **Inventory Management**: Old cars received from clients are tracked as inventory items
- **Reporting**: Can easily query and report on cars received from clients
- **Future Extensions**: Can add more functionality around received cars (reselling, etc.)

## Backwards Compatibility

All existing exchange deal data is preserved. The old individual fields (`old_car_manufacturer`, `old_car_name`, etc.) are still stored for backwards compatibility while the new normalized approach is used going forward.
