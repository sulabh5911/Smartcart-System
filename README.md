# Smart Mart Pro

loginin with Manager
Email-rahul@gmail.com
password-12345678



staff 
Email- your-real-email@gmail.com
Password-12345678

## Barcode scanning

Product barcodes are optional text values. The API trims them and accepts 1–64 printable ASCII characters, covering common EAN-8, EAN-13, UPC-A, UPC-E, and Code 128 values. Codes are stored as strings so leading zeroes are preserved. Empty values are treated as no barcode; non-empty values are unique across products. Existing products are not assigned synthetic barcodes.

Products can be searched and edited by barcode in Product Management. POS supports keyboard-emulating USB scanners (scan into the barcode input and send Enter, or scan rapidly while the POS page is active) and a camera scanner for supported browser/device combinations. Camera access requires user permission and HTTPS, except on localhost. No additional environment variables are required.

When editing a product, use **Refill Product Stock** to receive more units into a tracked batch. Enter the batch number, purchase cost, and expiry date; the existing inventory receive API updates stock totals and writes the stock movement audit record.

### API

All product routes require a bearer JWT. Barcode lookup is available to Admin, Manager, and Cashier roles. Creating or changing a barcode is restricted to Admin and Manager.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/products/barcode?code=<barcode>` | Exact lookup of a non-archived product. Returns product/category details, sellable quantity, and unexpired batch availability. A missing active product returns `404`; an empty or malformed code returns `400`. |
| `POST` | `/api/products` | Create a product; `barcode` is optional. |
| `PATCH` / `PUT` | `/api/products/:id` | Update product details or barcode. Send an empty barcode to clear it. |

Successful responses use the existing `{ success, statusCode, message, data }` format. Duplicate barcodes return `409 Conflict`. POS checkout remains server-authoritative: prices are re-read by the existing checkout service, expired batches are excluded, FEFO allocation is retained, and conditional batch updates prevent concurrent overselling. POS bills do not add GST; payable is merchandise subtotal less discount. Scanning only updates the cart; stock is deducted at checkout.

### Install, test, and build

```powershell
npm install --prefix .\client html5-qrcode
npm run test:barcode --prefix .\server
node --test .\server\src\tests\supplier-relations.test.js
npm run build --prefix .\client
npm run lint --prefix .\client
```

The barcode unit tests do not require MongoDB. End-to-end scripts under `server/src/tests` require the API and MongoDB plus explicitly-created test fixtures; use an isolated test database and never seed test records into production.

Customer returns refund each product's proportional share of its line value after the invoice discount; tax is excluded. The invoice-level discount is allocated across products in proportion to their original line totals, and repeated partial returns reconcile to that discounted pre-tax value.

## API-backed application data

The client loads business records from the authenticated API; there are no frontend mock catalogs, quick demo login accounts, or automatically-created sample suppliers. Store settings are persisted by `GET /api/settings` and `PUT /api/settings` (Admin only).

Suppliers can be linked to multiple categories and products from the Supplier form, and new categories or products can be created there without leaving the form. A quick-created product can also receive initial stock with a batch number, purchase cost, and future expiry date. The receipt is written through the inventory API; the new product is saved to the catalog with its selected category and linked to the supplier when the supplier is saved. These links are validated against MongoDB and appear by product name in the supplier list/profile; historical purchase lines are shown when no explicit product links exist. Existing supplier category text remains readable for older records. Supplier management remains restricted to Admin and Manager roles.

Purchase receipts support multiple product/batch lines, filter products by the selected supplier's linked products or categories, and reject products outside that supplier's catalog when links are configured. Every batch requires a future expiry date. Purchase totals use the received quantities and purchase costs only; supplier invoice tax is not added. Successful receipts update batches, stock movements, and supplier purchase totals.

Inventory batches show their attributed supplier. Manual stock receipts can optionally select an active supplier; batches already tied to a supplier can only be replenished with that same supplier. Purchase receipt forms record Paid or Pending status and reuse the same idempotency key if the cashier retries an ambiguous request while the form remains open. Supplier balance due is still manually maintained; there is no payment ledger or partial-payment amount tracking yet.

On a new database, create the first administrator by setting `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`, and `INITIAL_ADMIN_PASSWORD` in `server/.env`, then running:

```powershell
npm run bootstrap:admin --prefix .\server
```

The bootstrap command only works when the users collection is empty and never resets an existing account. Create additional staff through the authenticated Users API. Existing MongoDB records are not automatically deleted by this change; remove any previously-added sample records only after verifying they are not real business data.

### Manual verification

1. Sign in as Admin or Manager, create a product with an EAN/UPC or Code 128 string, then try assigning the same barcode to a second product; the second save must be rejected.
2. Sign in as Cashier, scan a known code with a USB scanner or type it into the POS barcode field and press Enter. The product and live sellable availability should appear in the cart.
3. Scan it again to increment quantity; try an unknown, archived, or fully expired/out-of-stock code and check the notification.
4. Open **Scan Barcode**, allow camera access, scan a supported retail label, then stop or close the modal and verify the camera indicator turns off. Deny permission and use Retry to confirm the permission error is actionable.
5. Add a product with multiple batches and verify the receipt records FEFO deductions after checkout. Try concurrent checkouts whose combined quantity exceeds stock; no batch may become negative.
6. As Admin or Manager, create a supplier and use **Add category** and **Add product** in the supplier form. Save the supplier; verify the new product appears under its category on Products and in the supplier profile.
7. Receive a purchase with multiple products from that supplier. Verify products outside the supplier's assigned products/categories are unavailable, each batch has a future expiry, and the grand total equals the sum of the received product costs without tax.

### Production notes

- Serve the frontend over HTTPS for camera access outside localhost and configure the browser/device camera permission policy.
- Deploy the partial unique barcode index on the Product collection. Before deploying to a database with existing data, identify and resolve duplicate non-empty barcode values; MongoDB cannot create the unique index while duplicates exist.
- The checkout uses atomic conditional batch decrements and compensating rollback for downstream persistence failures, not MongoDB multi-document transactions. Keep the existing authoritative checkout path and validate database backups, indexes, and concurrent checkout behavior in the target deployment.
