'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Receipt,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Tag,
  Store,
  CreditCard,
  Barcode,
  Check,
  Sun,
  Moon,
  User as UserIcon,
  UserCheck,
  FileText,
  TrendingUp,
  ShieldAlert,
  SlidersHorizontal,
  DollarSign,
  QrCode,
  Sparkles,
  Settings,
  Database,
  Repeat,
  LogOut,
  LogIn,
} from 'lucide-react';
import { Product, CartItem, Customer, ShiftSummary, PaymentMethod } from '@/types/pos';
import { MOCK_POS_USERS, POSUser } from '@/types/user';
import ReceiptModal from '@/components/ReceiptModal';
import LoginModal from '@/components/LoginModal';
import ItemMemoModal from '@/components/ItemMemoModal';
import VoidReasonModal from '@/components/VoidReasonModal';
import MemberValidationModal from '@/components/MemberValidationModal';
import CashierSummaryModal from '@/components/CashierSummaryModal';
import SettingsModal from '@/components/SettingsModal';
import { usePOSHardware } from '@/lib/usePOSHardware';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';

function HighlightText({ text, query, isDark }: { text: string; query: string; isDark: boolean }) {
  if (!query.trim()) return <span>{text}</span>;

  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className={`font-bold px-1 rounded-xs ${
              isDark ? 'bg-amber-400 text-slate-950' : 'bg-yellow-300 text-slate-900'
            }`}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export default function POSClient() {
  const [currentUser, setCurrentUser] = useState<POSUser | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingSelections, setPendingSelections] = useState<number>(0);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [transactionGen, setTransactionGen] = useState<number>(1);
  const transactionGenRef = useRef<number>(1);
  transactionGenRef.current = transactionGen;

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isGrosirMode, setIsGrosirMode] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [voucherCode, setVoucherCode] = useState('');

  const [posSettings, setPosSettings] = useState({
    storeName: 'Harmony Kitchenware',
    storeAddress: 'Jl. Panglima Sudirman No. 65',
    storePhone: '0851 7238 4707',
    receiptFooter: 'Terima kasih atas kunjungan Anda!',
    taxPercent: 0,
    servicePercent: 0,
    printerCashier: 'EPSON TM-T82 Thermal',
    printerKitchen: 'EPSON TM-U220 Dapur',
    printerBar: 'EPSON TM-U220 Bar',
    printerPantry: 'EPSON LX-300+II Pantry',
  });

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [memoItem, setMemoItem] = useState<CartItem | null>(null);
  const [voidItem, setVoidItem] = useState<CartItem | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cashPaid, setCashPaid] = useState<number | ''>('');
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastInvoiceNo, setLastInvoiceNo] = useState('');
  const [completedTransaction, setCompletedTransaction] = useState<any | null>(null);

  // Cart Width Resizing State (User-Scoped)
  const DEFAULT_CART_WIDTH = 420;
  const MIN_CART_WIDTH = 340;
  const MAX_CART_WIDTH = 680;
  const [cartWidth, setCartWidth] = useState<number>(DEFAULT_CART_WIDTH);

  useEffect(() => {
    const userKey = currentUser ? `user_${currentUser.id}` : 'guest';
    const saved = localStorage.getItem(`hk_pos_cart_width_${userKey}`);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN_CART_WIDTH && parsed <= MAX_CART_WIDTH) {
        setCartWidth(parsed);
        return;
      }
    }
    setCartWidth(DEFAULT_CART_WIDTH);
  }, [currentUser]);

  const updateCartWidth = (newWidth: number) => {
    const clamped = Math.min(MAX_CART_WIDTH, Math.max(MIN_CART_WIDTH, newWidth));
    setCartWidth(clamped);
    const userKey = currentUser ? `user_${currentUser.id}` : 'guest';
    localStorage.setItem(`hk_pos_cart_width_${userKey}`, clamped.toString());
  };

  const resetCartWidth = () => {
    setCartWidth(DEFAULT_CART_WIDTH);
    const userKey = currentUser ? `user_${currentUser.id}` : 'guest';
    localStorage.removeItem(`hk_pos_cart_width_${userKey}`);
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  const { isConnected, connectPrinter, disconnectPrinter, printText, playBeep } = usePOSHardware();

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const fetchProducts = useCallback(async (query = '') => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(query)}&limit=40`);
      const json = await res.json();
      if (json.success) {
        setProducts(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced Search Fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchProducts]);

  const [isInitialized, setIsInitialized] = useState(false);

  // Restore persistent state from localStorage on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('hk_pos_user');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
        setIsLoginOpen(false);
      }

      // Restore cart from hk_pos_cart_v2 with fallback to legacy hk_pos_cart
      const savedCartV2 = localStorage.getItem('hk_pos_cart_v2');
      if (savedCartV2) {
        const parsed: any[] = JSON.parse(savedCartV2);
        const migrated: CartItem[] = parsed.map((item: any, idx: number) => ({
          ...item,
          lineId: item.lineId || `line-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          isLegacy: item.isLegacy ?? (!item.quoteRef),
        }));
        setCart(migrated);
      } else {
        const savedCartLegacy = localStorage.getItem('hk_pos_cart');
        if (savedCartLegacy) {
          const parsed: any[] = JSON.parse(savedCartLegacy);
          const migrated: CartItem[] = parsed.map((item: any, idx: number) => ({
            ...item,
            lineId: item.lineId || `legacy-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
            isLegacy: true,
          }));
          setCart(migrated);
        }
      }

      const savedReceipt = localStorage.getItem('hk_pos_last_receipt');
      if (savedReceipt) {
        try {
          setCompletedTransaction(JSON.parse(savedReceipt));
        } catch {}
      }

      const savedMode = localStorage.getItem('hk_pos_grosir_mode');
      if (savedMode !== null) setIsGrosirMode(JSON.parse(savedMode));

      const savedCustomer = localStorage.getItem('hk_pos_customer');
      if (savedCustomer) setSelectedCustomer(JSON.parse(savedCustomer));
    } catch (e) {
      console.error('Failed to restore POS state from localStorage:', e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Sync currentUser to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    if (currentUser) {
      localStorage.setItem('hk_pos_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('hk_pos_user');
    }
  }, [currentUser, isInitialized]);

  // Sync cart to versioned localStorage
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('hk_pos_cart_v2', JSON.stringify(cart));
  }, [cart, isInitialized]);

  // Sync Grosir Mode to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('hk_pos_grosir_mode', JSON.stringify(isGrosirMode));
  }, [isGrosirMode, isInitialized]);

  // Sync selectedCustomer to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    if (selectedCustomer) {
      localStorage.setItem('hk_pos_customer', JSON.stringify(selectedCustomer));
    } else {
      localStorage.removeItem('hk_pos_customer');
    }
  }, [selectedCustomer, isInitialized]);

  // Auto focus search input on mount for barcode scanner readiness
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Unified fresh database selection pipeline
  const selectItem = useCallback(
    async ({ productId, barcode }: { productId?: string | number; barcode?: string }) => {
      const capturedMode = isGrosirMode ? 'grosir1' : 'retail';
      const capturedGen = transactionGenRef.current;
      const token = currentUser?.token;

      setPendingSelections((prev) => prev + 1);
      setSelectionError(null);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/products/quote', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            productId: productId ? Number(productId) : undefined,
            barcode: barcode ? String(barcode).trim() : undefined,
            mode: capturedMode,
          }),
        });

        const json = await res.json();

        // Drop response if transaction reset or user changed in-flight
        if (transactionGenRef.current !== capturedGen) {
          return;
        }

        if (!res.ok || !json.success) {
          playBeep('error');
          setSelectionError(json.error || 'Gagal mengambil harga produk dari database');
          return;
        }

        playBeep('success');
        const q = json.data;
        const quotedProduct: Product = {
          id: q.productId.toString(),
          name: q.name,
          barcode: q.barcode,
          category: q.category,
          uom: q.uom,
          priceRetail: q.priceType === 'retail' ? q.price : (q.priceRetail || q.price),
          priceGrosir1: q.priceType === 'grosir1' ? q.price : (q.priceGrosir1 || q.price),
          priceGrosir2: 0,
          priceGrosir3: 0,
          stock: q.stock,
        };

        setCart((prevCart) => {
          // Compatibility rule: merge ONLY IF same product ID, exact same unit price, same priceType, not voided, and no memo
          const matchIdx = prevCart.findIndex(
            (item) =>
              item.product.id === quotedProduct.id &&
              item.selectedPrice === q.price &&
              item.priceType === q.priceType &&
              !item.isVoided &&
              !item.memo
          );

          if (matchIdx > -1) {
            const updated = [...prevCart];
            updated[matchIdx] = {
              ...updated[matchIdx],
              quantity: updated[matchIdx].quantity + 1,
            };
            return updated;
          } else {
            const newLine: CartItem = {
              lineId: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              product: quotedProduct,
              quantity: 1,
              selectedPrice: q.price,
              priceType: q.priceType,
              quoteRef: q.quoteRef,
              isLegacy: false,
            };
            return [...prevCart, newLine];
          }
        });
      } catch (err: any) {
        console.error('Failed to quote product:', err);
        playBeep('error');
        setSelectionError('Gagal menghubungkan ke server untuk validasi harga.');
      } finally {
        setPendingSelections((prev) => Math.max(0, prev - 1));
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    },
    [isGrosirMode, currentUser, playBeep]
  );

  // Handle Barcode Scanner Enter Key (Matches EPPOS EP1400C behavior)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      const code = searchQuery.trim();
      setSearchQuery('');
      selectItem({ barcode: code });
    }
  };

  const handleToggleGrosir = () => {
    // Mode switch only affects future selections; existing cart lines are never repriced
    setIsGrosirMode((prev) => !prev);
  };

  // Quantity-only edit: does NOT recalculate or touch unit price or wholesale tiers
  const updateQty = (lineId: string, delta: number) => {
    setCart((prevCart) => {
      const idx = prevCart.findIndex((item) => item.lineId === lineId);
      if (idx === -1) return prevCart;

      const item = prevCart[idx];
      const newQty = item.quantity + delta;

      if (newQty <= 0) {
        return prevCart.filter((i) => i.lineId !== lineId);
      }

      const updated = [...prevCart];
      updated[idx] = {
        ...item,
        quantity: newQty,
      };

      return updated;
    });
  };

  const handleSaveMemo = (targetItem: CartItem, memo: string) => {
    setCart((prevCart) =>
      prevCart.map((item) => (item.lineId === targetItem.lineId ? { ...item, memo } : item))
    );
  };

  const handleConfirmVoid = (targetItem: CartItem, reason: string) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.lineId === targetItem.lineId ? { ...item, isVoided: true, voidReason: reason } : item
      )
    );
  };

  // Global Keyboard Shortcuts
  useKeyboardShortcuts({
    'F2': () => searchInputRef.current?.focus(),
    'F4': () => handleToggleGrosir(),
    'F8': () => setIsMemberModalOpen(true),
    'F9': () => { if (cart.length > 0 && pendingSelections === 0) handleCheckout(); },
    'F10': () => handleOpenSummaryModal(),
    'Escape': () => {
      setIsMemberModalOpen(false);
      setIsSummaryModalOpen(false);
      setIsSettingsModalOpen(false);
      setMemoItem(null);
      setVoidItem(null);
    }
  });

  // --- GLOBAL BARCODE SCANNER ---
  const barcodeBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentTime = Date.now();

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length > 2) {
          e.preventDefault();
          const scannedCode = barcodeBuffer.current;
          barcodeBuffer.current = '';
          selectItem({ barcode: scannedCode });
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (currentTime - lastKeyTime.current > 50) {
          barcodeBuffer.current = e.key;
        } else {
          barcodeBuffer.current += e.key;
        }
        lastKeyTime.current = currentTime;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectItem]);

  const activeCartItems = cart.filter((item) => !item.isVoided);
  const rawSubtotal = activeCartItems.reduce((sum, item) => sum + item.selectedPrice * item.quantity, 0);
  
  const memberDiscountPercent = selectedCustomer ? selectedCustomer.discountPercent : 0;
  const memberDiscountAmount = Math.round((rawSubtotal * memberDiscountPercent) / 100);
  const voucherDiscountAmount = voucherCode.trim().toUpperCase() === 'HARMONY10' ? 10000 : 0;
  const totalDiscount = memberDiscountAmount + voucherDiscountAmount;

  const afterDiscount = Math.max(0, rawSubtotal - totalDiscount);
  const taxAmount = Math.round((afterDiscount * posSettings.taxPercent) / 100);
  const serviceAmount = Math.round((afterDiscount * posSettings.servicePercent) / 100);

  const grandTotal = afterDiscount + taxAmount + serviceAmount;
  const totalItemsCount = activeCartItems.reduce((sum, item) => sum + item.quantity, 0);
  const numPaid = typeof cashPaid === 'number' ? cashPaid : grandTotal;
  const changeAmount = Math.max(0, numPaid - grandTotal);

  const setQuickPaid = (amount: number) => {
    setCashPaid(amount);
  };

  const handleCheckout = async () => {
    if (activeCartItems.length === 0 || pendingSelections > 0) return;

    const checkoutKey = `chk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setSelectionError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (currentUser?.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          checkoutKey,
          cashierName: currentUser?.name || 'Kasir',
          customerId: selectedCustomer?.id || null,
          customerName: selectedCustomer?.name || null,
          voucherCode,
          paymentMethod,
          cashPaid: numPaid,
          isGrosirMode,
          items: cart,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        playBeep('error');
        setSelectionError(json.error || 'Gagal memproses transaksi checkout');
        return;
      }

      playBeep('success');
      const savedTx = json.data;
      setCompletedTransaction(savedTx);
      setLastInvoiceNo(savedTx.invoiceNo);
      localStorage.setItem('hk_pos_last_receipt', JSON.stringify(savedTx));

      // Task 5.5: Automatic reset of only the completed generation's state
      setCart([]);
      setIsGrosirMode(false);
      setSelectedCustomer(null);
      setVoucherCode('');
      setCashPaid('');
      setTransactionGen((g) => g + 1);

      // Open receipt modal with the durable saved transaction representation
      setIsReceiptOpen(true);
    } catch (err: any) {
      console.error('Checkout error:', err);
      playBeep('error');
      setSelectionError('Gagal menghubungkan ke server saat proses checkout.');
    }
  };

  const handleClearCart = () => {
    setTransactionGen((g) => g + 1);
    setCart([]);
    setIsGrosirMode(false);
    setSelectedCustomer(null);
    setCashPaid('');
    setSelectionError(null);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    }
    setCurrentUser(null);
    localStorage.removeItem('hk_pos_user');
    setTransactionGen((g) => g + 1);
    setCart([]);
    setIsGrosirMode(false);
    setSelectedCustomer(null);
    setCashPaid('');
    setSelectionError(null);
    setIsLoginOpen(true);
  };

  const [shiftSummary, setShiftSummary] = useState<ShiftSummary>({
    cashierName: currentUser?.name || 'Kasir',
    startTime: '08:00',
    endTime: '20:30',
    totalTransactions: 0,
    grossSales: 0,
    totalDiscount: 0,
    netSales: 0,
    taxCollected: 0,
    serviceCollected: 0,
    paymentBreakdown: {
      cash: 0,
      edc: 0,
      transfer: 0,
      qris: 0,
      shopee: 0,
      tokopedia: 0,
    },
    expenses: 0,
    cashToDeposit: 0,
    cashInDrawer: 0,
    voidCount: 0,
    voidTotalAmount: 0,
  });

  const fetchShiftSummary = async () => {
    try {
      const res = await fetch(`/api/reports/shift-summary?cashierName=${encodeURIComponent(currentUser?.name || 'Kasir')}`);
      const json = await res.json();
      if (json.success && json.data) {
        setShiftSummary(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch shift summary from PostgreSQL:', err);
    }
  };

  const handleOpenSummaryModal = () => {
    fetchShiftSummary();
    setIsSummaryModalOpen(true);
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`h-screen w-screen flex flex-col font-sans overflow-hidden select-none transition-colors duration-200 ${
        isDark ? 'bg-[#070b14] text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* TOP NAVIGATION TOOLBAR */}
      <header
        className={`h-16 border-b px-6 flex items-center justify-between shrink-0 z-30 shadow-md transition-colors ${
          isDark
            ? 'border-slate-800/80 bg-slate-900/95 text-white'
            : 'border-slate-200 bg-white text-slate-900'
        }`}
      >
        {/* Left Branding */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-500 flex items-center justify-center shadow-lg shadow-emerald-500/25 ring-1 ring-white/20">
              <Store className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                {posSettings.storeName}
              </h1>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {posSettings.storeAddress}
              </p>
            </div>
          </div>

          <div className={`h-6 w-px hidden md:block ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

          {/* Clean Cashier Account Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLoginOpen(true)}
              className="cursor-pointer px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-500/25 active:scale-95 transition-all"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Kasir: {currentUser ? currentUser.name : 'Belum Login'}</span>
            </button>
          </div>
        </div>

        {/* Right Tools & Shortcuts Bar */}
        <div className="flex items-center gap-3">
          {/* Member / Customer Button (F8) */}
          <button
            onClick={() => setIsMemberModalOpen(true)}
            className={`cursor-pointer px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all active:scale-95 ${
              selectedCustomer
                ? 'bg-blue-500/20 text-blue-500 border-blue-500/40 hover:bg-blue-500/30'
                : isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>{selectedCustomer ? selectedCustomer.name : 'Member / Pelanggan'}</span>
            <kbd className={`hidden lg:inline text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
              isDark ? 'bg-slate-950/60 text-slate-300 border border-slate-700/60' : 'bg-slate-100 text-slate-700 border border-slate-300'
            }`}>
              F8
            </kbd>
          </button>

          {/* Last Saved Receipt Button */}
          {completedTransaction && (
            <button
              onClick={() => setIsReceiptOpen(true)}
              className={`cursor-pointer px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
                  : 'bg-white hover:bg-slate-100 text-amber-600 border-slate-300 shadow-xs'
              }`}
              title="Lihat atau Cetak Ulang Nota Terakhir"
            >
              <Receipt className="w-3.5 h-3.5 text-amber-500" />
              <span>Nota Terakhir</span>
            </button>
          )}

          {/* Daily Shift Summary Report Button (F10) */}
          <button
            onClick={handleOpenSummaryModal}
            className={`cursor-pointer px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all active:scale-95 ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Laporan Shift</span>
            <kbd className={`hidden lg:inline text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
              isDark ? 'bg-slate-950/60 text-slate-300 border border-slate-700/60' : 'bg-slate-100 text-slate-700 border border-slate-300'
            }`}>
              F10
            </kbd>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className={`cursor-pointer p-2 rounded-xl border transition-all active:scale-95 ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title="Pengaturan POS & Printer"
          >
            <Settings className="w-4 h-4 text-sky-400" />
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className={`cursor-pointer p-2 rounded-xl border transition-all active:scale-95 ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Mode Retail vs Mode Grosir 1 Switch (affects future selections only) */}
          <button
            onClick={handleToggleGrosir}
            title="Pilih mode harga untuk pemilihan berikutnya"
            className={`cursor-pointer px-3 py-1.5 rounded-xl font-black text-xs border flex items-center gap-2 transition-all shadow-md active:scale-95 ${
              isGrosirMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400 shadow-amber-500/20'
                : isDark
                ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>{isGrosirMode ? 'GROSIR 1 (F4)' : 'RETAIL (F4)'}</span>
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE GRID */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: PRODUCTS & SEARCH */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800/60 overflow-hidden">
          {/* Search Bar (Matches POS repo _Ed_Barcode / _Ed_BarcodeGrosir) */}
          <div
            className={`p-4 border-b shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Cari Produk / Scan Barcode (F2)..."
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm font-medium border outline-none transition-all ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-amber-500 ring-amber-500/20'
                    : 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                }`}
              />
              <kbd className={`absolute right-3 top-3 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-200 text-slate-700 border border-slate-300'
              }`}>
                F2
              </kbd>
            </div>
          </div>

          {/* Actionable Selection Error Banner */}
          {selectionError && (
            <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{selectionError}</span>
              </div>
              <button
                onClick={() => setSelectionError(null)}
                className="cursor-pointer text-rose-400 hover:text-rose-200 text-xs font-bold px-2 py-0.5"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Product Grid */}
          <div className="flex-1 p-4 overflow-y-auto">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
                <span className="text-xs font-semibold">Memuat Data dari PostgreSQL...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                <Barcode className="w-12 h-12 stroke-1 text-slate-600" />
                <span className="text-sm font-semibold">Produk tidak ditemukan</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {products.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => selectItem({ productId: prod.id })}
                    className={`cursor-pointer p-3.5 rounded-2xl border flex flex-col justify-between transition-all duration-200 group hover:scale-[1.02] active:scale-95 shadow-sm ${
                      isDark
                        ? 'bg-slate-900/80 border-slate-800/80 hover:border-amber-500/60 hover:bg-slate-800/80 text-slate-100'
                        : 'bg-white border-slate-200 hover:border-amber-500/60 hover:shadow-md text-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className={`${isDark ? 'text-slate-400' : 'text-slate-600'} font-mono truncate max-w-[100px]`}>
                          {prod.barcode}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                            prod.stock > 5
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : prod.stock > 0
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          Stok: {prod.stock}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm leading-snug line-clamp-2 mb-2 group-hover:text-amber-400 transition-colors">
                        <HighlightText text={prod.name} query={searchQuery} isDark={isDark} />
                      </h3>
                    </div>

                    <div className="pt-2 border-t border-slate-800/40 flex items-end justify-between mt-2">
                      <div>
                        <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'} block font-medium`}>
                          {isGrosirMode ? 'Harga Grosir 1' : 'Harga Retail'}
                        </span>
                        <span className="font-extrabold text-sm text-amber-500">
                          Rp{' '}
                          {(isGrosirMode ? prod.priceGrosir1 : prod.priceRetail).toLocaleString(
                            'id-ID'
                          )}
                        </span>
                      </div>
                      <div className="cursor-pointer w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors flex items-center justify-center">
                        <Plus className="w-4 h-4 stroke-[3]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RESIZER HANDLE BETWEEN PRODUCT GRID & CART */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Ubah lebar keranjang"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startW = cartWidth;
            const onMove = (moveEv: MouseEvent) => {
              updateCartWidth(startW + (startX - moveEv.clientX));
            };
            const onUp = () => {
              window.removeEventListener('mousemove', onMove);
              window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          }}
          className={`w-1.5 hover:w-2 -mr-1.5 z-20 cursor-col-resize transition-all shrink-0 select-none group relative ${
            isDark ? 'hover:bg-amber-500/80 bg-transparent' : 'hover:bg-amber-400 bg-transparent'
          }`}
          title="Geser untuk mengatur lebar panel keranjang"
        >
          <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
        </div>

        {/* RIGHT COLUMN: CART & CHECKOUT */}
        <div
          style={{ width: `${cartWidth}px`, minWidth: `${MIN_CART_WIDTH}px`, maxWidth: `${MAX_CART_WIDTH}px` }}
          className={`border-l flex flex-col shrink-0 overflow-hidden ${
            isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white'
          }`}
        >
          {/* Cart Header */}
          <div
            className={`p-4 border-b flex items-center justify-between shrink-0 gap-2 ${
              isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-base truncate">Keranjang ({isGrosirMode ? 'Grosir' : 'Retail'})</h2>
                <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {activeCartItems.length} Item • Total Qty: {totalItemsCount}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Cart Width Controls */}
              <div className="flex items-center gap-1 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => updateCartWidth(cartWidth - 30)}
                  className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-colors ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                  title="Perkecil panel keranjang (-30px)"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => updateCartWidth(cartWidth + 30)}
                  className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-colors ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                  title="Perlebar panel keranjang (+30px)"
                >
                  +
                </button>
                {cartWidth !== DEFAULT_CART_WIDTH && (
                  <button
                    type="button"
                    onClick={resetCartWidth}
                    className="px-1.5 h-6 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-[10px] cursor-pointer transition-colors"
                    title="Reset lebar panel keranjang"
                  >
                    Reset
                  </button>
                )}
              </div>

              {cart.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="cursor-pointer text-xs font-semibold text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 active:scale-95 transition-colors ml-1"
                >
                  Kosongkan
                </button>
              )}
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {cart.length === 0 ? (
              <div className={`h-full flex flex-col items-center justify-center ${isDark ? 'text-slate-500' : 'text-slate-600'} gap-2 italic`}>
                <ShoppingCart className={`w-12 h-12 stroke-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                <span className="text-sm font-semibold">Keranjang masih kosong</span>
                <span className="text-xs">Klik produk di kiri atau scan barcode untuk menambahkan</span>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.lineId}
                  className={`p-3 rounded-2xl border transition-all ${
                    item.isVoided
                      ? 'opacity-40 line-through border-rose-800/40 bg-rose-950/10'
                      : isDark
                      ? 'bg-slate-950/60 border-slate-800'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-900'} break-words whitespace-normal leading-snug`}>
                        {item.product.name}
                      </h4>
                      <div className={`flex items-center gap-2 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
                        <span>Rp {item.selectedPrice.toLocaleString('id-ID')}</span>
                        {item.priceType !== 'retail' && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold">
                            {item.priceType.toUpperCase()}
                          </span>
                        )}
                        {item.isLegacy && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400 text-[9px] font-medium">
                            LEGACY
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="font-extrabold text-sm text-amber-500 shrink-0">
                      Rp {(item.selectedPrice * item.quantity).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Memo Display */}
                  {item.memo && (
                    <div className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg mb-2 italic">
                      Catatan: {item.memo}
                    </div>
                  )}

                  {/* Item Actions Toolbar */}
                  {!item.isVoided && (
                    <div className={`flex items-center justify-between pt-2 border-t ${isDark ? 'border-slate-800/40' : 'border-slate-100'}`}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMemoItem(item)}
                          className={`cursor-pointer px-2 py-1 rounded-lg ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'} text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all`}
                        >
                          <FileText className="w-3 h-3 text-amber-500" />
                          <span>Note</span>
                        </button>
                        <button
                          onClick={() => setVoidItem(item)}
                          className="cursor-pointer px-2 py-1 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          <span>Void</span>
                        </button>
                      </div>

                      {/* Qty Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(item.lineId, -1)}
                          className={`cursor-pointer w-6 h-6 rounded-lg ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'} flex items-center justify-center font-bold text-xs active:scale-95 transition-all`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-xs w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.lineId, 1)}
                          className={`cursor-pointer w-6 h-6 rounded-lg ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'} flex items-center justify-center font-bold text-xs active:scale-95 transition-all`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Checkout & Summary Panel */}
          <div
            className={`p-4 border-t space-y-3 shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
            }`}
          >
            {/* Customer Banner */}
            {selectedCustomer && (
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between text-xs">
                <span className="font-bold text-blue-500">
                  Pelanggan: {selectedCustomer.name}
                </span>
                <span className="text-[10px] bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded-full font-bold">
                  Diskon {selectedCustomer.discountPercent}%
                </span>
              </div>
            )}

            {/* Summary Lines */}
            <div className="space-y-1 text-xs">
              <div className={`flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-700'} font-medium`}>
                <span>Subtotal</span>
                <span>Rp {rawSubtotal.toLocaleString('id-ID')}</span>
              </div>

              {totalDiscount > 0 && (
                <div className="flex justify-between text-rose-500 font-bold">
                  <span>Diskon Member / Voucher</span>
                  <span>- Rp {totalDiscount.toLocaleString('id-ID')}</span>
                </div>
              )}

              {taxAmount > 0 && (
                <div className={`flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-700'} font-medium`}>
                  <span>Pajak ({posSettings.taxPercent}%)</span>
                  <span>Rp {taxAmount.toLocaleString('id-ID')}</span>
                </div>
              )}

              {serviceAmount > 0 && (
                <div className={`flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-700'} font-medium`}>
                  <span>Service ({posSettings.servicePercent}%)</span>
                  <span>Rp {serviceAmount.toLocaleString('id-ID')}</span>
                </div>
              )}

              <div className={`flex justify-between text-base font-black pt-1 border-t ${isDark ? 'text-slate-100 border-slate-800' : 'text-slate-900 border-slate-200'}`}>
                <span>Total Tagihan</span>
                <span className="text-amber-500">Rp {grandTotal.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-700'} mb-1.5 block`}>
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['CASH', 'EDC', 'TRANSFER', 'QRIS', 'SHOPEE', 'TOKOPEDIA'] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    onClick={() => {
                      setPaymentMethod(method);
                      if (method !== 'CASH') {
                        setCashPaid(grandTotal);
                      }
                    }}
                    className={`cursor-pointer py-2 rounded-xl text-xs font-black border transition-all active:scale-95 ${
                      paymentMethod === method
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : isDark
                        ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Cash Presets */}
            <div>
              <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-700'} mb-1.5 block`}>
                Nominal Bayar Cepat
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[20000, 50000, 100000, grandTotal].map((amt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuickPaid(amt)}
                    className={`cursor-pointer py-1.5 rounded-lg text-[11px] font-bold border transition-all active:scale-95 ${
                      cashPaid === amt
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {idx === 3 ? 'Pas' : `Rp ${amt / 1000}k`}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Input */}
            <div className="flex gap-2">
              <input
                type="number"
                value={cashPaid}
                onChange={(e) => setCashPaid(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Jumlah Bayar Tunai (Rp)..."
                className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border outline-none transition-all ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-amber-500'
                    : 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                }`}
              />
              <div className={`flex items-center px-3 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                isDark
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700'
              }`}>
                Kembali: Rp {changeAmount.toLocaleString('id-ID')}
              </div>
            </div>

            {/* Checkout Button (F9) */}
            <button
              onClick={handleCheckout}
              disabled={activeCartItems.length === 0 || pendingSelections > 0}
              className="cursor-pointer w-full py-3 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:from-amber-400 hover:to-yellow-400 active:scale-98 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {pendingSelections > 0 ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memvalidasi Harga ({pendingSelections})...</span>
                </>
              ) : (
                <>
                  <Receipt className="w-5 h-5" />
                  <span>Bayar & Simpan (F9)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ALL MODALS INTEGRATED */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={currentUser ? () => setIsLoginOpen(false) : undefined}
        onSelectUser={(user) => {
          setCurrentUser(user);
          setIsLoginOpen(false);
          setTimeout(() => searchInputRef.current?.focus(), 100);
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <MemberValidationModal
        isOpen={isMemberModalOpen}
        isDark={isDark}
        selectedCustomer={selectedCustomer}
        onClose={() => setIsMemberModalOpen(false)}
        onSelectCustomer={(cust) => setSelectedCustomer(cust)}
      />

      <ItemMemoModal
        isOpen={!!memoItem}
        isDark={isDark}
        item={memoItem}
        onClose={() => setMemoItem(null)}
        onSaveMemo={handleSaveMemo}
      />

      <VoidReasonModal
        isOpen={!!voidItem}
        isDark={isDark}
        item={voidItem}
        onClose={() => setVoidItem(null)}
        onConfirmVoid={handleConfirmVoid}
      />

      <CashierSummaryModal
        isOpen={isSummaryModalOpen}
        isDark={isDark}
        currentUser={currentUser}
        onClose={() => setIsSummaryModalOpen(false)}
        isConnected={isConnected}
        onPrintText={printText}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        isDark={isDark}
        settings={posSettings}
        onClose={() => setIsSettingsModalOpen(false)}
        onSaveSettings={(newSet) => setPosSettings(newSet)}
        isConnected={isConnected}
        onConnectPrinter={connectPrinter}
        onDisconnectPrinter={disconnectPrinter}
      />

      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        transaction={completedTransaction}
        cart={cart}
        cashierName={currentUser?.name || 'Kasir'}
        cashPaid={typeof cashPaid === 'number' ? cashPaid : grandTotal}
        invoiceNo={completedTransaction?.invoiceNo || lastInvoiceNo || 'DRAFT'}
        orderType={isGrosirMode ? 'Grosir' : 'Retail'}
        customer={selectedCustomer}
        paymentMethod={paymentMethod}
        discountAmount={totalDiscount}
        isConnected={isConnected}
        onPrintText={printText}
      />
    </div>
  );
}
