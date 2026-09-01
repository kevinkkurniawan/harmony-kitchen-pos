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
  printerTarget?: 'Cashier' | 'Pantry' | 'LX300';
  image?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedPrice: number;
  priceType: 'retail' | 'grosir1' | 'grosir2' | 'grosir3';
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

export type PaymentMethod = 'CASH' | 'EDC' | 'TRANSFER' | 'QRIS' | 'SHOPEE' | 'TOKOPEDIA';

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
  voucherCode?: string;
  taxAmount: number;
  serviceCharge: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashPaid: number;
  change: number;
  isGrosirMode: boolean;
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
    edc: number;
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
}
