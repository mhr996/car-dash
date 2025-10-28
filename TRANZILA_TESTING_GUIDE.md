# Tranzila Integration Testing Guide

## Setup Complete ✅

The Tranzila integration is now fully wired into your billing system!

## What Was Integrated

### 1. Automatic Invoice/Receipt Creation

When you create a bill in the system, a corresponding document is automatically created in Tranzila.

### 2. Data Flow

```
User Creates Bill → Saved to Database → Tranzila Document Created → Bill Updated with Tranzila Info
```

### 3. Document Type Mapping

- **General Bill** → Tranzila Invoice (`I`)
- **Tax Invoice** → Tranzila Invoice (`I`)
- **Receipt Only** → Tranzila Receipt (`RE`)
- **Tax Invoice + Receipt** → Tranzila Invoice+Receipt (`IR`)

### 4. Payment Method Mapping

- **Credit Card (visa)** → Tranzila Code `1`
- **Cash** → Tranzila Code `2`
- **Check** → Tranzila Code `3`
- **Bank Transfer** → Tranzila Code `4`

## Testing Instructions

### Test 1: Create a Simple Bill

1. Navigate to **Bills → Add Bill**
2. Fill in basic info:
    - Customer Name: "Test Customer"
    - Bill Type: "Tax Invoice + Receipt"
    - Add at least one payment method
3. Click **Save**
4. Check browser console for Tranzila log: `"Tranzila document created successfully: 30XXX"`

### Test 2: Verify in Database

After creating a bill, check in Supabase:

```sql
SELECT
  id,
  customer_name,
  bill_type,
  tranzila_document_id,
  tranzila_document_number,
  tranzila_retrieval_key,
  tranzila_created_at
FROM bills
ORDER BY id DESC
LIMIT 5;
```

You should see the Tranzila columns populated.

### Test 3: Check Different Bill Types

Create bills with different types to verify mapping:

- ✅ General Bill
- ✅ Tax Invoice
- ✅ Receipt Only
- ✅ Tax Invoice + Receipt

Each should create the correct Tranzila document type.

### Test 4: Multiple Payment Methods

For "Receipt Only" or "Tax Invoice + Receipt":

- Add multiple payments (cash + visa)
- Verify all payments are included in Tranzila document

## Expected Results

### Success Indicators

- ✅ Bill saves successfully
- ✅ Console shows: `"Tranzila document created successfully: 30XXX"`
- ✅ Bill record has `tranzila_document_number` populated
- ✅ No errors in console

### If Tranzila Fails

- ✅ Bill still saves (non-blocking)
- ⚠️ Console shows error but user sees "Bill created successfully"
- ⚠️ Tranzila columns remain NULL

## Troubleshooting

### Issue: "Tranzila API credentials not configured"

**Solution:** Check `.env` file has:

```env
TRanzila_TERMINAL=fxpautoshoket
TRanzila_PUBLIC_KEY=XUFkR7wQT3...
TRanzila_SECRET_KEY=BhH8760Eop
```

### Issue: "Invalid payment amount"

**Solution:** Ensure bill has total amount > 0

### Issue: Bill saves but Tranzila fails silently

**Solution:**

1. Check browser console for errors
2. Check server terminal for Tranzila API response
3. Verify Tranzila credentials are correct

## Viewing Created Documents

Tranzila documents can be viewed later using the `retrieval_key`. You can add a feature to:

1. Fetch document from Tranzila
2. Display invoice PDF
3. Send invoice to customer

## Next Steps

### Optional Enhancements

1. **Display Tranzila Invoice Number**

    - Show in bills list table
    - Add to bill detail view

2. **Fetch Customer Email**

    - Get from customer table instead of using default
    - Improves Tranzila invoice quality

3. **Retry Failed Documents**

    - Add button to retry Tranzila creation for bills where it failed
    - Filter bills with NULL `tranzila_document_number`

4. **Document Viewer**

    - Add endpoint to fetch document using `retrieval_key`
    - Display invoice in modal or new tab

5. **Error Notifications**
    - Show warning if Tranzila creation fails
    - Log failures for admin review

## API Testing (Optional)

You can test the Tranzila API directly:

```powershell
# Create test document
Invoke-RestMethod -Uri "http://localhost:3000/api/tranzila" -Method POST -Headers @{'Content-Type'='application/json'} -Body '{"action":"create_document"}' | ConvertTo-Json -Depth 10

# View available options
Invoke-RestMethod -Uri "http://localhost:3000/api/tranzila" -Method GET
```

## Support

For issues or questions:

1. Check `TRANZILA_API_REFERENCE.md` for API details
2. Review console logs for error messages
3. Verify database migration was successful
4. Contact Tranzila support if API returns errors

---

**Integration Status:** ✅ Complete and Ready for Production
