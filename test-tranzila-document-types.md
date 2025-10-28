# Tranzila Document Type Testing

## Test 1: Tax Invoice Only (Type 305)

```powershell
Invoke-RestMethod -Uri 'http://localhost:3000/api/tranzila' -Method POST -Headers @{'Content-Type'='application/json'} -Body '{
  "action": "create_document",
  "data": {
    "document_type": "305",
    "client_company": "Test Customer",
    "client_name": "Test Customer",
    "client_id": "999999999",
    "client_email": "test@example.com",
    "items": [
      {
        "type": "I",
        "name": "Test Item - Invoice Only",
        "price_type": "G",
        "unit_price": 1,
        "units_number": 1,
        "unit_type": 1,
        "currency_code": "ILS",
        "to_doc_currency_exchange_rate": 1
      }
    ],
    "payments": [
      {
        "payment_method": 1,
        "payment_date": "2025-10-28",
        "amount": 1,
        "currency_code": "ILS",
        "to_doc_currency_exchange_rate": 1
      }
    ]
  }
}' | ConvertTo-Json -Depth 10
```

**Expected Result:** Should create Tax Invoice only (no receipt)

---

## Test 2: Tax Invoice + Receipt (Type 320)

```powershell
Invoke-RestMethod -Uri 'http://localhost:3000/api/tranzila' -Method POST -Headers @{'Content-Type'='application/json'} -Body '{
  "action": "create_document",
  "data": {
    "document_type": "320",
    "client_company": "Test Customer",
    "client_name": "Test Customer",
    "client_id": "999999999",
    "client_email": "test@example.com",
    "items": [
      {
        "type": "I",
        "name": "Test Item - Invoice+Receipt",
        "price_type": "G",
        "unit_price": 1,
        "units_number": 1,
        "unit_type": 1,
        "currency_code": "ILS",
        "to_doc_currency_exchange_rate": 1
      }
    ],
    "payments": [
      {
        "payment_method": 1,
        "payment_date": "2025-10-28",
        "amount": 1,
        "currency_code": "ILS",
        "to_doc_currency_exchange_rate": 1
      }
    ]
  }
}' | ConvertTo-Json -Depth 10
```

**Expected Result:** Should create Tax Invoice + Receipt (default, already tested successfully)

---

## Test 3: Receipt Only (Type 400)

```powershell
Invoke-RestMethod -Uri 'http://localhost:3000/api/tranzila' -Method POST -Headers @{'Content-Type'='application/json'} -Body '{
  "action": "create_document",
  "data": {
    "document_type": "400",
    "client_company": "Test Customer",
    "client_name": "Test Customer",
    "client_id": "999999999",
    "client_email": "test@example.com",
    "items": [
      {
        "type": "I",
        "name": "Test Item - Receipt Only",
        "price_type": "G",
        "unit_price": 1,
        "units_number": 1,
        "unit_type": 1,
        "currency_code": "ILS",
        "to_doc_currency_exchange_rate": 1
      }
    ],
    "payments": [
      {
        "payment_method": 1,
        "payment_date": "2025-10-28",
        "amount": 1,
        "currency_code": "ILS",
        "to_doc_currency_exchange_rate": 1
      }
    ]
  }
}' | ConvertTo-Json -Depth 10
```

**Expected Result:** Should create Receipt only (no tax invoice)

---

## Test 4: Multiple Payment Methods

```powershell
Invoke-RestMethod -Uri 'http://localhost:3000/api/tranzila' -Method POST -Headers @{'Content-Type'='application/json'} -Body '{
  "action": "create_document",
  "data": {
    "document_type": "320",
    "client_company": "Test Customer",
    "client_name": "Test Customer",
    "client_id": "999999999",
    "client_email": "test@example.com",
    "items": [
      {
        "type": "I",
        "name": "Test Item - Multiple Payments",
        "price_type": "G",
        "unit_price": 1,
        "units_number": 1,
        "unit_type": 1,
        "currency_code": "ILS",
        "to_doc_currency_exchange_rate": 1
      }
    ],
    "payments": [
      {
        "payment_method": 1,
        "payment_date": "2025-10-28",
        "amount": 0.5,
        "currency_code": "ILS",
        "to_doc_currency_exchange_rate": 1,
        "cc_last_4_digits": "1234",
        "cc_installments_number": 3
      },
      {
        "payment_method": 2,
        "payment_date": "2025-10-28",
        "amount": 0.5,
        "currency_code": "ILS",
        "to_doc_currency_exchange_rate": 1
      }
    ]
  }
}' | ConvertTo-Json -Depth 10
```

**Expected Result:** Should create document with split payment (0.5 via credit card + 0.5 via cash)

---

## Test 5: Check Payment with Details

```powershell
Invoke-RestMethod -Uri 'http://localhost:3000/api/tranzila' -Method POST -Headers @{'Content-Type'='application/json'} -Body '{
  "action": "create_document",
  "data": {
    "document_type": "320",
    "client_company": "Test Customer",
    "client_name": "Test Customer",
    "client_id": "999999999",
    "client_email": "test@example.com",
    "items": [
      {
        "type": "I",
        "name": "Test Item - Check Payment",
        "price_type": "G",
        "unit_price": 1,
        "units_number": 1,
        "unit_type": 1,
        "currency_code": "ILS",
        "to_doc_currency_exchange_rate": 1
      }
    ],
    "payments": [
      {
        "payment_method": 3,
        "payment_date": "2025-10-28",
        "amount": 1,
        "currency_code": "ILS",
        "to_doc_currency_exchange_rate": 1,
        "check_number": "123456",
        "check_bank_name": "Bank Hapoalim",
        "check_branch": "100",
        "check_account_number": "987654",
        "check_holder_name": "Test Customer"
      }
    ]
  }
}' | ConvertTo-Json -Depth 10
```

**Expected Result:** Should create document with check payment details

---

## Test 6: Bank Transfer with Details

```powershell
Invoke-RestMethod -Uri 'http://localhost:3000/api/tranzila' -Method POST -Headers @{'Content-Type'='application/json'} -Body '{
  "action": "create_document",
  "data": {
    "document_type": "320",
    "client_company": "Test Customer",
    "client_name": "Test Customer",
    "client_id": "999999999",
    "client_email": "test@example.com",
    "items": [
      {
        "type": "I",
        "name": "Test Item - Bank Transfer",
        "price_type": "G",
        "unit_price": 1,
        "units_number": 1,
        "unit_type": 1,
        "currency_code": "ILS",
        "to_doc_currency_exchange_rate": 1
      }
    ],
    "payments": [
      {
        "payment_method": 4,
        "payment_date": "2025-10-28",
        "amount": 1,
        "currency_code": "ILS",
        "to_doc_currency_exchange_rate": 1,
        "transfer_number": "REF123456",
        "transfer_bank_name": "Bank Leumi",
        "transfer_branch": "200",
        "transfer_account_number": "123456789",
        "transfer_holder_name": "Test Customer"
      }
    ]
  }
}' | ConvertTo-Json -Depth 10
```

**Expected Result:** Should create document with bank transfer details

---

## Results Summary

After running tests, record results here:

## Results Summary

After running tests, record results here:

| Test | Document Type        | Status | Document ID | Document Number | Notes                      |
| ---- | -------------------- | ------ | ----------- | --------------- | -------------------------- |
| 1    | IN (Tax Invoice)     | ✅     | 8           | 10002           | Success! Tax invoice only  |
| 2    | IR (Invoice+Receipt) | ✅     | 5+          | 30004+          | Success! Combined document |
| 3    | RE (Receipt)         | ✅     | 9           | 20001           | Success! Receipt only      |
| 4    | DI (Deal Invoice)    | ✅     | 10          | 90001           | Success! Deal invoice      |
| 5    | Multiple Payments    | ❓     | -           | -               | Not tested yet             |
| 6    | Check Payment        | ❓     | -           | -               | Not tested yet             |
| 7    | Bank Transfer        | ❓     | -           | -               | Not tested yet             |

## Correct Document Type Codes

According to Tranzila documentation and confirmed by testing:

- **IR** = Tax invoice / receipt (combined) ✅
- **IN** = Tax invoice (only) ✅
- **RE** = Receipt (only) ✅
- **DI** = Deal Invoice ✅

**WRONG CODES** (don't use these):

- ~~"I"~~ = Invalid (error 10002)
- ~~"305", "320", "400"~~ = Numeric codes don't work (error 10002)

## Correct Payment Method Codes

- **1** = Credit Card
- **3** = Cheque
- **4** = Bank Transfer
- **5** = Cash (NOT 2!)
- **6** = PayPal
- **10** = Other

## Notes

- All tests use amount = 1 to avoid billing issues
- Document number series differ by type: 10xxx (IN), 20xxx (RE), 30xxx (IR), 90xxx (DI)
- All document types work correctly with proper codes
- Code updated to use correct document type mapping
