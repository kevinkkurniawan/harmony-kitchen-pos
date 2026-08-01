'use client';

import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { Product, CartItem } from '@/types/pos';
import ReceiptModal from '@/components/ReceiptModal';

// Helper component to highlight search terms in product names (matches screenshot yellow background)
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
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Theme Mode State (Light vs Dark)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Mode States
  const [isGrosirMode, setIsGrosirMode] = useState(false);

  // Cart & Transaction States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cashPaid, setCashPaid] = useState<number | ''>('');
  const [cashierName] = useState('Lia');
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Fetch Products
  const fetchProducts = async (query = '', showRefreshAnimation = false) => {
    if (showRefreshAnimation) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(query)}`);
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
  };

  useEffect(() => {
    fetchProducts(searchQuery);
  }, [searchQuery]);

  // Keyboard Shortcuts (F2 for Search, F4 for Grosir, F9 for Receipt)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleToggleGrosir();
      } else if (e.key === 'F9') {
        e.preventDefault();
        setIsReceiptOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGrosirMode, cart]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(searchQuery);
  };

  // Switch Grosir Request Mode
  const handleToggleGrosir = () => {
    const nextGrosirState = !isGrosirMode;
    setIsGrosirMode(nextGrosirState);

    // Recalculate price in cart automatically
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

  // Add product to cart
  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((i) => i.product.id === product.id);
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
  };

  // Update Cart Quantity
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

  const removeFromCart = (index: number) => {
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
  };

  // Calculations
  const grandTotal = cart.reduce((sum, item) => sum + item.selectedPrice * item.quantity, 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const numPaid = typeof cashPaid === 'number' ? cashPaid : 0;
  const changeAmount = Math.max(0, numPaid - grandTotal);

  const setQuickPaid = (amount: number) => {
    setCashPaid(amount);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setIsReceiptOpen(true);
  };

  const categories = ['Semua', 'Coffee Grinder', 'Mug Enamel', 'Teapot', 'Peralatan Masak'];

  const isDark = theme === 'dark';

  return (
    <div
      className={`h-screen w-screen flex flex-col font-sans overflow-hidden select-none transition-colors duration-200 ${
        isDark ? 'bg-[#070b14] text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* 🚀 TOP NAVIGATION TOOLBAR */}
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25 ring-1 ring-white/20">
              <Store className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                Harmony Kitchen POS
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-bold border border-emerald-500/30">
                  Pro POS
                </span>
              </h1>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Panglima Sudirman 65 • Kasir: <span className="text-emerald-500 font-semibold">{cashierName}</span>
              </p>
            </div>
          </div>

          <div className={`h-6 w-px hidden md:block ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

          {/* Mode Switch Status */}
          <div className="flex items-center gap-3">
            <div
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                isGrosirMode
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              {isGrosirMode ? 'Mode Grosir Active' : 'Mode Retail Active'}
            </div>

            {/* Preview Struk Button */}
            <button
              onClick={() => setIsReceiptOpen(true)}
              className={`px-3.5 py-1.5 rounded-xl active:scale-95 border transition-all flex items-center gap-2 text-xs font-semibold group ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title="Preview Struk Nota (F9)"
            >
              <Receipt className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span>Preview Nota</span>
              <kbd
                className={`hidden lg:inline px-1.5 py-0.5 text-[10px] rounded border ${
                  isDark
                    ? 'bg-slate-950 text-slate-400 border-slate-800'
                    : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                F9
              </kbd>
            </button>
          </div>
        </div>

        {/* Right Tools: Theme Switch, Refresh Data & Grosir Toggle */}
        <div className="flex items-center gap-4">
          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-all flex items-center gap-2 text-xs font-semibold active:scale-95 ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title="Ganti Mode Tampilan Light / Dark"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            <span className="hidden sm:inline">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {/* Refresh Data Button */}
          <button
            onClick={() => fetchProducts(searchQuery, true)}
            disabled={isRefreshing}
            className={`px-3.5 py-1.5 rounded-xl active:scale-95 text-xs font-semibold flex items-center gap-2 border transition-all disabled:opacity-50 ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title="Update Data Terbaru dari Database Master"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>

          {/* Switch Grosir Request */}
          <div
            className={`flex items-center gap-3 py-1.5 px-3.5 rounded-2xl border ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex flex-col text-right leading-none">
              <span className={`text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                Grosir Request
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">Otomatis Tier 1,2,3</span>
            </div>
            <button
              type="button"
              onClick={handleToggleGrosir}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isGrosirMode ? 'bg-amber-500' : isDark ? 'bg-slate-800' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isGrosirMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* 📦 MAIN CONTENT DASHBOARD */}
      <div className="flex-1 flex overflow-hidden">
        {/* 🔍 LEFT PANEL: CATALOG & LIVE TABLE */}
        <div className={`flex-1 flex flex-col min-w-0 ${isDark ? 'bg-[#070b14]' : 'bg-slate-50'}`}>
          {/* Top Search & Filter Bar */}
          <div
            className={`p-4 border-b flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
              isDark ? 'border-slate-800/80 bg-slate-900/40' : 'border-slate-200 bg-white'
            }`}
          >
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari Nama Barang / Scan Barcode (Tekan F2)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full border rounded-xl pl-10 pr-20 py-2.5 text-sm font-medium transition-all ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:border-emerald-500/60'
                    : 'bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500'
                }`}
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                Cari
              </button>
            </form>

            {/* Quick Category Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40'
                      : isDark
                      ? 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800'
                      : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 shadow-xs'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Data Table */}
          <div className="flex-1 overflow-auto p-4">
            <div
              className={`rounded-2xl border overflow-hidden shadow-xl ${
                isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'
              }`}
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr
                    className={`border-b uppercase font-semibold tracking-wider ${
                      isDark
                        ? 'bg-slate-900/90 border-slate-800 text-slate-400'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    <th className="py-3.5 px-4">Nama Barang</th>
                    <th className="py-3.5 px-4">Barcode</th>
                    <th className="py-3.5 px-4 text-right">Harga Retail</th>
                    <th className="py-3.5 px-4 text-center">Stok</th>
                    <th className="py-3.5 px-4 text-right text-amber-500">Grosir 1</th>
                    <th className="py-3.5 px-4 text-right text-amber-500">Grosir 2</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y font-medium ${
                    isDark ? 'divide-slate-800/60' : 'divide-slate-200'
                  }`}
                >
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-20 text-slate-500">
                        <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-emerald-500" />
                        Sedang menyinkronkan katalog barang...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-20 text-slate-500">
                        Barang tidak ditemukan.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => {
                      const isOutOfStock = product.stock <= 0;
                      return (
                        <tr
                          key={product.id}
                          className={`transition-colors ${
                            isOutOfStock
                              ? isDark
                                ? 'bg-rose-950/20 text-rose-300'
                                : 'bg-rose-50 text-rose-600'
                              : isDark
                              ? 'hover:bg-slate-800/50 text-slate-200'
                              : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          {/* Highlight search keyword */}
                          <td className="py-3.5 px-4 font-semibold">
                            <HighlightText text={product.name} query={searchQuery} isDark={isDark} />
                          </td>
                          <td
                            className={`py-3.5 px-4 font-mono text-[11px] ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            {product.barcode}
                          </td>
                          <td
                            className={`py-3.5 px-4 text-right font-extrabold ${
                              isDark ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            Rp {product.priceRetail.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] inline-block min-w-[28px] ${
                                isOutOfStock
                                  ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                                  : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              }`}
                            >
                              {product.stock}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-amber-500 font-mono font-medium">
                            Rp {product.priceGrosir1.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3.5 px-4 text-right text-amber-500 font-mono font-medium">
                            Rp {product.priceGrosir2.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => addToCart(product)}
                              disabled={isOutOfStock}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm flex items-center gap-1 mx-auto"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Pilih
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
        </div>

        {/* 🛒 RIGHT PANEL: SHOPPING CART TERMINAL */}
        <div
          className={`w-[440px] flex flex-col border-l shadow-2xl shrink-0 transition-colors ${
            isDark
              ? 'bg-slate-900/95 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          {/* Cart Header */}
          <div
            className={`p-4 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-500" />
              <h2 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Keranjang Kasir
              </h2>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 font-extrabold border border-emerald-500/30">
              {totalItemsCount} Item
            </span>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 space-y-3">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${
                    isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <ShoppingCart className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <p className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Keranjang masih kosong
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Pilih barang pada tabel katalog di sebelah kiri.
                  </p>
                </div>
              </div>
            ) : (
              cart.map((item, index) => (
                <div
                  key={index}
                  className={`border p-3.5 rounded-xl flex flex-col gap-2 transition-all ${
                    isDark
                      ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span
                      className={`font-semibold text-xs flex-1 pr-2 leading-snug ${
                        isDark ? 'text-slate-100' : 'text-slate-800'
                      }`}
                    >
                      {item.product.name}
                    </span>
                    <button
                      onClick={() => removeFromCart(index)}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-emerald-500">
                        Rp {(item.selectedPrice * item.quantity).toLocaleString('id-ID')}
                      </span>
                      {item.priceType !== 'retail' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-600 font-bold rounded uppercase">
                          {item.priceType}
                        </span>
                      )}
                    </div>

                    {/* Quantity Controller */}
                    <div
                      className={`flex items-center gap-2 p-1 rounded-lg border ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <button
                        onClick={() => updateQty(index, -1)}
                        className={`w-6 h-6 rounded flex items-center justify-center font-bold active:scale-95 transition-transform ${
                          isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className={`w-6 text-center font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(index, 1)}
                        className={`w-6 h-6 rounded flex items-center justify-center font-bold active:scale-95 transition-transform ${
                          isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 💵 PAYMENT SUMMARY SECTION */}
          <div
            className={`p-5 border-t space-y-4 ${
              isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="space-y-2 text-sm">
              <div className={`flex justify-between text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span>Subtotal ({totalItemsCount} item)</span>
                <span>Rp {grandTotal.toLocaleString('id-ID')}</span>
              </div>
              <div className={`flex justify-between items-baseline pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Total Tagihan</span>
                <span className="font-extrabold text-2xl text-emerald-500 font-mono">
                  Rp {grandTotal.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Quick Cash Nominal Buttons */}
            <div className="space-y-1.5">
              <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Uang Cepat:</span>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => setQuickPaid(grandTotal)}
                  disabled={grandTotal === 0}
                  className={`py-1 px-2 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40 ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  Uang Pas
                </button>
                <button
                  onClick={() => setQuickPaid(50000)}
                  className={`py-1 px-2 rounded-lg text-[11px] font-semibold transition-colors ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  50.000
                </button>
                <button
                  onClick={() => setQuickPaid(100000)}
                  className={`py-1 px-2 rounded-lg text-[11px] font-semibold transition-colors ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  100.000
                </button>
                <button
                  onClick={() => setQuickPaid(200000)}
                  className={`py-1 px-2 rounded-lg text-[11px] font-semibold transition-colors ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  200.000
                </button>
              </div>
            </div>

            {/* Input Cash Paid */}
            <div className="space-y-1.5">
              <label className={`text-xs font-semibold flex items-center justify-between ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                  Jumlah Bayar (Rp)
                </span>
                {numPaid >= grandTotal && grandTotal > 0 && (
                  <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Cukup
                  </span>
                )}
              </label>
              <input
                type="number"
                placeholder="0"
                value={cashPaid}
                onChange={(e) => setCashPaid(e.target.value ? Number(e.target.value) : '')}
                className={`w-full border rounded-xl px-3.5 py-2.5 text-lg font-bold font-mono transition-all ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-emerald-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500'
                }`}
              />
            </div>

            {/* Kembalian Info Display */}
            <div
              className={`flex justify-between items-center text-xs p-3 rounded-xl border ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Kembali:</span>
              <span className="font-extrabold text-amber-500 font-mono text-base">
                Rp {changeAmount.toLocaleString('id-ID')}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setIsReceiptOpen(true)}
                disabled={cart.length === 0}
                className={`py-3 px-3 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 active:scale-95 ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                <Receipt className="w-4 h-4 text-emerald-500" />
                Preview Nota
              </button>
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || numPaid < grandTotal}
                className="py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                <CheckCircle2 className="w-4 h-4" />
                Bayar & Cetak
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🧾 RECEIPT MODAL PREVIEW */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        cart={cart}
        cashierName={cashierName}
        cashPaid={numPaid}
        invoiceNo="INV-001"
      />
    </div>
  );
}
