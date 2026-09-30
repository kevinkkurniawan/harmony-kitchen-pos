---
name: pos-e2e-audit
description: Critical end-to-end (E2E) audit, Playwright test suite creation, and bug-fixing workflow for Harmony Kitchen POS (Point of Sale). Use when auditing, testing, or fixing POS features, cash register workflows, and buttons end-to-end.
---

# Harmony Kitchen POS — Critical End-to-End Audit & Testing Skill

Use this skill to systematically audit, test, and fix **all POS features, cashier workflows, and interactive controls** with maximum critical focus.

---

## 1. POS Core Feature & Component Mapping

The Harmony Kitchen POS system comprises the following primary components, modals, and backing API routes:

| # | Feature / Workflow | Primary Component / Modal | Backing API Routes | Spec File |
|---|---|---|---|---|
| 1 | **Cashier Authentication & Shift Session** | `LoginModal.tsx`, `POSClient.tsx` | `/api/users` | `tests/pos-auth.spec.ts` |
| 2 | **Catalog, Search & Barcode Scanner** | `POSClient.tsx` | `/api/products` | `tests/pos-catalog.spec.ts` |
| 3 | **Cart Management, Memos & Item Void** | `POSClient.tsx`, `ItemMemoModal.tsx`, `VoidReasonModal.tsx` | `/api/products` | `tests/pos-cart.spec.ts` |
| 4 | **Wholesale Tiers & Pricing Modes** | `POSClient.tsx`, `wholesale-rules.ts` | `/api/products` | `tests/pos-wholesale.spec.ts` |
| 5 | **Discounts, Vouchers & Customer/Member** | `POSClient.tsx`, `MemberValidationModal.tsx` | `/api/customers` | `tests/pos-discount-member.spec.ts` |
| 6 | **Payment & Multi-Method Checkout** | `PaymentModal.tsx`, `sales-calculation.ts` | `/api/transactions` | `tests/pos-payment.spec.ts` |
| 7 | **Thermal Receipt & Reprinting** | `ReceiptModal.tsx` | `/api/transactions/[id]` | `tests/pos-receipt.spec.ts` |
| 8 | **Cashier Shift Summary & Reporting** | `CashierSummaryModal.tsx` | `/api/reports/shift` | `tests/pos-summary.spec.ts` |
| 9 | **Hardware & Store POS Settings** | `SettingsModal.tsx` | `/api/settings` | `tests/pos-settings.spec.ts` |

---

## 2. Four-Phase Workflow

### Phase 1: Deep Static & Control Inventory Audit
Before writing tests:
1. **100% Button & Control Inventory Check**: Inspect every component and modal. List **every single button, link, keypad digit, toggle, modal trigger, reset/batal, cancel, print, delete/void, and shortcut**. Every button must be clicked, exercised, and asserted in tests.
2. **API Routes & Contract Verification**: Inspect `/api/products`, `/api/transactions`, `/api/customers`, `/api/reports`, etc. Ensure request/response types match frontend expectations (e.g. camelCase vs snake_case, BigInt serialization).
3. **Domain Business Rules**: Verify canonical sales calculation (`subtotal - discount + tax + service = grandTotal`), wholesale threshold tiers, member discount rules, and audit logging.

### Phase 2: Comprehensive E2E Test Suite Creation
Write Playwright test suites in `tests/` covering:
1. Initial cashier login & shift initialization.
2. Barcode search, scan multiplier, and category filter navigation.
3. Item cart additions, inline quantity adjustments, item memo attachment, and item void modal with mandatory reason.
4. Wholesale mode activation, Grosir 1 override, and tier pricing.
5. Member modal search, member discount deduction, and manual invoice discount (nominal & percent).
6. Multi-method checkout (Cash with exact amount & change calculation, QRIS, Transfer, EDC Debit, Tempo).
7. Printable thermal receipt inspection, `window.print` trigger, reprint audit tracking, and modal dismissal.
8. Cashier shift summary review and closing balance.
9. Store & printer settings updates.

### Phase 3: Execute Playwright & Fix Bugs Iteratively
1. Run the test suite:
   ```bash
   npx playwright test tests/<spec-name>.spec.ts --reporter=list
   ```
2. **Analyze Failures Critically**:
   - Fix actual bugs in UI components (`src/components/...`) or API routes (`src/app/api/...`).
   - Prevent flaky tests by ensuring clean test fixtures and proper modal visibility assertions.
3. Re-run Playwright until 100% of tests pass cleanly.

### Phase 4: Sign-Off Report
Provide a structured report with tested features, bugs found/fixed, and Playwright execution verification.

---

## 3. Mandatory Testing Rules
- **100% Control Inventory**: Every primary and secondary control (`Batal`, `Tutup / X`, `Refresh`, `Cetak`, `Simpan`, `Hapus / Void`, `Bayar`) MUST be exercised in the Playwright suite.
- **Window.print Mocking**: Always mock `window.print = () => {}` in test init scripts to prevent system print dialog hangs in headless test environments.
- **Data Cleanup**: Clean up test transactions, audit logs, and test customers in `test.afterAll`.
