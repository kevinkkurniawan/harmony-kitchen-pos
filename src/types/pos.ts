export interface Product {
  id: string;
  name: string;
  barcode: string;
  priceRetail: number;
  stock: number;
  priceGrosir1: number;
  priceGrosir2: number;
  priceGrosir3: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedPrice: number;
  priceType: 'retail' | 'grosir1' | 'grosir2' | 'grosir3';
}

export interface Transaction {
  id: string;
  invoiceNo: string;
  date: string;
  time: string;
  cashierName: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  cashPaid: number;
  change: number;
  isGrosirMode: boolean;
}
