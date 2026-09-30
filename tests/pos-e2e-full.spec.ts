import { test, expect, Page } from '@playwright/test';

async function ensureLoggedIn(page: Page) {
  await page.goto('/');
  const loginModal = page.locator('text=Login Sistem Kasir');
  try {
    if (await loginModal.isVisible({ timeout: 2000 })) {
      await page.locator('input[placeholder="Masukkan username kasir"]').fill('admin');
      await page.locator('input[placeholder="••••••••"]').fill('5555');
      await page.getByRole('button', { name: 'Masuk Sistem Kasir' }).click();
      await expect(loginModal).not.toBeVisible({ timeout: 5000 });
    }
  } catch {
    // If not visible, check cashier badge
  }
  await expect(page.getByRole('button', { name: /admin/i })).toBeVisible({ timeout: 5000 });
}

async function addProductToCart(page: Page, query = 'Water Jug') {
  const searchInput = page.locator('input[placeholder*="Scan / Ketik"]');
  await searchInput.fill(query);
  const dropdownItem = page.locator('.absolute.top-full').locator(`text=${query}`).first();
  await dropdownItem.waitFor({ state: 'visible', timeout: 5000 });
  await dropdownItem.click();
  // Wait for item to appear in cart table
  await expect(page.locator('table').first()).toContainText(query);
}

async function clearCartIfNotEmpty(page: Page) {
  const batalBtn = page.getByRole('button', { name: 'Batal' }).last();
  if (await batalBtn.isEnabled()) {
    await batalBtn.click();
    const alertDialog = page.locator('.fixed.z-\\[100\\]');
    await alertDialog.getByRole('button', { name: 'Ya' }).click();
    await expect(page.locator('text=Belum ada barang di keranjang')).toBeVisible();
  }
}

test.describe('Harmony Kitchen POS — Comprehensive 100% Feature & Control Audit', () => {
  let createdCustomerId: string | null = null;

  test.beforeEach(async ({ page }) => {
    // Mock window.print to prevent browser hanging on print dialogs
    await page.addInitScript(() => {
      window.print = () => {
        (window as any).__printed = true;
      };
    });
  });

  test.afterAll(async ({ request }) => {
    // Clean up created test customer if any
    if (createdCustomerId) {
      try {
        await request.delete(`/api/customers?id=${createdCustomerId}`);
      } catch (e) {
        console.error('Failed to cleanup customer:', e);
      }
    }
  });

  test('Flow 1: Cashier Authentication, Session Info, and Logout Controls', async ({ page }) => {
    // Clear localStorage to ensure fresh unauthenticated state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();

    // 1. Verify LoginModal opens on initial unauthenticated load
    const loginModal = page.locator('text=Login Sistem Kasir');
    await expect(loginModal).toBeVisible({ timeout: 10000 });

    // 2. Test invalid login credentials
    const usernameInput = page.locator('input[placeholder="Masukkan username kasir"]');
    const passwordInput = page.locator('input[placeholder="••••••••"]');
    const submitLoginBtn = page.getByRole('button', { name: 'Masuk Sistem Kasir' });

    await usernameInput.fill('invalid_user_99');
    await passwordInput.fill('wrongpass');
    await submitLoginBtn.click();

    // Assert error message
    const errorAlert = page.locator('text=Username kasir tidak ditemukan');
    await expect(errorAlert).toBeVisible();

    // 3. Test valid login credentials (admin / 5555)
    await usernameInput.fill('admin');
    await passwordInput.fill('5555');
    await submitLoginBtn.click();

    // Assert LoginModal closes and cashier badge is visible in toolbar
    await expect(loginModal).not.toBeVisible();
    const cashierBadge = page.getByRole('button', { name: /admin/i });
    await expect(cashierBadge).toBeVisible();

    // 4. Click cashier badge to view active session info
    await cashierBadge.click();
    await expect(page.locator('text=Informasi Kasir Aktif')).toBeVisible();
    await expect(page.locator('text=Sesi Login Aktif')).toBeVisible();

    // 5. Test "Tutup / Kembali ke Transaksi" button
    const closeInfoBtn = page.getByRole('button', { name: 'Tutup / Kembali ke Transaksi' });
    await closeInfoBtn.click();
    await expect(page.locator('text=Informasi Kasir Aktif')).not.toBeVisible();

    // 6. Test Logout confirmation via "Keluar" button in toolbar
    const keluarBtn = page.getByRole('button', { name: /Keluar/i }).last();
    await keluarBtn.click();

    // Assert AlertDialog appears
    const alertDialog = page.locator('.fixed.z-\\[100\\]');
    await expect(alertDialog.locator('text=Konfirmasi Logout')).toBeVisible();

    // Cancel logout
    const alertCancelBtn = alertDialog.getByRole('button', { name: 'Batal' });
    await alertCancelBtn.click();
    await expect(alertDialog).not.toBeVisible();

    // Now confirm logout
    await keluarBtn.click();
    await expect(alertDialog.locator('text=Konfirmasi Logout')).toBeVisible();
    const alertConfirmBtn = alertDialog.getByRole('button', { name: 'Ya' });
    await alertConfirmBtn.click();

    // Assert back to LoginModal
    await expect(page.locator('text=Login Sistem Kasir')).toBeVisible();

    // Re-login to continue next tests
    await page.locator('input[placeholder="Masukkan username kasir"]').fill('admin');
    await page.locator('input[placeholder="••••••••"]').fill('5555');
    await page.getByRole('button', { name: 'Masuk Sistem Kasir' }).click();
    await expect(page.locator('text=Login Sistem Kasir')).not.toBeVisible();
  });

  test('Flow 2: Product Catalog Search & Scan Multiplier', async ({ page }) => {
    await ensureLoggedIn(page);
    await clearCartIfNotEmpty(page);

    // Verify search input is present
    const searchInput = page.locator('input[placeholder*="Scan / Ketik"]');
    await expect(searchInput).toBeVisible();

    // Set scan multiplier to 3
    const multiplierInput = page.locator('input[type="number"]').first();
    await multiplierInput.fill('3');

    // Type product query "Water Jug" and select from dropdown
    await addProductToCart(page, 'Water Jug');

    // Assert item is added to cart with quantity 3
    const cartTable = page.locator('table').first();
    await expect(cartTable).toContainText('Water Jug');
    await expect(cartTable).toContainText('3');

    // Clean up cart
    await clearCartIfNotEmpty(page);
  });

  test('Flow 3: Cart Management, Inline Steppers, Memos, Item Void & Clear Cart', async ({ page }) => {
    await ensureLoggedIn(page);
    await clearCartIfNotEmpty(page);

    // 1. Add item to cart
    await addProductToCart(page, 'Water Jug');

    const cartTable = page.locator('table').first();
    await expect(cartTable).toContainText('Water Jug');

    // 2. Test Inline Quantity Steppers (+) and (-)
    const addQtyBtn = page.locator('button[title="Tambah Qty (+)"]').first();
    const subQtyBtn = page.locator('button[title="Kurangi Qty (-)"]').first();

    await addQtyBtn.click();
    await expect(cartTable).toContainText('2');

    await subQtyBtn.click();
    await expect(cartTable).toContainText('1');

    // 3. Test Item Memo Modal
    const memoBtn = page.locator('button[title="Catatan / Memo Item"]').first();
    await memoBtn.click();

    // Assert ItemMemoModal is visible
    await expect(page.locator('text=Catatan Produk / Memo Item')).toBeVisible();

    // Click a preset memo "+ Bubble Wrap Extra"
    const presetBtn = page.getByRole('button', { name: '+ Bubble Wrap Extra' });
    await presetBtn.click();

    // Save memo
    const saveMemoBtn = page.getByRole('button', { name: 'Simpan Catatan' });
    await saveMemoBtn.click();

    // Assert memo is displayed under the product name in cart table
    await expect(page.locator('text=* Catatan: Bubble Wrap Extra')).toBeVisible();

    // 4. Test Item Void with PIN Modal
    const voidBtn = page.locator('button[title="Batalkan Item (Void dengan PIN)"]').first();
    await voidBtn.click();

    // Assert VoidReasonModal is visible
    await expect(page.locator('text=Otorisasi Pembatalan (Void Item)')).toBeVisible();

    // Try submitting without PIN
    const confirmVoidBtn = page.getByRole('button', { name: 'Batalkan Item (Void)' });
    await confirmVoidBtn.click();
    await expect(page.locator('text=Masukkan Password Otorisasi Supervisor!')).toBeVisible();

    // Test Batal on void modal
    const cancelVoidBtn = page.locator('.fixed.z-50').getByRole('button', { name: 'Batal', exact: true });
    await cancelVoidBtn.click();
    await expect(page.locator('text=Otorisasi Pembatalan (Void Item)')).not.toBeVisible();

    // Re-open void modal and enter supervisor PIN
    await voidBtn.click();
    const pinInput = page.locator('input[placeholder="Masukkan Password"]');
    await pinInput.fill('5555');
    await confirmVoidBtn.click();

    // Assert item is voided / removed from active cart
    await expect(page.locator('text=Belum ada barang di keranjang')).toBeVisible();
  });

  test('Flow 4: Wholesale Tiers & Grosir Mode Overrides', async ({ page }) => {
    await ensureLoggedIn(page);
    await clearCartIfNotEmpty(page);

    // Add item to cart
    await addProductToCart(page, 'Water Jug');

    // 1. Toggle "Grosir Auto"
    const grosirAutoBtn = page.getByRole('button', { name: 'Grosir Auto' });
    await grosirAutoBtn.click();
    await expect(page.locator('text=Mode Grosir')).toBeVisible();

    await grosirAutoBtn.click();
    await expect(page.locator('text=Mode Retail')).toBeVisible();

    // 2. Toggle "Override Grosir 1"
    const overrideBtn = page.getByRole('button', { name: /Override Grosir 1/i });
    await overrideBtn.click();

    // Assert "OVERRIDE GROSIR 1 AKTIF" badge appears
    await expect(page.locator('text=OVERRIDE GROSIR 1 AKTIF')).toBeVisible();

    // Toggle off
    await overrideBtn.click();
    await expect(page.locator('text=OVERRIDE GROSIR 1 AKTIF')).not.toBeVisible();

    // Clear cart
    await clearCartIfNotEmpty(page);
  });

  test('Flow 5: Member Validation & Discounts', async ({ page, request }) => {
    // Create a temporary VIP member with 5% discount
    const custRes = await request.post('/api/customers', {
      data: {
        customerNo: `VIP-${Date.now().toString().slice(-4)}`,
        name: 'Budi Santoso VIP',
        phone: '08123456789',
        customerType: 'Vip',
        discountPercent: 5,
      },
    });
    const custJson = await custRes.json();
    if (custJson.success && custJson.data) {
      createdCustomerId = custJson.data.id;
    }

    await ensureLoggedIn(page);
    await clearCartIfNotEmpty(page);

    // Open Member modal via toolbar button
    const memberBtn = page.getByRole('button', { name: /Member \(F8\)/i });
    await memberBtn.click();

    // Assert MemberValidationModal is visible
    await expect(page.locator('text=Validasi Member / Pelanggan POS')).toBeVisible();

    // Search created customer
    const memberSearchInput = page.locator('input[placeholder*="Cari Nama, No. Member"]');
    await memberSearchInput.fill('Budi Santoso');

    // Click customer to select
    const customerCard = page.locator('text=Budi Santoso VIP');
    await expect(customerCard).toBeVisible();
    await customerCard.click();

    // Assert modal closed and customer badge active on toolbar
    await expect(page.locator('text=Validasi Member / Pelanggan POS')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Budi Santoso VIP/i })).toBeVisible();

    // Add item to cart to assert member discount in receipt calculation panel
    await addProductToCart(page, 'Water Jug');
    await expect(page.locator('text=Diskon Member (5%)')).toBeVisible();

    // Unassign customer via "Lepas Pelanggan"
    const activeCustomerBtn = page.getByRole('button', { name: /Budi Santoso VIP/i });
    await activeCustomerBtn.click();
    const lepasBtn = page.getByRole('button', { name: 'Lepas Pelanggan' });
    await lepasBtn.click();

    // Assert member discount is removed
    await expect(page.locator('text=Diskon Member (5%)')).not.toBeVisible();

    // Clear cart
    await clearCartIfNotEmpty(page);
  });

  test('Flow 6: Manual Invoice Discount Controls', async ({ page }) => {
    await ensureLoggedIn(page);
    await clearCartIfNotEmpty(page);

    // Add item to cart
    await addProductToCart(page, 'Water Jug');

    // Test Manual Discount section
    await expect(page.locator('text=Diskon Nota Manual')).toBeVisible();

    // Toggle between Rp and %
    const percentBtn = page.getByRole('button', { name: '%' });
    const nominalBtn = page.getByRole('button', { name: 'Rp' });

    await percentBtn.click();
    await nominalBtn.click();

    // Enter discount nominal
    const discountValInput = page.locator('input[placeholder="0"]').last();
    await discountValInput.fill('10000');

    // Assert mandatory reason warning appears
    await expect(page.locator('text=* Alasan diskon wajib diisi')).toBeVisible();

    // Payment button should be disabled when reason is empty
    const paymentBtn = page.getByRole('button', { name: /Payment \(F9\)/i });
    await expect(paymentBtn).toBeDisabled();

    // Fill discount reason
    const reasonInput = page.locator('input[placeholder*="Wajib jika ada diskon"]');
    await reasonInput.fill('Diskon Khusus Toko');

    // Warning disappears and payment button becomes enabled
    await expect(page.locator('text=* Alasan diskon wajib diisi')).not.toBeVisible();
    await expect(paymentBtn).toBeEnabled();

    // Assert discount line item in calculation summary
    await expect(page.locator('text=Diskon Manual (Nominal)')).toBeVisible();

    // Reset discount
    await discountValInput.fill('0');
    await reasonInput.fill('');

    // Clear cart
    await clearCartIfNotEmpty(page);
  });

  test('Flow 7: Multi-Method Checkout, Receipt Modal & Reprint', async ({ page }) => {
    await ensureLoggedIn(page);
    await clearCartIfNotEmpty(page);

    // Add item to cart
    await addProductToCart(page, 'Water Jug');

    // Click Payment (F9) button
    const paymentBtn = page.getByRole('button', { name: /Payment \(F9\)/i });
    await expect(paymentBtn).toBeEnabled();
    await paymentBtn.click();

    // Assert PaymentModal is visible
    await expect(page.getByRole('heading', { name: 'Pembayaran' })).toBeVisible();
    const paymentModal = page.locator('.fixed.z-50');
    await expect(paymentModal.getByText('TOTAL TAGIHAN', { exact: true })).toBeVisible();

    // Test Payment method buttons: CASH, EDC BCA, QRIS
    const edcBcaBtn = page.getByRole('button', { name: 'EDC BCA' });
    const qrisBtn = page.getByRole('button', { name: 'QRIS' });
    const cashBtn = page.getByRole('button', { name: 'CASH' });

    await edcBcaBtn.click();
    await expect(page.locator('input[placeholder*="XXXX-XXXX"]')).toBeVisible();

    await qrisBtn.click();

    await cashBtn.click();
    // Test quick cash buttons
    const uangPasBtn = page.getByRole('button', { name: 'Uang Pas' });
    await uangPasBtn.click();

    // Click Submit
    const submitBtn = page.getByRole('button', { name: 'Submit' });
    await submitBtn.click();

    // Assert Confirmation Payment view
    await expect(page.locator('text=Confirmation Payment')).toBeVisible();
    const noBtn = page.getByRole('button', { name: 'No' });
    await noBtn.click();

    // Back to Input view, click Submit and then "Yes, Submit"
    await submitBtn.click();
    const yesSubmitBtn = page.getByRole('button', { name: 'Yes, Submit' });
    await yesSubmitBtn.click();

    // Assert Payment Berhasil view
    await expect(page.locator('text=Payment Berhasil!')).toBeVisible();
    const finishBtn = page.getByRole('button', { name: 'Finish & Cetak Struk' });
    await finishBtn.click();

    // Assert ReceiptModal opens
    await expect(page.locator('text=Preview Nota Pembelian')).toBeVisible();
    await expect(page.locator('text=HARMONY KITCHENWARE').first()).toBeVisible();

    // Click "Cetak Nota Struk"
    const printReceiptBtn = page.getByRole('button', { name: 'Cetak Nota Struk' });
    await printReceiptBtn.click();

    // Click "Tutup" to close ReceiptModal
    const closeReceiptBtn = page.getByRole('button', { name: 'Tutup' });
    await closeReceiptBtn.click();
    await expect(page.locator('text=Preview Nota Pembelian')).not.toBeVisible();

    // Assert cart is reset
    await expect(page.locator('text=Belum ada barang di keranjang')).toBeVisible();

    // Test Reprint Bill button
    const reprintBtn = page.getByRole('button', { name: 'Reprint Bill' });
    await reprintBtn.click();
    await expect(page.locator('text=Preview Nota Pembelian')).toBeVisible();
    await closeReceiptBtn.click();
  });

  test('Flow 8: Cashier Shift Summary (X-Report) & Store Settings Modals', async ({ page }) => {
    await ensureLoggedIn(page);
    await clearCartIfNotEmpty(page);

    // 1. Open Laporan (F10)
    const laporanBtn = page.getByRole('button', { name: /Laporan/i });
    await laporanBtn.click();

    // Assert CashierSummaryModal is visible
    await expect(page.locator('text=Ringkasan Rekap Kasir (X-Report)')).toBeVisible();
    await expect(page.locator('text=TOTAL OMSET').first()).toBeVisible();

    // Click "Cetak Struk Rekap Kasir"
    const printSummaryBtn = page.getByRole('button', { name: 'Cetak Struk Rekap Kasir' });
    await printSummaryBtn.click();

    // Close CashierSummaryModal
    const closeSummaryBtn = page.getByRole('button', { name: 'Tutup' });
    await closeSummaryBtn.click();
    await expect(page.locator('text=Ringkasan Rekap Kasir (X-Report)')).not.toBeVisible();

    // 2. Open Settings Modal
    const settingsBtn = page.getByRole('button', { name: /Pengaturan/i });
    await settingsBtn.click();

    // Assert SettingsModal is visible
    await expect(page.locator('text=Pengaturan Sistem Kasir & Printer')).toBeVisible();
    await expect(page.locator('text=Informasi Toko & Nota Struk')).toBeVisible();
    await expect(page.locator('text=Routing Printer Kasir & Nota')).toBeVisible();

    // Save Settings
    const saveSettingsBtn = page.getByRole('button', { name: 'Simpan Pengaturan' });
    await saveSettingsBtn.click();

    // Assert success banner and modal auto-closing
    await expect(page.locator('text=Pengaturan Berhasil Disimpan!')).toBeVisible();
    await expect(page.locator('text=Pengaturan Sistem Kasir & Printer')).not.toBeVisible({ timeout: 5000 });
  });
});
