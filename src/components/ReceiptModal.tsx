'use client';

import React from 'react';
import { Printer, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { CartItem, Customer } from '@/types/pos';

interface ReceiptDisplayItem {
  name: string;
  quantity: number;
  selectedPrice: number;
  memo: string;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: Record<string, unknown> | null;
  cart?: CartItem[];
  cashierName?: string;
  cashPaid?: number;
  invoiceNo?: string;
  orderType?: string;
  customer?: Customer | null;
  paymentMethod?: string;
  discountAmount?: number;
  notes?: string;
  isConnected?: boolean;
  onPrintText?: (text: string) => Promise<{ success: boolean; error?: string }> | void;
}

export default function ReceiptModal({
  isOpen,
  onClose,
  transaction,
  cart = [],
  cashierName = 'Kasir',
  cashPaid = 0,
  invoiceNo = 'DRAFT',
  paymentMethod = 'CASH',
  discountAmount = 0,
  isConnected = false,
  onPrintText,
}: ReceiptModalProps) {
  const [isPrinting, setIsPrinting] = React.useState(false);
  const [printError, setPrintError] = React.useState<string | null>(null);
  const [printSuccess, setPrintSuccess] = React.useState(false);
  const [currentDate] = React.useState(() => new Date());

  React.useEffect(() => {
    if (isOpen) {
      setPrintError(null);
      setPrintSuccess(false);
      setIsPrinting(false);
    }
  }, [isOpen]);

  // Pure derivation of transaction date
  const txDate = React.useMemo(() => {
    if (!transaction) return currentDate;
    const raw = (transaction.date || transaction.createdAt) as string | number | Date | undefined;
    return raw ? new Date(raw) : currentDate;
  }, [transaction, currentDate]);

  if (!isOpen) return null;

  // Derive strictly from saved transaction snapshot if available, else from live props
  const displayInvoiceNo = (transaction?.invoiceNo as string) || invoiceNo;
  const displayCashier = (transaction?.cashierName as string) || cashierName || 'Kasir (Tidak diketahui)';
  const displayPaymentMethod = (transaction?.paymentMethod as string) || paymentMethod || 'UNKNOWN';

  // Extract items from saved transaction (supports both .items and .details) or fallback to active cart
  const rawItems = (transaction
    ? (transaction.items || transaction.details || [])
    : cart) as Array<Record<string, unknown>>;

  const validItems: ReceiptDisplayItem[] = (rawItems || [])
    .filter((item) => !item.isVoided)
    .map((item) => {
      const prod = item.product as { name?: string } | undefined;
      return {
        name: (item.name as string) || (item.inventoryName as string) || prod?.name || 'Item',
        quantity: Number(item.quantity ?? item.qty ?? 1),
        selectedPrice: Number(item.selectedPrice ?? item.price ?? 0),
        memo: (item.memo as string) || (item.remarks as string) || '',
      };
    });

  const totalKinds = validItems.length;

  const rawSubtotal = transaction
    ? Number(transaction.subtotal || transaction.totalAmount || 0)
    : validItems.reduce((sum: number, item) => sum + Number(item.selectedPrice) * Number(item.quantity), 0);

  const displayDiscount = transaction
    ? Number(transaction.discount || transaction.discountAmount || 0)
    : discountAmount;

  const taxAmount = Number(transaction?.taxAmount || 0);
  const serviceCharge = Number(transaction?.serviceCharge || 0);

  const grandTotal = transaction
    ? Number(transaction.grandTotal || 0)
    : Math.max(0, rawSubtotal - displayDiscount + taxAmount + serviceCharge);

  const displayCashPaid = transaction ? Number(transaction.cashPaid ?? grandTotal) : cashPaid;
  const displayChange = transaction
    ? Number(transaction.changeAmount ?? Math.max(0, displayCashPaid - grandTotal))
    : Math.max(0, displayCashPaid - grandTotal);

  const dateStr = txDate.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = txDate.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const handlePrint = async () => {
    if (isPrinting) return; // Prevent duplicate concurrent dispatches
    setIsPrinting(true);
    setPrintError(null);
    setPrintSuccess(false);

    try {
      if (isConnected && onPrintText) {
        const ESC = '\x1B';
        const GS = '\x1D';
        const INIT = ESC + '@';
        const BOLD_ON = ESC + 'E' + '\x01';
        const BOLD_OFF = ESC + 'E' + '\x00';
        const CENTER = ESC + 'a' + '\x01';
        const LEFT = ESC + 'a' + '\x00';
        const CUT = GS + 'V' + '\x41' + '\x00';
        const KICK_DRAWER = ESC + 'p' + '\x00' + '\x32' + '\x32';

        let str = INIT + CENTER + BOLD_ON + 'HARMONY KITCHENWARE\n' + BOLD_OFF;
        str += 'Jalan Panglima Sudirman 65\nWA : 0851 7238 4707\n';
        str += '--------------------------------\n' + LEFT;
        str += `No : ${displayInvoiceNo}\n`;
        str += `${dateStr} ${timeStr}\nKsr: ${displayCashier}\n`;
        str += `Metode: ${displayPaymentMethod}\n`;
        str += '--------------------------------\n';

        validItems.forEach((item) => {
          const lineTotal = Math.round(Number(item.selectedPrice) * Number(item.quantity)).toLocaleString('en-US');
          str += `${item.name}\n`;
          const leftPart = `${item.quantity} x ${Math.round(Number(item.selectedPrice)).toLocaleString('en-US')}`;
          const spaces = Math.max(1, 32 - leftPart.length - lineTotal.length);
          str += leftPart + ' '.repeat(spaces) + lineTotal + '\n';
          if (item.memo) {
            str += ` * ${item.memo}\n`;
          }
        });

        str += '--------------------------------\n';
        str += `Total Jenis : ${totalKinds}\n`;

        const totalStr = Math.round(grandTotal).toLocaleString('en-US');
        str += 'Total       : ' + ' '.repeat(Math.max(1, 18 - totalStr.length)) + totalStr + '\n';

        if (displayDiscount > 0) {
          const discStr = Math.round(displayDiscount).toLocaleString('en-US');
          str += 'Diskon      :-' + ' '.repeat(Math.max(1, 18 - discStr.length)) + discStr + '\n';
        }

        if (taxAmount > 0) {
          const taxStr = Math.round(taxAmount).toLocaleString('en-US');
          str += 'Pajak       : ' + ' '.repeat(Math.max(1, 18 - taxStr.length)) + taxStr + '\n';
        }

        const bayarStr = Math.round(displayCashPaid).toLocaleString('en-US');
        str += 'Jumlah Bayar: ' + ' '.repeat(Math.max(1, 18 - bayarStr.length)) + bayarStr + '\n';

        const kembaliStr = Math.round(displayChange).toLocaleString('en-US');
        str += 'Kembali     : ' + ' '.repeat(Math.max(1, 18 - kembaliStr.length)) + kembaliStr + '\n';

        str += '\n' + CENTER;
        str += 'BARANG YANG SUDAH DIBELI\nTIDAK DAPAT DIKEMBALIKAN /\nDITUKARKAN\n\n';
        str += 'TERIMA KASIH ATAS KUNJUNGAN ANDA\nlinktr.ee/harmonykitchenware\n';
        str += '\n\n' + CUT + KICK_DRAWER;

        const result = await onPrintText(str);
        if (result && typeof result === 'object' && result.success === false) {
          setPrintError(result.error || 'Gagal mengirim data ke printer serial.');
        } else {
          setPrintSuccess(true);
        }
      } else {
        window.print();
        setPrintSuccess(true);
      }
    } catch (err: unknown) {
      console.error('Print dispatch error:', err);
      const msg = err instanceof Error ? err.message : 'Gagal melakukan cetak nota.';
      setPrintError(msg);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-lg">Preview Nota Pembelian</h3>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Thermal Receipt View */}
        <div className="p-6 overflow-y-auto font-mono text-sm leading-tight select-none bg-slate-100 flex-1 border-b border-slate-200">
          <div className="bg-white p-5 shadow-lg rounded-none border border-slate-300 max-w-[300px] mx-auto receipt-paper text-[#1e40af] font-mono text-xs leading-snug tracking-tight">
            {/* Header Nota */}
            <div className="text-center pb-2 border-b-2 border-[#1e40af]">
              <h2 className="font-bold text-sm tracking-wide uppercase text-[#1e40af]">
                HARMONY KITCHENWARE
              </h2>
              <p className="text-xs text-[#1e40af] mt-0.5">Jalan Panglima Sudirman 65</p>
              <p className="text-xs text-[#1e40af]">WA : 0851 7238 4707</p>
            </div>

            {/* Sub Header Nota */}
            <div className="pt-2 text-xs space-y-0.5 text-[#1e40af]">
              <div className="flex justify-between font-bold">
                <span>No: {displayInvoiceNo}</span>
                <span>Ksr: {displayCashier}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>{dateStr}</span>
                <span>{timeStr}</span>
              </div>
            </div>

            {/* Items Header */}
            <div className="pt-2 pb-1 text-xs font-bold flex text-[#1e40af]">
              <span className="w-5 text-left shrink-0">#</span>
              <span className="flex-1 text-left">Barang</span>
              <span className="text-right shrink-0">Sub Total</span>
            </div>

            {/* Items List */}
            <div className="space-y-1.5 text-xs text-[#1e40af]">
              {validItems.length === 0 ? (
                <div className="text-center py-4 text-[#1e40af]/60 italic font-sans">
                  (Belum ada item)
                </div>
              ) : (
                validItems.map((item, idx) => (
                  <div key={idx} className="flex flex-col">
                    <div className="flex items-start font-medium text-[#1e40af]">
                      <span className="w-5 text-left shrink-0 font-mono">{item.quantity}</span>
                      <span className="flex-1 pr-1 break-words text-left">
                        {item.name}
                      </span>
                      <span className="whitespace-nowrap font-bold text-right shrink-0">
                        {Math.round(Number(item.selectedPrice) * Number(item.quantity)).toLocaleString('en-US')}
                      </span>
                    </div>
                    {item.quantity > 1 && (
                      <div className="pl-5 text-[#1e40af] text-[11px]">
                        @ {Math.round(Number(item.selectedPrice)).toLocaleString('en-US')}
                      </div>
                    )}
                    {item.memo && (
                      <div className="pl-5 text-[11px] text-[#1e40af] font-sans italic">
                        * Catatan: {item.memo}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Summary Details */}
            <div className="mt-3 pt-2 border-t-2 border-[#1e40af] space-y-1 text-xs text-[#1e40af]">
              <div className="flex justify-between items-center">
                <span>{totalKinds} Jenis</span>
                <div className="flex justify-between w-48">
                  <span className="flex-1 text-right pr-2 font-mono">Total :</span>
                  <span className="font-bold text-right shrink-0 min-w-[70px] font-mono">
                    {Math.round(grandTotal).toLocaleString('en-US')}
                  </span>
                </div>
              </div>

              {displayDiscount > 0 && (
                <div className="flex justify-end">
                  <div className="flex justify-between w-48 text-rose-600 font-bold">
                    <span className="flex-1 text-right pr-2 font-mono">Diskon :</span>
                    <span className="text-right shrink-0 min-w-[70px] font-mono">
                      - {Math.round(displayDiscount).toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
              )}

              {taxAmount > 0 && (
                <div className="flex justify-end">
                  <div className="flex justify-between w-48 text-[#1e40af]">
                    <span className="flex-1 text-right pr-2 font-mono">Pajak :</span>
                    <span className="text-right shrink-0 min-w-[70px] font-mono">
                      {Math.round(taxAmount).toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <div className="flex justify-between w-48">
                  <span className="flex-1 text-right pr-2 font-mono">Jumlah Bayar :</span>
                  <span className="font-bold text-right shrink-0 min-w-[70px] font-mono">
                    {Math.round(displayCashPaid).toLocaleString('en-US')}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="flex justify-between w-48">
                  <span className="flex-1 text-right pr-2 font-mono">Kembali :</span>
                  <span className="font-bold text-right shrink-0 min-w-[70px] font-mono">
                    {Math.round(displayChange).toLocaleString('en-US')}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Nota */}
            <div className="pt-5 text-center text-xs text-[#1e40af] space-y-2 font-mono">
              <p className="font-bold uppercase leading-tight">
                BARANG YANG SUDAH DIBELI
                <br />
                TIDAK DAPAT DIKEMBALIKAN /
                <br />
                DITUKARKAN
              </p>
              <p className="pt-1 font-bold uppercase">
                TERIMA KASIH ATAS KUNJUNGAN ANDA
              </p>
              <p className="text-[11px] font-mono text-[#1e40af]">
                linktr.ee/harmonykitchenware
              </p>
            </div>
          </div>
        </div>

        {/* Actionable Feedback Banners */}
        {printError && (
          <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-sans no-print">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="flex-1">{printError}</span>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="cursor-pointer px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg text-xs transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {printSuccess && !printError && (
          <div className="mx-6 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-xs font-sans no-print">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>Nota berhasil diproses untuk dicetak.</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="p-4 bg-white flex gap-3 justify-end no-print border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={isPrinting}
            className="cursor-pointer px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-sm transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className={`cursor-pointer px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95 ${
              isPrinting
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
            }`}
          >
            {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            {isPrinting ? 'Mencetak...' : 'Cetak Nota Struk'}
          </button>
        </div>
      </div>
    </div>
  );
}
