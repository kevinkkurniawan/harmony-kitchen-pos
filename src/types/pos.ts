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
  printerTarget?: 'Kitchen' | 'Bar' | 'Pantry';
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

export interface Table {
  id: string;
  name: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
  currentOrderId?: string;
}

export interface Customer {
  id: string;
  customerNo: string;
  name: string;
  phone: string;
  customerType: 'Regular' | 'Vip' | 'Wholesale';
  discountPercent: number;
}

export interface Transaction {
  id: string;
  invoiceNo: string;
  date: string;
  time: string;
  cashierName: string;
  orderType: 'Dine-In' | 'Takeaway' | 'Delivery';
  tableNo?: string;
  serverName?: string;
  customer?: Customer;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  voucherCode?: string;
  taxAmount: number;
  serviceCharge: number;
  total: number;
  paymentMethod: 'Cash' | 'QRIS' | 'DebitCard' | 'CreditCard' | 'Bon';
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
    qris: number;
    card: number;
    bon: number;
  };
  cashInDrawer: number;
  voidCount: number;
  voidTotalAmount: number;
}
