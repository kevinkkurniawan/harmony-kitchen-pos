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
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const searchInputRef = useRef<HTMLInputElement>(null);

  const { isConnected, connectPrinter, disconnectPrinter, printText, playBeep } = usePOSHardware();

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const fetchProducts = useCallback(async (query = '', showRefreshAnimation = false) => {
    if (showRefreshAnimation) setIsRefreshing(true);
    else setIsLoading(true);

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
      setIsRefreshing(false);
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      const savedUser = localStorage.getItem('hk_pos_user');
      if (savedUser) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentUser(JSON.parse(savedUser));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoginOpen(false);
      }

      const savedCart = localStorage.getItem('hk_pos_cart');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedMode = localStorage.getItem('hk_pos_grosir_mode');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedMode !== null) setIsGrosirMode(JSON.parse(savedMode));

      const savedCustomer = localStorage.getItem('hk_pos_customer');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedCustomer) setSelectedCustomer(JSON.parse(savedCustomer));
    } catch (e) {
      console.error('Failed to restore POS state from localStorage:', e);
    } finally {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // Sync cart to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('hk_pos_cart', JSON.stringify(cart));
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

  // Handle Barcode Scanner Enter Key (Matches EPPOS EP1400C behavior)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      const exactMatch =
        products.find(
          (p) => p.barcode.toLowerCase() === searchQuery.trim().toLowerCase()
        ) || (products.length === 1 ? products[0] : null);

      if (exactMatch) {
        addToCart(exactMatch);
        setSearchQuery('');
      } else {
        playBeep('error');
      }
    }
  };

  // Global Keyboard Shortcuts
  useKeyboardShortcuts({
    'F2': (e) => searchInputRef.current?.focus(),
    'F4': (e) => handleToggleGrosir(),
    'F8': (e) => setIsMemberModalOpen(true),
    'F9': (e) => { if (cart.length > 0) handleCheckout(); },
    'F10': (e) => handleOpenSummaryModal(),
    'Escape': (e) => {
      setIsMemberModalOpen(false);
      setIsSummaryModalOpen(false);
      setIsSettingsModalOpen(false);
      setMemoItem(null);
      setVoidItem(null);
    }
  });

  const handleToggleGrosir = () => {
    const nextGrosirState = !isGrosirMode;
    setIsGrosirMode(nextGrosirState);

    setCart((prevCart) =>
      prevCart.map((item) => {
        let price = item.product.priceRetail;
        let priceType: CartItem['priceType'] = 'retail';

        if (nextGrosirState) {
          if (item.quantity >= 60) {
            price = item.product.priceGrosir3;
            priceType = 'grosir3';
          } else if (item.quantity >= 12) {
            price = item.product.priceGrosir2;
            priceType = 'grosir2';
          } else {
            price = item.product.priceGrosir1;
            priceType = 'grosir1';
          }
        }

        return {
          ...item,
          selectedPrice: price,
          priceType,
        };
      })
    );
  };

  const addToCart = useCallback((product: Product) => {
    playBeep('success');
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((i) => i.product.id === product.id && !i.isVoided);
      let selectedPrice = product.priceRetail;
      let priceType: CartItem['priceType'] = 'retail';

      if (existingIndex > -1) {
        const updated = [...prevCart];
        const newQty = updated[existingIndex].quantity + 1;

        if (isGrosirMode) {
          if (newQty >= 60) {
            selectedPrice = product.priceGrosir3;
            priceType = 'grosir3';
          } else if (newQty >= 12) {
            selectedPrice = product.priceGrosir2;
            priceType = 'grosir2';
          } else {
            selectedPrice = product.priceGrosir1;
            priceType = 'grosir1';
          }
        }

        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          selectedPrice,
          priceType,
        };
        return updated;
      } else {
        if (isGrosirMode) {
          selectedPrice = product.priceGrosir1;
          priceType = 'grosir1';
        }
        return [
          ...prevCart,
          {
            product,
            quantity: 1,
            selectedPrice,
            priceType,
          },
        ];
      }
    });
  }, [isGrosirMode, playBeep]);

  const updateQty = (index: number, delta: number) => {
    setCart((prevCart) => {
      const updated = [...prevCart];
      const newQty = updated[index].quantity + delta;

      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }

      const product = updated[index].product;
      let selectedPrice = product.priceRetail;
      let priceType: CartItem['priceType'] = 'retail';

      if (isGrosirMode) {
        if (newQty >= 60) {
          selectedPrice = product.priceGrosir3;
          priceType = 'grosir3';
        } else if (newQty >= 12) {
          selectedPrice = product.priceGrosir2;
          priceType = 'grosir2';
        } else {
          selectedPrice = product.priceGrosir1;
          priceType = 'grosir1';
        }
      }

      updated[index] = {
        ...updated[index],
        quantity: newQty,
        selectedPrice,
        priceType,
      };

      return updated;
    });
  };

  const handleSaveMemo = (targetItem: CartItem, memo: string) => {
    setCart((prevCart) =>
      prevCart.map((item) => (item === targetItem ? { ...item, memo } : item))
    );
  };

  const handleConfirmVoid = (targetItem: CartItem, reason: string) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item === targetItem ? { ...item, isVoided: true, voidReason: reason } : item
      )
    );
  };

  // --- GLOBAL BARCODE SCANNER ---
  const barcodeBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Abaikan jika user sedang mengetik di dalam input field (misal search box, note, modal)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentTime = Date.now();
      
      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length > 2) { // Asumsi barcode lebih dari 2 karakter
          e.preventDefault();
          const scannedCode = barcodeBuffer.current;
          barcodeBuffer.current = '';
          
          const exactMatch = products.find((p) => p.barcode.toLowerCase() === scannedCode.toLowerCase());
          
          if (exactMatch) {
            addToCart(exactMatch);
          } else {
            playBeep('error');
          }
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) { 
        // Scanner mengetik sangat cepat (biasanya < 30ms antar karakter)
        if (currentTime - lastKeyTime.current > 50) {
          barcodeBuffer.current = e.key; // Reset jika lebih dari 50ms (berarti ketikan jari manusia)
        } else {
          barcodeBuffer.current += e.key; // Tambah karakter ke buffer scanner
        }
        lastKeyTime.current = currentTime;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [products, addToCart, playBeep]);

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
    if (activeCartItems.length === 0) return;

    // eslint-disable-next-line react-hooks/purity
    const invNo = `INV-${Date.now().toString().slice(-6)}`;
    setLastInvoiceNo(invNo);

    try {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNo: invNo,
          cashierName: currentUser?.name || 'Kasir',
          mode: isGrosirMode ? 'Grosir' : 'Retail',
          customerId: selectedCustomer?.id || null,
          subtotal: rawSubtotal,
          discountAmount: totalDiscount,
          taxAmount,
          serviceCharge: serviceAmount,
          total: grandTotal,
          paymentMethod,
          cashPaid: numPaid,
          change: changeAmount,
          isGrosirMode,
          items: cart,
        }),
      });
      fetchProducts(searchQuery);
    } catch (e) {
      console.error('Failed to post transaction to PostgreSQL:', e);
    }

    setIsReceiptOpen(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('hk_pos_user');
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

          {/* Theme & Refresh */}
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

          <button
            onClick={() => fetchProducts(searchQuery, true)}
            disabled={isRefreshing}
            className={`cursor-pointer p-2 rounded-xl border transition-all active:scale-95 disabled:opacity-50 ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            <RefreshCw className={`w-4 h-4 text-sky-500 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Mode Retail vs Mode Grosir Toggle */}
          <button
            onClick={handleToggleGrosir}
            className={`cursor-pointer px-3 py-1.5 rounded-xl font-black text-xs border flex items-center gap-2 transition-all shadow-md active:scale-95 ${
              isGrosirMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400 shadow-amber-500/20'
                : isDark
                ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>{isGrosirMode ? 'MODE GROSIR (F4)' : 'MODE RETAIL (F4)'}</span>
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
                    onClick={() => addToCart(prod)}
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
                          {isGrosirMode ? 'Harga Grosir (Min 12)' : 'Harga Retail'}
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

        {/* RIGHT COLUMN: CART & CHECKOUT */}
        <div
          className={`w-96 lg:w-[420px] border-l flex flex-col shrink-0 overflow-hidden ${
            isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white'
          }`}
        >
          {/* Cart Header */}
          <div
            className={`p-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base">Keranjang Transaksi ({isGrosirMode ? 'Grosir' : 'Retail'})</h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {activeCartItems.length} Item Unique • Total Qty: {totalItemsCount}
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="cursor-pointer text-xs font-semibold text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 active:scale-95 transition-colors"
              >
                Kosongkan
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {cart.length === 0 ? (
              <div className={`h-full flex flex-col items-center justify-center ${isDark ? 'text-slate-500' : 'text-slate-600'} gap-2 italic`}>
                <ShoppingCart className={`w-12 h-12 stroke-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                <span className="text-sm font-semibold">Keranjang masih kosong</span>
                <span className="text-xs">Klik produk di kiri untuk menambahkan</span>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border transition-all ${
                    item.isVoided
                      ? 'opacity-40 line-through border-rose-800/40 bg-rose-950/10'
                      : isDark
                      ? 'bg-slate-950/60 border-slate-800'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-900'} line-clamp-1`}>
                        {item.product.name}
                      </h4>
                      <div className={`flex items-center gap-2 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
                        <span>Rp {item.selectedPrice.toLocaleString('id-ID')}</span>
                        {isGrosirMode && (
                          <span className="px-1.5 py-0.2 rounded-xs bg-amber-500/10 text-amber-400 text-[10px] font-bold">
                            {item.priceType.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="font-extrabold text-sm text-amber-500">
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
                          onClick={() => updateQty(idx, -1)}
                          className={`cursor-pointer w-6 h-6 rounded-lg ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'} flex items-center justify-center font-bold text-xs active:scale-95 transition-all`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-xs w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(idx, 1)}
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
              disabled={activeCartItems.length === 0}
              className="cursor-pointer w-full py-3 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:from-amber-400 hover:to-yellow-400 active:scale-98 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Receipt className="w-5 h-5" />
              <span>Bayar & Simpan (F9)</span>
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
        summary={shiftSummary}
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
        cart={cart}
        cashierName={currentUser?.name || 'Kasir'}
        cashPaid={numPaid}
        invoiceNo={lastInvoiceNo || 'DRAFT'}
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
