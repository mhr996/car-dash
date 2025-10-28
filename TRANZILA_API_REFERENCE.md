# Tranzila API Integration Reference

## Overview

Integration with Tranzila Billing API for creating invoices and receipts.

**Base URL:** `https://billing5.tranzila.com/api/documents_db`

**Documentation:** https://docs.tranzila.com/docs/invoices/27ffheryfv066-create-document

## Authentication

Uses HMAC-SHA256 authentication with custom headers:

- `X-tranzila-api-app-key`: Public key
- `X-tranzila-api-request-time`: Unix timestamp (seconds)
- `X-tranzila-api-nonce`: 80 alphanumeric characters
- `X-tranzila-api-access-token`: HMAC hex digest

**Algorithm:**

```
time = Unix seconds (not milliseconds)
nonce = 80 random alphanumeric chars [A-Za-z0-9]
hmac_key = secret + time + nonce
access_token = HMAC_SHA256(message=public_key, key=hmac_key) as HEX
```

## Document Types

| Code | Description       | Hebrew          | Use Case                                         |
| ---- | ----------------- | --------------- | ------------------------------------------------ |
| `IR` | Invoice + Receipt | מס/חשבונית קבלה | Default - most common for completed transactions |
| `I`  | Invoice only      | חשבונית         | Bill without payment confirmation                |
| `RE` | Receipt only      | קבלה            | Payment receipt without invoice details          |

## Payment Methods

| Code | Description   | When to Use       |
| ---- | ------------- | ----------------- |
| `1`  | Credit Card   | Card payments     |
| `2`  | Cash          | Cash transactions |
| `3`  | Check         | Check payments    |
| `4`  | Bank Transfer | Wire transfers    |

## Our App Mapping

### Bill Types → Document Types

Based on our `bills` table `type` column:

- **Type 1** (Regular Bill) → `IR` (Invoice + Receipt)
- **Type 2** (Proforma) → `I` (Invoice only)
- **Type 3** (Receipt) → `RE` (Receipt only)

### Payment Methods → Tranzila Payment Methods

Based on our `payments` table `payment_type`:

- **Credit Card** → `1`
- **Cash** → `2`
- **Check** → `3`
- **Bank Transfer** → `4`

## API Endpoint

**POST** `/api/tranzila`

### Request Body

```json
{
    "action": "create_document",
    "data": {
        "document_type": "IR",
        "document_date": "2024-01-01",
        "document_currency_code": "ILS",
        "vat_percent": 17,

        "client_company": "Customer Name",
        "client_name": "Contact Person",
        "client_id": "123456789",
        "client_email": "customer@example.com",
        "client_address_line_1": "Address",
        "client_city": "City",
        "client_zip": "12345",
        "client_country_code": "IL",

        "items": [
            {
                "type": "I",
                "code": "ITEM001",
                "name": "Product Name",
                "price_type": "G",
                "unit_price": 100,
                "units_number": 1,
                "unit_type": 1,
                "currency_code": "ILS",
                "to_doc_currency_exchange_rate": 1
            }
        ],

        "payments": [
            {
                "payment_method": 1,
                "payment_date": "2024-01-01",
                "amount": 100,
                "currency_code": "ILS",
                "to_doc_currency_exchange_rate": 1
            }
        ]
    }
}
```

### Response (Success)

```json
{
    "ok": true,
    "status": 200,
    "response": {
        "status_code": 0,
        "status_msg": "הצלחה",
        "enquiry_key": "abc123",
        "document": {
            "id": "3",
            "number": "30002",
            "total_charge_amount": 100,
            "currency": "ILS",
            "created_at": "2025-10-28 13:46:25",
            "retrieval_key": "long_encoded_key..."
        }
    }
}
```

## Database Schema

Store Tranzila response in `bills` table:

```sql
ALTER TABLE bills ADD COLUMN tranzila_document_id VARCHAR(50);
ALTER TABLE bills ADD COLUMN tranzila_document_number VARCHAR(50);
ALTER TABLE bills ADD COLUMN tranzila_retrieval_key TEXT;
ALTER TABLE bills ADD COLUMN tranzila_created_at TIMESTAMP;
```

## Integration Flow

1. **Bill Creation** (`app/(defaults)/bills/add/page.tsx`)

    - User creates bill in our system
    - Insert into `bills` table → get `bill_id`
    - Call `/api/tranzila` with bill data
    - Store `document.id`, `document.number`, `document.retrieval_key` in bills table

2. **Data Mapping**

    - Map customer data to client fields
    - Map bill items to Tranzila items array
    - Map payment records to payments array
    - Calculate totals with VAT

3. **Error Handling**
    - If Tranzila fails, log error but don't block bill creation
    - Allow retry mechanism for failed documents
    - Show Tranzila status in bills list

## Field Mappings

### Customer → Client

```typescript
{
  client_company: customer.name,
  client_name: customer.contact_person || customer.name,
  client_id: customer.tax_id || customer.id_number,
  client_email: customer.email,
  client_address_line_1: customer.address,
  client_city: customer.city,
  client_zip: customer.postal_code,
  client_country_code: customer.country || 'IL'
}
```

### Bill Items → Items Array

```typescript
items: bill_items.map((item) => ({
    type: 'I', // I = Item, S = Service
    code: item.code || null,
    name: item.description,
    price_type: 'G', // G = Gross (includes VAT), N = Net
    unit_price: item.unit_price,
    units_number: item.quantity,
    unit_type: 1,
    currency_code: 'ILS',
    to_doc_currency_exchange_rate: 1,
}));
```

### Payments → Payments Array

```typescript
payments: [
    {
        payment_method: mapPaymentType(payment.payment_type),
        payment_date: payment.payment_date || bill.created_at,
        amount: bill.total_amount,
        currency_code: 'ILS',
        to_doc_currency_exchange_rate: 1,
    },
];
```

## Notes

- **Test Mode**: Always use `overrideAmount: 1` for testing
- **VAT**: Default is 17%, can be customized per document
- **Currency**: Currently only ILS supported in our system
- **Date Format**: `yyyy-mm-dd` for all date fields
- **Document Language**: `heb` (Hebrew) or `eng` (English)
- **Response Language**: `eng` recommended for easier parsing

## Environment Variables

```env
TRanzila_TERMINAL=your_terminal_name
TRanzila_PUBLIC_KEY=your_public_key
TRanzila_SECRET_KEY=your_secret_key
```

## Testing

```powershell
# Test document creation
Invoke-RestMethod -Uri "http://localhost:3000/api/tranzila" -Method POST -Headers @{'Content-Type'='application/json'} -Body '{"action":"create_document"}' | ConvertTo-Json -Depth 10

# View available options
Invoke-RestMethod -Uri "http://localhost:3000/api/tranzila" -Method GET
```
