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
  FileLock,
  Banknote,
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
import { PaymentModal } from '@/components/PaymentModal';
import { AlertDialog } from '@/components/AlertDialog';
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
  const [scanQty, setScanQty] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>('light');
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
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertTitle, setAlertTitle] = useState('Perhatian');
  const [alertConfirmFn, setAlertConfirmFn] = useState<(() => void) | undefined>(undefined);
  const [lastInvoiceNo, setLastInvoiceNo] = useState('');
  
  const activeTransactionIdRef = useRef<number | null>(null);
  const [activeTransactionNo, setActiveTransactionNo] = useState<string | null>(null);

  const [lastReceiptData, setLastReceiptData] = useState<{
    cart: CartItem[];
    cashPaid: number;
    invoiceNo: string;
    orderType: string;
    customer: Customer | null;
    paymentMethod: PaymentMethod;
    discountAmount: number;
  } | null>(null);

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

  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

      const savedTransactionId = localStorage.getItem('hk_pos_transaction_id');
      if (savedTransactionId) activeTransactionIdRef.current = Number(savedTransactionId);

      const savedTransactionNo = localStorage.getItem('hk_pos_transaction_no');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedTransactionNo) setActiveTransactionNo(savedTransactionNo);
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

  // Sync active transaction to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    if (activeTransactionIdRef.current) {
      localStorage.setItem('hk_pos_transaction_id', activeTransactionIdRef.current.toString());
    } else {
      localStorage.removeItem('hk_pos_transaction_id');
    }
    
    if (activeTransactionNo) {
      localStorage.setItem('hk_pos_transaction_no', activeTransactionNo);
    } else {
      localStorage.removeItem('hk_pos_transaction_no');
    }
  }, [activeTransactionNo, isInitialized]);

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
        // Check database if not found locally
        fetch(`/api/products/scan?barcode=${encodeURIComponent(searchQuery.trim())}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data) {
              addToCart(data.data);
              setSearchQuery('');
            } else {
              playBeep('error');
            }
          })
          .catch(err => {
            console.error('Search barcode lookup failed:', err);
            playBeep('error');
          });
      }
    }
  };

  // Global Keyboard Shortcuts
  useKeyboardShortcuts({
    'F2': (e) => searchInputRef.current?.focus(),
    'F4': (e) => handleToggleGrosir(),
    'F8': (e) => setIsMemberModalOpen(true),
    'F9': (e) => { if (cart.length > 0) setIsPaymentModalOpen(true); },
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

      let newQty = scanQty;
      if (existingIndex > -1) {
        newQty = prevCart[existingIndex].quantity + scanQty;
      }

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

      // Fire and forget API call for active transaction sync
      (async () => {
        try {
          if (!activeTransactionIdRef.current) {
            const res = await fetch('/api/transactions/active', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cashierName: currentUser?.name || 'Kasir',
                isGrosirMode,
                customerId: selectedCustomer?.id || null,
                product,
                quantity: scanQty,
                selectedPrice,
              })
            });
            const json = await res.json();
            if (json.success && json.data) {
              activeTransactionIdRef.current = json.data.id;
              setActiveTransactionNo(json.data.salesposno);
            }
          } else {
            await fetch(`/api/transactions/active/${activeTransactionIdRef.current}/items`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cashierName: currentUser?.name || 'Kasir',
                product,
                quantity: scanQty,
                selectedPrice,
              })
            });
          }
        } catch (e) {
          console.error('Failed to sync active transaction', e);
        }
      })();

      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          selectedPrice,
          priceType,
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            product,
            quantity: scanQty,
            selectedPrice,
            priceType,
          },
        ];
      }
    });
    setScanQty(1); // Reset to 1 after adding to cart
  }, [isGrosirMode, playBeep, scanQty, currentUser, selectedCustomer]);

  const updateQty = (index: number, delta: number) => {
    setCart((prevCart) => {
      const updated = [...prevCart];
      const newQty = updated[index].quantity + delta;
      const product = updated[index].product;

      let selectedPrice = product.priceRetail;
      let priceType: CartItem['priceType'] = 'retail';

      if (newQty > 0 && isGrosirMode) {
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

      // Sync with DB
      if (activeTransactionIdRef.current) {
        (async () => {
          try {
            await fetch(`/api/transactions/active/${activeTransactionIdRef.current}/items`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cashierName: currentUser?.name || 'Kasir',
                product,
                quantity: newQty,
                selectedPrice,
              })
            });
          } catch (e) {
            console.error('Failed to sync item update', e);
          }
        })();
      }

      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
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
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Abaikan jika user sedang mengetik di dalam input field (misal search box, note, modal)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Jangan cegah shortcut sistem atau navigasi
      if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) {
        return;
      }
      
      // Jika scanner mulai mengetik, segera fokus ke search box dan tambahkan karakternya
      if (document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        setSearchQuery(prev => prev + e.key);
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

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

  const handleCheckout = async (finalCashPaid: number, finalPaymentMethod: string) => {
    if (activeCartItems.length === 0) return;

    setCashPaid(finalCashPaid);
    setPaymentMethod(finalPaymentMethod as any);
    const changeAmt = Math.max(0, finalCashPaid - grandTotal);

    const currentInvNo = activeTransactionNo || `INV-${Date.now().toString().slice(-6)}`;
    setLastInvoiceNo(currentInvNo);

    setLastReceiptData({
      cart: [...cart],
      cashPaid: finalCashPaid,
      invoiceNo: currentInvNo,
      orderType: isGrosirMode ? 'Grosir' : 'Retail',
      customer: selectedCustomer,
      paymentMethod: finalPaymentMethod as any,
      discountAmount: totalDiscount,
    });

    try {
      if (activeTransactionIdRef.current) {
        await fetch(`/api/transactions/active/${activeTransactionIdRef.current}/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cashierName: currentUser?.name || 'Kasir',
            subtotal: rawSubtotal,
            discountAmount: totalDiscount,
            total: grandTotal,
            paymentMethod: finalPaymentMethod,
            cashPaid: finalCashPaid,
            notes: '',
          }),
        });
      } else {
        // Fallback if no active transaction was created
        await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceNo: currentInvNo,
            cashierName: currentUser?.name || 'Kasir',
            mode: isGrosirMode ? 'Grosir' : 'Retail',
            customerId: selectedCustomer?.id || null,
            subtotal: rawSubtotal,
            discountAmount: totalDiscount,
            taxAmount,
            serviceCharge: serviceAmount,
            total: grandTotal,
            paymentMethod: finalPaymentMethod,
            cashPaid: finalCashPaid,
            change: changeAmt,
            isGrosirMode,
            items: cart,
          }),
        });
      }
      
      // Clear active transaction
      activeTransactionIdRef.current = null;
      setActiveTransactionNo(null);
      setCart([]);
      
      fetchProducts(searchQuery);
    } catch (e) {
      console.error('Failed to post transaction to PostgreSQL:', e);
    }

    setIsPaymentModalOpen(false);
    setIsReceiptOpen(true);
  };

  const handleClearCart = () => {
    setAlertTitle('Batalkan Transaksi');
    setAlertMessage('Apakah Anda yakin ingin membatalkan transaksi ini? Semua item akan dihapus.');
    setAlertConfirmFn(() => async () => {
      if (activeTransactionIdRef.current) {
        try {
          await fetch(`/api/transactions/active/${activeTransactionIdRef.current}`, {
            method: 'DELETE',
          });
        } catch (e) {
          console.error('Failed to void transaction', e);
        }
      }
      activeTransactionIdRef.current = null;
      setActiveTransactionNo(null);
      setCart([]);
      setIsAlertOpen(false);
      setAlertConfirmFn(undefined);
    });
    setIsAlertOpen(true);
  };

  const handleConfirmRemoveItem = (item: CartItem, originalIdx: number) => {
    setAlertTitle('Hapus Item');
    setAlertMessage(`Apakah Anda yakin ingin menghapus ${item.product.name} dari keranjang?`);
    setAlertConfirmFn(() => () => {
      updateQty(originalIdx, -item.quantity);
      setIsAlertOpen(false);
      setAlertConfirmFn(undefined);
    });
    setIsAlertOpen(true);
  };

  const handleLogout = () => {
    setAlertTitle('Konfirmasi Logout');
    setAlertMessage('Apakah Anda yakin ingin keluar dari sistem kasir?');
    setAlertConfirmFn(() => () => {
      setCurrentUser(null);
      localStorage.removeItem('hk_pos_user');
      setIsLoginOpen(true);
      setIsAlertOpen(false);
    });
    setIsAlertOpen(true);
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
      edcBca: 0,
      edcMandiri: 0,
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

  const [isFetchingSummary, setIsFetchingSummary] = useState(false);

  const handleOpenSummaryModal = async () => {
    setIsFetchingSummary(true);
    await fetchShiftSummary();
    setIsFetchingSummary(false);
    setIsSummaryModalOpen(true);
  };

  const isDark = theme === 'dark';

  return (
    <div className={`h-screen w-screen flex flex-col font-sans overflow-hidden select-none transition-colors duration-200 ${isDark ? 'bg-[#1e1e1e] text-slate-100' : 'bg-[#f0f0f0] text-slate-900'}`}>
      {/* TOP NAVIGATION TOOLBAR */}
      <header className={`h-12 border-b flex items-center justify-between shrink-0 shadow-sm text-sm font-semibold px-4 ${isDark ? 'border-slate-800 bg-[#2d2d2d] text-white' : 'border-slate-300 bg-[#e0e0e0] text-slate-800'}`}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-amber-600">
            <FileText className="w-4 h-4" />
            <span>Mode {isGrosirMode ? 'Grosir' : 'Retail'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Grosir Request</span>
            <button 
              onClick={handleToggleGrosir}
              className={`cursor-pointer w-10 h-5 rounded-full relative transition-colors ${isGrosirMode ? 'bg-amber-500' : 'bg-slate-400'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isGrosirMode ? 'translate-x-5' : ''}`} />
            </button>
            <span className="text-slate-500">Retail</span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-slate-500">
          <button 
            onClick={handleOpenSummaryModal}
            disabled={isFetchingSummary}
            className={`cursor-pointer flex items-center gap-1.5 hover:text-emerald-500 transition-colors disabled:opacity-50 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
            title="Laporan / Summary Kasir (F10)"
          >
            {isFetchingSummary ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFetchingSummary ? 'Memuat...' : 'Laporan'}</span>
          </button>
          <span>{currentTime ? currentTime.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '...'}</span>
          <span>{currentTime ? currentTime.toLocaleTimeString('id-ID') : '...'}</span>
          <button onClick={handleLogout} className="cursor-pointer flex items-center gap-1 text-rose-500 hover:text-rose-600 transition-colors">
            <span className="font-bold">X</span> Keluar
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE GRID */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: MAIN POS TABLE */}
        <div className={`flex-1 flex flex-col min-w-0 border-r ${isDark ? 'border-slate-700 bg-[#1e1e1e]' : 'border-slate-300 bg-[#f9fafb]'}`}>
          <div className={`p-4 flex justify-between items-start border-b ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
            <div className="flex flex-col gap-4">
              <div className="text-xs text-slate-500 font-semibold">No. Transaksi <span className="text-amber-600 ml-1">{activeTransactionNo || 'New Transaction'}</span></div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-400">#</span>
                <input 
                  type="number" 
                  value={scanQty}
                  onChange={(e) => setScanQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className={`w-12 border rounded px-2 py-1 text-sm text-center outline-none ${isDark ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`} 
                />
                <span className="text-sm font-semibold text-slate-400 ml-4">Barcode :</span>
                <input 
                  ref={searchInputRef}
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className={`w-80 border rounded px-3 py-1.5 text-sm outline-none transition-colors ${isDark ? 'bg-amber-900/20 border-amber-500/50 focus:bg-slate-800 text-slate-200' : 'bg-yellow-50 border-yellow-200 focus:bg-white focus:border-amber-500 text-slate-900'}`} 
                />
              </div>
            </div>
            <div className={`text-[3.5rem] leading-none font-medium tabular-nums tracking-tighter ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {grandTotal.toLocaleString('id-ID')}
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className={`sticky top-0 z-10 ${isDark ? 'bg-[#2d2d2d] text-slate-300' : 'bg-[#e0e0e0] text-slate-700'}`}>
                <tr>
                  <th className={`px-4 py-2 font-semibold border-r ${isDark ? 'border-slate-700' : 'border-slate-300'} w-1/2`}>Barang</th>
                  <th className={`px-4 py-2 font-semibold border-r ${isDark ? 'border-slate-700' : 'border-slate-300'} text-center w-24`}>Stok</th>
                  <th className={`px-4 py-2 font-semibold border-r ${isDark ? 'border-slate-700' : 'border-slate-300'} text-center w-16`}>#</th>
                  <th className={`px-4 py-2 font-semibold border-r ${isDark ? 'border-slate-700' : 'border-slate-300'} text-right w-32`}>Harga @unit</th>
                  <th className={`px-4 py-2 font-semibold border-r ${isDark ? 'border-slate-700' : 'border-slate-300'} text-right w-32`}>Harga Total</th>
                  <th className="px-4 py-2 font-semibold text-center w-12">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {activeCartItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-24 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <div className={`p-4 rounded-full mb-3 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                          <ShoppingCart className="w-8 h-8 opacity-50" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">Belum ada barang di keranjang</p>
                        <p className="text-xs text-slate-400 mt-1">Scan barcode atau gunakan kotak pencarian di atas</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  activeCartItems.map((item, idx) => {
                  const originalIdx = cart.indexOf(item);
                  return (
                    <tr key={idx} className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} ${idx % 2 === 0 ? (isDark ? 'bg-[#1e1e1e]' : 'bg-white') : (isDark ? 'bg-[#1a1a1a]' : 'bg-slate-50')}`}>
                      <td className={`px-4 py-2.5 border-r font-medium ${isDark ? 'border-slate-700 text-sky-400' : 'border-slate-200 text-sky-700'}`}>{item.product.name}</td>
                      <td className={`px-4 py-2.5 border-r text-center font-medium ${isDark ? 'border-slate-700 text-sky-400' : 'border-slate-200 text-sky-700'}`}>{item.product.stock}</td>
                      <td className={`px-4 py-2.5 border-r text-center font-medium ${isDark ? 'border-slate-700 text-sky-400' : 'border-slate-200 text-sky-700'}`}>{item.quantity}</td>
                      <td className={`px-4 py-2.5 border-r text-right font-medium ${isDark ? 'border-slate-700 text-sky-400' : 'border-slate-200 text-sky-700'}`}>{item.selectedPrice.toLocaleString('id-ID')}</td>
                      <td className={`px-4 py-2.5 border-r text-right font-medium ${isDark ? 'border-slate-700 text-sky-400' : 'border-slate-200 text-sky-700'}`}>{(item.selectedPrice * item.quantity).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-2.5 text-center">
                        <button 
                          onClick={() => handleConfirmRemoveItem(item, originalIdx)}
                          className={`cursor-pointer p-1.5 rounded-md hover:bg-rose-500/20 text-rose-500 transition-colors`}
                          title="Hapus item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: RECEIPT */}
        <div className={`w-[320px] flex flex-col p-4 shadow-inner border-l ${isDark ? 'bg-[#2a2a2a] border-slate-900' : 'bg-[#d1d5db] border-slate-300'}`}>
          <div className={`flex-1 flex flex-col shadow-sm border font-mono text-xs ${isDark ? 'bg-[#1a1a1a] border-slate-600 text-slate-300' : 'bg-white border-slate-300 text-slate-800'}`}>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left">
                <thead className={`border-b-2 ${isDark ? 'border-slate-600' : 'border-slate-800'}`}>
                  <tr>
                    <th className="py-2 pl-2 pr-1 w-8 text-center">#</th>
                    <th className="py-2 px-1">Barang</th>
                    <th className="py-2 pl-1 pr-2 text-right">Sub Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCartItems.map((item, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="py-1.5 pl-2 pr-1 text-center">{item.quantity}</td>
                      <td className="py-1.5 px-1 pr-2 leading-tight">{item.product.name}</td>
                      <td className="py-1.5 pl-1 pr-2 text-right">{(item.selectedPrice * item.quantity).toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className={`mt-auto border-t-2 p-2 flex justify-between font-bold ${isDark ? 'border-slate-600' : 'border-slate-800'}`}>
              <span>{activeCartItems.length} Jenis</span>
              <span>Total : {grandTotal.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">

            <div className="flex items-center justify-between gap-2">
              <button 
                onClick={() => {
                  if (lastReceiptData) setIsReceiptOpen(true);
                  else {
                    setAlertTitle('Perhatian');
                    setAlertMessage('Belum ada transaksi sebelumnya untuk dicetak ulang.');
                    setAlertConfirmFn(undefined);
                    setIsAlertOpen(true);
                  }
                }}
                className={`cursor-pointer flex-1 py-3 rounded text-sm font-semibold border flex justify-center items-center gap-2 shadow-sm transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600' : 'bg-[#e5e7eb] hover:bg-[#d1d5db] text-slate-800 border-slate-400'}`}>
                <FileLock className="w-4 h-4 text-amber-500" />
                Reprint Bill
              </button>
              <button 
                onClick={() => setIsPaymentModalOpen(true)}
                disabled={activeCartItems.length === 0}
                className={`cursor-pointer flex-1 py-3 rounded text-sm font-semibold border flex justify-center items-center gap-2 shadow-sm transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600' : 'bg-[#e5e7eb] hover:bg-[#d1d5db] text-slate-800 border-slate-400'} disabled:opacity-50`}
              >
                <Banknote className="w-4 h-4 text-emerald-500" />
                Payment
              </button>
            </div>

            <button 
              onClick={handleClearCart}
              disabled={activeCartItems.length === 0}
              className="mt-2 w-full cursor-pointer bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white py-2 rounded text-sm font-semibold border border-rose-600 flex justify-center items-center gap-2 shadow-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Batal
            </button>
          </div>
        </div>
      </div>

      {/* MODALS */}
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
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        totalAmount={grandTotal}
        onSubmit={handleCheckout}
        isDark={isDark}
      />
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setCart([]); 
          setCashPaid(''); 
          setPaymentMethod('CASH');
          setVoucherCode('');
          setSelectedCustomer(null);
        }}
        cart={lastReceiptData?.cart || []}
        cashierName={currentUser?.name || 'Kasir'}
        cashPaid={lastReceiptData?.cashPaid || 0}
        invoiceNo={lastReceiptData?.invoiceNo || lastInvoiceNo}
        storeInfo={posSettings}
        isDark={isDark}
        isReprint={!!lastReceiptData}
        orderType={lastReceiptData?.orderType || (isGrosirMode ? 'Grosir' : 'Retail')}
        customer={lastReceiptData?.customer}
        paymentMethod={lastReceiptData?.paymentMethod}
        discountAmount={lastReceiptData?.discountAmount}
        isConnected={isConnected}
        onPrintText={printText}
      />
      <AlertDialog
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        title={alertTitle}
        message={alertMessage}
        onConfirm={alertConfirmFn}
        isDark={isDark}
      />
    </div>
  );
}
