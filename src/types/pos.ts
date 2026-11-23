import type { PromoRule } from '@/lib/wholesale-rules';

export interface Product {
  id: string;
  name: string;
  barcode: string;
  category: string;
  uom: string;
  priceRetail: number;
  stock: number;
  priceGrosir1: number;
  priceGrosir2: number;
  priceGrosir3: number;
  /** Qty bands of the item's K category (m_promo), null when it has none */
  promoRules?: PromoRule[] | null;
  printerTarget?: 'Cashier' | 'Pantry' | 'LX300';
  image?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedPrice: number;
  priceType: 'retail' | 'grosir1' | 'grosir2' | 'grosir3' | 'override_grosir1';
  /** Manual potongan per pcs (Rp), unlocked by the PIN */
  discount?: number;
  memo?: string;
  isVoided?: boolean;
  voidReason?: string;
}

export interface Customer {
  id: string;
  customerNo: string;
  name: string;
  phone: string;
  customerType: 'Regular' | 'Vip' | 'Wholesale';
  discountPercent: number;
}

export type PaymentMethod = 'CASH' | 'EDC BCA' | 'EDC MANDIRI' | 'TRANSFER' | 'QRIS' | 'SHOPEE' | 'TOKOPEDIA';

export interface Transaction {
  id: string;
  invoiceNo: string;
  date: string;
  time: string;
  cashierName: string;
  mode: 'Retail' | 'Grosir';
  customer?: Customer;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  manualDiscountMode?: 'AMOUNT' | 'PERCENT';
  manualDiscountValue?: number;
  manualDiscountAmount?: number;
  manualDiscountReason?: string;
  voucherCode?: string;
  taxAmount: number;
  serviceCharge: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashPaid: number;
  change: number;
  isGrosirMode: boolean;
  isOverrideGrosir?: boolean;
  notes?: string;
}

export interface ShiftSummary {
  cashierName: string;
  startTime: string;
  endTime: string;
  totalTransactions: number;
  grossSales: number;
  totalDiscount: number;
  netSales: number;
  taxCollected: number;
  serviceCollected: number;
  paymentBreakdown: {
    cash: number;
    edcBca: number;
    edcMandiri: number;
    transfer: number;
    qris: number;
    shopee: number;
    tokopedia: number;
  };
  expenses: number;
  cashToDeposit: number;
  cashInDrawer: number;
  voidCount: number;
  voidTotalAmount: number;
  /** The day's notes, for the per-payment list (old Rekap Penjualan Harian) */
  notes?: { no: string; method: string; total: number }[];
}
